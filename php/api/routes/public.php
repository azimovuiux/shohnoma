<?php
declare(strict_types=1);

const RSVP_LABEL = ['coming' => 'Boraman', 'maybe' => 'Hali aniq emas', 'not_coming' => 'Kela olmayman'];

/** Ommaviy taklifnoma: faqat paid/active/archived */
function public_invitation(string $slug): ?array
{
    $i = one('SELECT * FROM invitations WHERE slug = ?', [$slug]);
    if (!$i) return null;
    $o = one('SELECT * FROM orders WHERE id = ?', [$i['order_id']]);
    if (!$o || !(is_paid_status($o['status']) || $o['status'] === 'archived')) return null;
    $owner = $o['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$o['user_id']]) : null;
    return ['invitation' => $i, 'order' => $o, 'owner' => $owner];
}

function rsvp_input(): array
{
    $b = body();
    $name = trim((string)($b['name'] ?? ''));
    if ($name === '') fail('Ismingizni kiriting', 422);
    if (mb_strlen($name) > 120) fail('Ism juda uzun', 422);
    $status = $b['status'] ?? '';
    if (!in_array($status, ['coming', 'maybe', 'not_coming'], true)) fail('Javobni tanlang', 422);
    // «Kela olmayman» — kishi soni e’tiborsiz (shablonlar 0 yuboradi); shablon stepperlari 20 gacha ruxsat beradi
    $count = $status === 'not_coming' ? 1 : ($b['count'] ?? 1);
    if (!is_int($count) && !(is_string($count) && ctype_digit($count))) fail('Kishi soni noto‘g‘ri', 422);
    $count = (int)$count;
    if ($count < 1 || $count > 20) fail('Kishi soni 1 dan 20 gacha bo‘lsin', 422);
    $wish = trim((string)($b['wish'] ?? ''));
    if (mb_strlen($wish) > 1000) fail('Tilak juda uzun', 422);
    return ['name' => $name, 'status' => $status, 'count' => $status === 'not_coming' ? 1 : $count, 'wish' => $wish ?: null, 'website' => (string)($b['website'] ?? '')];
}

route('GET', '/i/:slug', function ($p) {
    $r = public_invitation($p['slug']) ?? fail('Taklifnoma topilmadi', 404);
    if ($r['order']['status'] !== 'archived') q('UPDATE invitations SET views = views + 1 WHERE id = ?', [$r['invitation']['id']]);
    $inv = invitation_out($r['invitation']);
    unset($inv['contactPhone'], $inv['views'], $inv['orderId']);
    $out = ['ok' => true, 'invitation' => $inv, 'templateSlug' => $r['order']['template_slug'], 'archived' => $r['order']['status'] === 'archived'];
    // Maxsus mehmon havolasi (?g=token): ism va (bo‘lsa) avvalgi javobini tahrirlash tokeni
    if (isset($_GET['g']) && ($g = sg_find($r['invitation']['id'], $_GET['g']))) {
        if (sg_should_count($r['order'])) sg_mark_open($g);
        $prev = scalar('SELECT edit_token FROM guest_responses WHERE special_guest_id = ? ORDER BY created_at DESC LIMIT 1', [$g['id']]);
        $out['guest'] = ['name' => $g['name'], 'editToken' => $prev ?: null];
    }
    json_out($out);
});

/** Javob maxsus mehmon havolasidan (?g=token) kelgan bo‘lsa — o‘sha mehmon */
function rsvp_special_guest(array $r): ?array
{
    return isset($_GET['g']) ? sg_find($r['invitation']['id'], $_GET['g']) : null;
}

function rsvp_notify(array $r, array $in, ?array $sg): void
{
    $o = $r['owner'];
    // Maxsus mehmon — kabinetdagi ismi bilan (javobda boshqacha yozgan bo‘lsa, qavsda)
    $who = $sg ? '⭐ ' . $sg['name'] . (mb_strtolower($sg['name']) !== mb_strtolower($in['name']) ? " ({$in['name']})" : '') : $in['name'];
    $text = '💌 ' . $who . ' — ' . RSVP_LABEL[$in['status']] . ($in['status'] === 'coming' ? ", {$in['count']} kishi" : '') . ($in['wish'] ? "\n“{$in['wish']}”" : '');
    try {
        if ($o && $o['notify_rsvp_telegram']) notify_user($o['telegram_id'], $text);
        if ($o && $o['notify_rsvp_sms'] && $o['phone']) send_sms($o['phone'], 'Shohnoma: ' . ($sg ? $sg['name'] : $in['name']) . ' — ' . RSVP_LABEL[$in['status']]);
    } catch (Throwable $e) {
        error_log('[rsvp notify] ' . $e->getMessage());
    }
}

/** Maxsus mehmon javob berdi — havolani ochgan deb ham belgilanadi (ochilish hisoblanmagan bo‘lsa) */
function rsvp_mark_guest_opened(array $sg): void
{
    q('UPDATE special_guests SET first_opened_at = COALESCE(first_opened_at, ?), last_opened_at = COALESCE(last_opened_at, ?), open_count = GREATEST(open_count, 1) WHERE id = ?', [now_utc(), now_utc(), $sg['id']]);
}

route('POST', '/i/:slug/rsvp', function ($p) {
    $r = public_invitation($p['slug']);
    if (!$r || $r['order']['status'] === 'archived') fail('Taklifnoma topilmadi', 404);
    if (!$r['invitation']['rsvp_enabled']) fail('Javob qabul qilinmaydi', 409);
    if (rate_limited('rsvp:' . client_ip() . ':' . $r['invitation']['id'], 10, 3600)) fail('Juda ko‘p urinish', 429);
    $in = rsvp_input();
    if ($in['website'] !== '') json_out(['ok' => true, 'editToken' => new_token(18), 'count' => $in['count']]);
    $sg = rsvp_special_guest($r);
    if ($sg) {
        rsvp_mark_guest_opened($sg);
        // Shu mehmon boshqa qurilmadan avval javob bergan — yangi qator emas, o‘sha javob yangilanadi
        $prev = one('SELECT id, edit_token FROM guest_responses WHERE special_guest_id = ? ORDER BY created_at DESC LIMIT 1', [$sg['id']]);
        if ($prev) {
            q('UPDATE guest_responses SET name = ?, status = ?, `count` = ?, wish = ?, updated_at = ? WHERE id = ?', [$in['name'], $in['status'], $in['count'], $in['wish'], now_utc(), $prev['id']]);
            json_out(['ok' => true, 'editToken' => $prev['edit_token'], 'count' => $in['count']]);
        }
    }
    $token = new_token(24);
    q('INSERT INTO guest_responses (id, invitation_id, name, status, `count`, wish, edit_token, special_guest_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [new_id(), $r['invitation']['id'], $in['name'], $in['status'], $in['count'], $in['wish'], $token, $sg['id'] ?? null]);
    rsvp_notify($r, $in, $sg);
    json_out(['ok' => true, 'editToken' => $token, 'count' => $in['count']]);
});

route('GET', '/i/:slug/rsvp/:token', function ($p) {
    $r = public_invitation($p['slug']) ?? fail('Topilmadi', 404);
    $g = one('SELECT * FROM guest_responses WHERE edit_token = ? AND invitation_id = ?', [$p['token'], $r['invitation']['id']]) ?? fail('Topilmadi', 404);
    json_out(['ok' => true, 'response' => ['name' => $g['name'], 'status' => $g['status'], 'count' => (int)$g['count'], 'wish' => $g['wish']]]);
});

route('PATCH', '/i/:slug/rsvp/:token', function ($p) {
    $r = public_invitation($p['slug']);
    if (!$r || $r['order']['status'] === 'archived') fail('Topilmadi', 404);
    $in = rsvp_input();
    $g = one('SELECT id, special_guest_id FROM guest_responses WHERE edit_token = ? AND invitation_id = ?', [$p['token'], $r['invitation']['id']]) ?? fail('Topilmadi', 404);
    q('UPDATE guest_responses SET name = ?, status = ?, `count` = ?, wish = ?, updated_at = ? WHERE id = ?', [$in['name'], $in['status'], $in['count'], $in['wish'], now_utc(), $g['id']]);
    // Maxsus mehmon havolasidan tahrirlandi, javob hali bog‘lanmagan va mehmonning boshqa javobi yo‘q — bog‘lanadi
    if (!$g['special_guest_id'] && ($sg = rsvp_special_guest($r)) && !scalar('SELECT 1 FROM guest_responses WHERE special_guest_id = ?', [$sg['id']])) {
        q('UPDATE guest_responses SET special_guest_id = ? WHERE id = ?', [$sg['id'], $g['id']]);
        rsvp_mark_guest_opened($sg);
    }
    json_out(['ok' => true]);
});

route('GET', '/i/:slug/calendar', function ($p) {
    $r = public_invitation($p['slug']);
    if (!$r || !$r['invitation']['date']) { http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit; }
    $inv = $r['invitation'];
    $esc = fn(string $s) => str_replace("\n", '\\n', preg_replace('/([\\\\,;])/', '\\\\$1', $s));
    $utc = function (string $local, int $plusHours = 0): string {
        $ts = strtotime(str_replace('T', ' ', $local) . ':00 +05:00') + $plusHours * 3600;
        return gmdate('Ymd\THis\Z', $ts);
    };
    $names = trim($inv['person_a'] . ($inv['person_b'] ? ' & ' . $inv['person_b'] : ''));
    $title = $names . ' — ' . ceremony_label($inv['ceremony']);
    $url = site_url() . '/' . $inv['slug'] . '/';
    $ics = implode("\r\n", [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shohnoma//UZ', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        "UID:{$inv['id']}@shohnoma.uz",
        'DTSTAMP:' . gmdate('Ymd\THis\Z'),
        'DTSTART:' . $utc($inv['date']),
        'DTEND:' . $utc($inv['date'], 4),
        'SUMMARY:' . $esc($title),
        'LOCATION:' . $esc(implode(', ', array_filter([$inv['venue_name'], $inv['address']]))),
        'DESCRIPTION:' . $esc("Taklifnoma: $url"),
        "URL:$url",
        'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:' . $esc($title), 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR',
    ]);
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $inv['slug'] . '.ics"');
    echo $ics;
    exit;
});
