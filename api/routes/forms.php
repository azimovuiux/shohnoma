<?php
declare(strict_types=1);

const REPLY_VIA = ['telegram' => 'Telegram', 'call' => 'Qo‘ng‘iroq', 'whatsapp' => 'WhatsApp', 'sms' => 'SMS'];

route('POST', '/leads', function () {
    if (rate_limited('lead:' . client_ip(), 5, 600)) fail('Juda ko‘p urinish', 429);
    $b = body();
    if (!$b) fail('Ma’lumot yo‘q');
    if (!empty($b['website'])) json_out(['ok' => true]);
    $name = str_in($b['name'] ?? '', 120);
    $phone = normalize_phone((string)($b['phone'] ?? ''));
    if ($name === '' || !$phone) fail('Ism va telefonni to‘liq kiriting', 422);
    $message = str_in($b['message'] ?? '', 2000);
    $replyVia = isset(REPLY_VIA[$b['replyVia'] ?? '']) ? $b['replyVia'] : 'telegram';
    $ceremony = is_string($b['ceremony'] ?? null) && $b['ceremony'] !== '' ? mb_substr($b['ceremony'], 0, 20) : null;
    q('INSERT INTO leads (id, name, phone, ceremony, message, reply_via) VALUES (?, ?, ?, ?, ?, ?)', [new_id(), $name, $phone, $ceremony, $message, $replyVia]);
    notify_admin("📩 Yangi xabar (sayt)\n👤 $name\n📞 $phone\n🎉 " . ceremony_label($ceremony) . "\n💬 " . ($message ?: '—') . "\n↩️ Javob: " . REPLY_VIA[$replyVia]);
    json_out(['ok' => true]);
});

route('POST', '/briefs', function () {
    if (rate_limited('brief:' . client_ip(), 5, 600)) fail('Juda ko‘p urinish', 429);
    if (!empty($_POST['website'])) json_out(['ok' => true]);
    $d = json_decode((string)($_POST['data'] ?? '{}'), true);
    if (!is_array($d)) fail('Ma’lumot noto‘g‘ri', 422);
    $ceremony = $d['ceremony'] ?? '';
    if (!in_array($ceremony, ['nikoh', 'fotiha', 'sunnat', 'tugilgan-kun', 'boshqa'], true)) fail('Marosim turini tanlang', 422);
    $date = (string)($d['date'] ?? '');
    if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) fail('Sana noto‘g‘ri', 422);
    $gc = $d['guestCount'] ?? null;
    if ($gc === '' || $gc === null) $gc = null;
    elseif (!is_numeric($gc) || (int)$gc < 0 || (int)$gc > 5000) fail('Mehmonlar soni noto‘g‘ri', 422);
    else $gc = (int)$gc;
    $arr = function ($v, int $max) {
        if (!is_array($v)) return [];
        return array_values(array_slice(array_map(fn($x) => mb_substr((string)$x, 0, 40), array_filter($v, 'is_scalar')), 0, $max));
    };
    $ideas = mb_substr((string)($d['ideas'] ?? ''), 0, 3000);
    $budget = mb_substr((string)($d['budget'] ?? ''), 0, 20);
    if ($budget === '') fail('Byudjetni tanlang', 422);
    $name = str_in($d['name'] ?? '', 120);
    if ($name === '') fail('Ismingizni kiriting', 422);
    $phone = normalize_phone((string)($d['phone'] ?? '')) ?? fail('Telefon raqam to‘liq emas', 422);
    $via = $d['contactVia'] ?? '';
    if (!in_array($via, ['telegram', 'call', 'sms'], true)) fail('Bog‘lanish usulini tanlang', 422);
    $refs = [];
    foreach (array_slice(files_list('files'), 0, 10) as $f) $refs[] = save_upload($f, 'briefs');
    q('INSERT INTO briefs (id, ceremony, date, guest_count, styles, colors, ideas, `references`, budget, name, phone, contact_via) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        new_id(), $ceremony, $date ?: null, $gc, json_encode($arr($d['styles'] ?? [], 10), JSON_UNESCAPED_UNICODE), json_encode($arr($d['colors'] ?? [], 12), JSON_UNESCAPED_UNICODE),
        $ideas ?: null, json_encode($refs), $budget, $name, $phone, $via,
    ]);
    notify_admin("🎨 Yangi brif: $name · $phone\nByudjet: $budget · Rasmlar: " . count($refs) . "\n" . site_url() . '/admin/briflar/');
    json_out(['ok' => true]);
});
