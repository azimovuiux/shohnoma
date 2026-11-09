<?php
declare(strict_types=1);

/*
 * Sayt statistikasi (o‘zimizniki, tashqi xizmatlarsiz):
 *  POST /track       — sahifa ochildi (brauzer har sahifa o‘tishida yuboradi)
 *  POST /track/ping  — sahifa ochiq turibdi (har 30 soniyada) → «hozir onlayn»
 *  GET  /admin/stats — admin uchun hisobot
 * IP manzil saqlanmaydi — faqat davlatni aniqlash uchun ishlatiladi va xesh ko‘rinishida keshlanadi.
 */
const VISIT_GAP = 1800;   // 30 daqiqa harakatsizlikdan keyin — yangi tashrif
const ONLINE_WINDOW = 90; // so‘nggi 90 soniyada signal bergan — onlayn

function stat_is_bot(string $ua): bool
{
    return $ua === '' || (bool)preg_match('/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|vkshare|headless|lighthouse|pingdom|curl|wget|python|httpclient|monitor/i', $ua);
}

function stat_device(string $ua): array
{
    $device = preg_match('/ipad|tablet|kindle|silk|(android(?!.*mobile))/i', $ua) ? 'tablet' : (preg_match('/mobi|iphone|ipod|android|opera mini|iemobile/i', $ua) ? 'mobile' : 'desktop');
    $browser = match (true) {
        (bool)preg_match('/YaBrowser/i', $ua) => 'Yandex Browser',
        (bool)preg_match('/Telegram/i', $ua) => 'Telegram',
        (bool)preg_match('/Instagram/i', $ua) => 'Instagram',
        (bool)preg_match('/FBAN|FBAV/i', $ua) => 'Facebook',
        (bool)preg_match('/OPR\/|Opera/i', $ua) => 'Opera',
        (bool)preg_match('/Edg\//i', $ua) => 'Edge',
        (bool)preg_match('/SamsungBrowser/i', $ua) => 'Samsung Internet',
        (bool)preg_match('/Firefox|FxiOS/i', $ua) => 'Firefox',
        (bool)preg_match('/Chrome|CriOS/i', $ua) => 'Chrome',
        (bool)preg_match('/Safari/i', $ua) => 'Safari',
        default => 'Boshqa',
    };
    $os = match (true) {
        (bool)preg_match('/iPhone|iPad|iPod/i', $ua) => 'iOS',
        (bool)preg_match('/Android/i', $ua) => 'Android',
        (bool)preg_match('/Windows/i', $ua) => 'Windows',
        (bool)preg_match('/Mac OS X|Macintosh/i', $ua) => 'macOS',
        (bool)preg_match('/Linux/i', $ua) => 'Linux',
        default => 'Boshqa',
    };
    return [$device, $browser, $os];
}

/** [kanal, manba nomi] — kanal: direct | search | social | referral | campaign | ads */
function stat_source(string $refHost, string $utmSource, string $utmMedium): array
{
    $known = [
        '/(^|\.)google\./' => ['search', 'Google'],
        '/(^|\.)(yandex\.|ya\.ru$)/' => ['search', 'Yandex'],
        '/(^|\.)bing\.com$/' => ['search', 'Bing'],
        '/(^|\.)duckduckgo\.com$/' => ['search', 'DuckDuckGo'],
        '/(^|\.)(mail\.ru|go\.mail\.ru)$/' => ['search', 'Mail.ru'],
        '/(^|\.)instagram\.com$|^ig$|^insta(gram)?$/' => ['social', 'Instagram'],
        '/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^fb$|^facebook$/' => ['social', 'Facebook'],
        '/(^|\.)(t\.me|telegram\.org|telegram\.me)$|^tg$|^telegram$/' => ['social', 'Telegram'],
        '/(^|\.)tiktok\.com$|^tiktok$/' => ['social', 'TikTok'],
        '/(^|\.)(youtube\.com|youtu\.be)$|^youtube$|^yt$/' => ['social', 'YouTube'],
        '/(^|\.)(x\.com|twitter\.com|t\.co)$|^twitter$|^x$/' => ['social', 'X (Twitter)'],
        '/(^|\.)vk\.com$|^vk$/' => ['social', 'VK'],
        '/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$|^wa$/' => ['social', 'WhatsApp'],
        '/(^|\.)linkedin\.com$|^linkedin$/' => ['social', 'LinkedIn'],
        '/(^|\.)pinterest\./' => ['social', 'Pinterest'],
        '/(^|\.)threads\.net$|^threads$/' => ['social', 'Threads'],
    ];
    $u = strtolower(trim($utmSource));
    if ($u !== '') {
        $paid = (bool)preg_match('/cpc|ppc|paid|ads?$|banner|target/i', $utmMedium);
        foreach ($known as $re => [$ch, $name]) if (preg_match($re, $u)) return [$paid ? 'ads' : $ch, $name];
        return [$paid ? 'ads' : 'campaign', mb_substr($utmSource, 0, 60)];
    }
    if ($refHost === '') return ['direct', 'To‘g‘ridan-to‘g‘ri'];
    foreach ($known as $re => [$ch, $name]) if (preg_match($re, $refHost)) return [$ch, $name];
    return ['referral', $refHost];
}

/** Davlat: hosting sarlavhasi → kesh → api.country.is → brauzer vaqt mintaqasi */
function stat_country(string $ip, string $ipHash, string $tz): ?string
{
    foreach (['HTTP_CF_IPCOUNTRY', 'GEOIP_COUNTRY_CODE', 'HTTP_X_COUNTRY_CODE', 'HTTP_X_GEO_COUNTRY'] as $h) {
        $c = strtoupper((string)($_SERVER[$h] ?? ''));
        if (preg_match('/^[A-Z]{2}$/', $c) && $c !== 'XX') return $c;
    }
    $row = one('SELECT country FROM geo_cache WHERE ip_hash = ? AND created_at > ?', [$ipHash, gmdate('Y-m-d H:i:s', time() - 30 * 86400)]);
    if ($row) return $row['country'] ?: stat_tz_country($tz);
    $c = null;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        $ch = curl_init('https://api.country.is/' . rawurlencode($ip));
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 2, CURLOPT_CONNECTTIMEOUT => 2]);
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $d = $code === 200 && is_string($res) ? json_decode($res, true) : null;
        if (is_array($d) && preg_match('/^[A-Z]{2}$/', (string)($d['country'] ?? ''))) $c = $d['country'];
        q('REPLACE INTO geo_cache (ip_hash, country, created_at) VALUES (?, ?, ?)', [$ipHash, $c, now_utc()]);
    }
    return $c ?? stat_tz_country($tz);
}

function stat_tz_country(string $tz): ?string
{
    $map = [
        'Asia/Tashkent' => 'UZ', 'Asia/Samarkand' => 'UZ', 'Europe/Moscow' => 'RU', 'Europe/Samara' => 'RU', 'Asia/Yekaterinburg' => 'RU',
        'Asia/Novosibirsk' => 'RU', 'Asia/Almaty' => 'KZ', 'Asia/Qostanay' => 'KZ', 'Asia/Aqtobe' => 'KZ', 'Asia/Bishkek' => 'KG',
        'Asia/Dushanbe' => 'TJ', 'Asia/Ashgabat' => 'TM', 'Europe/Istanbul' => 'TR', 'Asia/Dubai' => 'AE', 'Asia/Seoul' => 'KR',
        'Europe/Berlin' => 'DE', 'Europe/London' => 'GB', 'Europe/Warsaw' => 'PL', 'Europe/Kiev' => 'UA', 'Europe/Kyiv' => 'UA',
        'America/New_York' => 'US', 'America/Chicago' => 'US', 'America/Los_Angeles' => 'US', 'Asia/Baku' => 'AZ', 'Asia/Tbilisi' => 'GE',
    ];
    return $map[$tz] ?? null;
}

function stat_path(string $p): string
{
    $p = (string)parse_url($p, PHP_URL_PATH);
    $p = '/' . trim(preg_replace('#/+#', '/', $p), '/');
    if ($p !== '/') $p .= '/';
    return mb_substr($p, 0, 255);
}

/** Tashrif qidirish (30 daqiqa ichidagisi) */
function stat_active_visit(string $vid): ?array
{
    return one('SELECT * FROM visits WHERE visitor_id = ? AND last_seen > ? ORDER BY last_seen DESC LIMIT 1', [$vid, gmdate('Y-m-d H:i:s', time() - VISIT_GAP)]);
}

route('POST', '/track', function () {
    $b = body();
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $vid = (string)($b['vid'] ?? '');
    $path = stat_path((string)($b['path'] ?? '/'));
    if (stat_is_bot($ua) || !preg_match('/^[a-z0-9]{8,40}$/', $vid) || str_starts_with($path, '/admin/')) json_out(['ok' => true]);
    if (rate_limited('trk:' . client_ip(), 240, 600)) json_out(['ok' => true]);

    $now = now_utc();
    $v = stat_active_visit($vid);
    if ($v) {
        q('UPDATE visits SET last_seen = ?, pages = pages + 1, current_path = ? WHERE id = ?', [$now, $path, $v['id']]);
        q('INSERT INTO pageviews (visit_id, path, created_at) VALUES (?, ?, ?)', [$v['id'], $path, $now]);
        json_out(['ok' => true]);
    }

    $ref = mb_substr(trim((string)($b['ref'] ?? '')), 0, 500);
    $refHost = strtolower((string)(parse_url($ref, PHP_URL_HOST) ?? ''));
    $refHost = preg_replace('/^(www\.|m\.|l\.|lm\.)/', '', $refHost) ?? '';
    $siteHost = preg_replace('/^www\./', '', strtolower((string)parse_url(site_url(), PHP_URL_HOST)));
    if ($refHost === $siteHost || $refHost === strtolower((string)($_SERVER['HTTP_HOST'] ?? ''))) { $refHost = ''; $ref = ''; }
    $utm = is_array($b['utm'] ?? null) ? $b['utm'] : [];
    $us = mb_substr(trim((string)($utm['source'] ?? '')), 0, 100);
    $um = mb_substr(trim((string)($utm['medium'] ?? '')), 0, 100);
    $uc = mb_substr(trim((string)($utm['campaign'] ?? '')), 0, 150);
    [$channel, $source] = stat_source($refHost, $us, $um);
    [$device, $browser, $os] = stat_device($ua);
    $ip = client_ip();
    $ipHash = hash('sha256', 'ip:' . env('SESSION_SECRET', 'dev') . ':' . $ip);
    $tz = mb_substr((string)($b['tz'] ?? ''), 0, 60);
    $country = stat_country($ip, $ipHash, $tz);
    $isNew = scalar('SELECT 1 FROM visits WHERE visitor_id = ? LIMIT 1', [$vid]) ? 0 : 1;
    $id = new_id();
    q(
        'INSERT INTO visits (id, visitor_id, is_new, started_at, last_seen, pages, entry_path, current_path, referrer, ref_host, source, channel, utm_source, utm_medium, utm_campaign, country, device, browser, os, lang, ip_hash)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$id, $vid, $isNew, $now, $now, $path, $path, $ref ?: null, $refHost ?: null, $source, $channel, $us ?: null, $um ?: null, $uc ?: null, $country, $device, $browser, $os, mb_substr((string)($b['lang'] ?? ''), 0, 16) ?: null, $ipHash]
    );
    q('INSERT INTO pageviews (visit_id, path, created_at) VALUES (?, ?, ?)', [$id, $path, $now]);
    json_out(['ok' => true]);
});

route('POST', '/track/ping', function () {
    $b = body();
    $vid = (string)($b['vid'] ?? '');
    if (!preg_match('/^[a-z0-9]{8,40}$/', $vid)) json_out(['ok' => true]);
    $v = stat_active_visit($vid);
    if ($v) q('UPDATE visits SET last_seen = ?, current_path = ? WHERE id = ?', [now_utc(), stat_path((string)($b['path'] ?? $v['current_path'])), $v['id']]);
    json_out(['ok' => true, 'active' => (bool)$v]);
});

/** Sayt sahifasimi yoki mehmon taklifnomasi (/<slug>/) */
function stat_page_kind(string $path): string
{
    if (preg_match('#^/(shablonlar|namuna|buyurtma|kabinet|kirish|maxsus-dizayn|maxfiylik|shartlar)(/|$)#', $path) || $path === '/') return 'site';
    return preg_match('#^/[a-z0-9][a-z0-9-]{1,79}/$#', $path) ? 'invite' : 'site';
}

route('GET', '/admin/stats', function () {
    require_admin();
    $range = (string)($_GET['range'] ?? '7d');
    $days = ['today' => 1, '7d' => 7, '30d' => 30, '90d' => 90][$range] ?? 7;
    $off = 5 * 3600; // Toshkent (UTC+5)
    $todayStart = strtotime(gmdate('Y-m-d', time() + $off) . ' 00:00:00 UTC') - $off;
    $start = $todayStart - ($days - 1) * 86400;
    $prevStart = $start - $days * 86400;
    $since = gmdate('Y-m-d H:i:s', $start);
    $prevSince = gmdate('Y-m-d H:i:s', $prevStart);
    $p = [$since];

    $tot = one('SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS visitors, SUM(is_new) AS new_visits, COALESCE(SUM(pages),0) AS pages,
        COALESCE(AVG(LEAST(TIMESTAMPDIFF(SECOND, started_at, last_seen), 3600)),0) AS avg_sec, COALESCE(AVG(pages = 1),0) AS bounce
        FROM visits WHERE started_at >= ?', $p);
    $prev = one('SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(pages),0) AS pages FROM visits WHERE started_at >= ? AND started_at < ?', [$prevSince, $since]);

    // Kunlik (bugun — soatlik) qator
    $bucket = $days === 1 ? "DATE_FORMAT(DATE_ADD(started_at, INTERVAL 5 HOUR), '%H')" : "DATE_FORMAT(DATE_ADD(started_at, INTERVAL 5 HOUR), '%Y-%m-%d')";
    $rows = all("SELECT $bucket AS b, COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS visitors, SUM(pages) AS pages FROM visits WHERE started_at >= ? GROUP BY b", $p);
    $byB = [];
    foreach ($rows as $r) $byB[$r['b']] = $r;
    $series = [];
    if ($days === 1) {
        for ($h = 0; $h < 24; $h++) {
            $k = sprintf('%02d', $h);
            $series[] = ['label' => "$k:00", 'visitors' => (int)($byB[$k]['visitors'] ?? 0), 'visits' => (int)($byB[$k]['visits'] ?? 0), 'pages' => (int)($byB[$k]['pages'] ?? 0)];
        }
    } else {
        for ($i = 0; $i < $days; $i++) {
            $k = gmdate('Y-m-d', $start + $off + $i * 86400);
            $series[] = ['label' => $k, 'visitors' => (int)($byB[$k]['visitors'] ?? 0), 'visits' => (int)($byB[$k]['visits'] ?? 0), 'pages' => (int)($byB[$k]['pages'] ?? 0)];
        }
    }

    $group = function (string $col, int $limit = 12) use ($p): array {
        return array_map(fn($r) => ['name' => (string)($r['k'] ?? ''), 'visits' => (int)$r['visits'], 'visitors' => (int)$r['visitors']],
            all("SELECT $col AS k, COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS visitors FROM visits WHERE started_at >= ? GROUP BY k ORDER BY visits DESC LIMIT $limit", $p));
    };
    $pages = array_map(fn($r) => ['name' => $r['path'], 'views' => (int)$r['views'], 'kind' => stat_page_kind($r['path'])],
        all('SELECT path, COUNT(*) AS views FROM pageviews WHERE created_at >= ? GROUP BY path ORDER BY views DESC LIMIT 15', $p));
    $kinds = ['site' => 0, 'invite' => 0];
    foreach (all('SELECT path, COUNT(*) AS views FROM pageviews WHERE created_at >= ? GROUP BY path', $p) as $r) $kinds[stat_page_kind($r['path'])] += (int)$r['views'];

    // Hozir onlayn
    $onlineSince = gmdate('Y-m-d H:i:s', time() - ONLINE_WINDOW);
    $online = all('SELECT current_path, source, country, device, started_at, pages FROM visits WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 50', [$onlineSince]);

    json_out([
        'ok' => true,
        'range' => $range,
        'online' => [
            'count' => (int)scalar('SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE last_seen >= ?', [$onlineSince]),
            'list' => array_map(fn($r) => ['path' => $r['current_path'], 'source' => $r['source'], 'country' => $r['country'], 'device' => $r['device'], 'since' => $r['started_at'], 'pages' => (int)$r['pages']], $online),
        ],
        'totals' => [
            'visitors' => (int)$tot['visitors'], 'visits' => (int)$tot['visits'], 'pageviews' => (int)$tot['pages'], 'newVisits' => (int)$tot['new_visits'],
            'avgSec' => (int)round((float)$tot['avg_sec']), 'bounce' => round((float)$tot['bounce'] * 100), 'pagesPerVisit' => $tot['visits'] ? round($tot['pages'] / $tot['visits'], 1) : 0,
        ],
        'prev' => ['visitors' => (int)$prev['visitors'], 'visits' => (int)$prev['visits'], 'pageviews' => (int)$prev['pages']],
        'series' => $series,
        'channels' => $group('channel', 8),
        'sources' => $group('source'),
        'referrers' => array_values(array_filter($group('ref_host', 13), fn($r) => $r['name'] !== '')),
        'campaigns' => array_values(array_filter($group('utm_campaign', 13), fn($r) => $r['name'] !== '')),
        'countries' => $group('country', 15),
        'devices' => $group('device', 5),
        'browsers' => $group('browser', 8),
        'os' => $group('os', 8),
        'entries' => $group('entry_path', 10),
        'pages' => $pages,
        'kinds' => $kinds,
    ]);
});
