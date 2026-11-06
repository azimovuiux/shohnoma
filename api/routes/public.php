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
    $count = $b['count'] ?? 1;
    if (!is_int($count) && !(is_string($count) && ctype_digit($count))) fail('Kishi soni noto‘g‘ri', 422);
    $count = (int)$count;
    if ($count < 1 || $count > 10) fail('Kishi soni 1 dan 10 gacha bo‘lsin', 422);
    $wish = trim((string)($b['wish'] ?? ''));
    if (mb_strlen($wish) > 1000) fail('Tilak juda uzun', 422);
    return ['name' => $name, 'status' => $status, 'count' => $status === 'not_coming' ? 1 : $count, 'wish' => $wish ?: null, 'website' => (string)($b['website'] ?? '')];
}

route('GET', '/i/:slug', function ($p) {
    $r = public_invitation($p['slug']) ?? fail('Taklifnoma topilmadi', 404);
    if ($r['order']['status'] !== 'archived') q('UPDATE invitations SET views = views + 1 WHERE id = ?', [$r['invitation']['id']]);
    $inv = invitation_out($r['invitation']);
    unset($inv['contactPhone'], $inv['views'], $inv['orderId']);
    json_out(['ok' => true, 'invitation' => $inv, 'templateSlug' => $r['order']['template_slug'], 'archived' => $r['order']['status'] === 'archived']);
});

route('POST', '/i/:slug/rsvp', function ($p) {
    $r = public_invitation($p['slug']);
    if (!$r || $r['order']['status'] === 'archived') fail('Taklifnoma topilmadi', 404);
    if (!$r['invitation']['rsvp_enabled']) fail('Javob qabul qilinmaydi', 409);
    if (rate_limited('rsvp:' . client_ip() . ':' . $r['invitation']['id'], 10, 3600)) fail('Juda ko‘p urinish', 429);
    $in = rsvp_input();
    if ($in['website'] !== '') json_out(['ok' => true, 'editToken' => new_token(18), 'count' => $in['count']]);
    $token = new_token(24);
    q('INSERT INTO guest_responses (id, invitation_id, name, status, `count`, wish, edit_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [new_id(), $r['invitation']['id'], $in['name'], $in['status'], $in['count'], $in['wish'], $token]);
    $o = $r['owner'];
    $text = '💌 ' . $in['name'] . ' — ' . RSVP_LABEL[$in['status']] . ($in['status'] === 'coming' ? ", {$in['count']} kishi" : '') . ($in['wish'] ? "\n“{$in['wish']}”" : '');
    try {
        if ($o && $o['notify_rsvp_telegram']) notify_user($o['telegram_id'], $text);
        if ($o && $o['notify_rsvp_sms'] && $o['phone']) send_sms($o['phone'], 'Shohnoma: ' . $in['name'] . ' — ' . RSVP_LABEL[$in['status']]);
    } catch (Throwable $e) {
        error_log('[rsvp notify] ' . $e->getMessage());
    }
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
    $g = one('SELECT id FROM guest_responses WHERE edit_token = ? AND invitation_id = ?', [$p['token'], $r['invitation']['id']]) ?? fail('Topilmadi', 404);
    q('UPDATE guest_responses SET name = ?, status = ?, `count` = ?, wish = ? WHERE id = ?', [$in['name'], $in['status'], $in['count'], $in['wish'], $g['id']]);
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
