<?php
declare(strict_types=1);

/* ── Admin: ijtimoiy tarmoqlar va aloqa ma’lumotlari ── */
route('GET', '/admin/social', function () {
    require_admin();
    json_out(['ok' => true, 'social' => social_settings(), 'types' => SOCIAL_TYPES]);
});

route('PUT', '/admin/social', function () {
    require_admin();
    $b = body();
    $in = is_array($b['links'] ?? null) ? array_values($b['links']) : [];
    if (count($in) > SOCIAL_MAX) fail('Ko‘pi bilan ' . SOCIAL_MAX . ' ta havola', 422);
    $links = [];
    foreach ($in as $i => $l) {
        if (!is_array($l)) continue;
        $type = (string)($l['type'] ?? '');
        if (!in_array($type, SOCIAL_TYPES, true)) fail('Noma’lum tarmoq turi', 422);
        $raw = trim((string)($l['url'] ?? ''));
        if ($raw === '') continue;
        $url = social_normalize($type, $raw) ?? fail(($i + 1) . '-qator: havola noto‘g‘ri — «' . mb_substr($raw, 0, 60) . '»', 422);
        $links[] = ['type' => $type, 'url' => $url, 'label' => mb_substr(trim((string)($l['label'] ?? '')), 0, 40)];
    }
    $phone = preg_replace('/[^\d+]/', '', (string)($b['phone'] ?? ''));
    if ($phone !== '') {
        $d = preg_replace('/\D/', '', $phone);
        if (strlen($d) === 9) $d = '998' . $d;
        if (!preg_match('/^\d{11,15}$/', $d)) fail('Telefon raqami noto‘g‘ri (masalan, +998 90 123 45 67)', 422);
        $phone = '+' . $d;
    }
    $out = [
        'links' => $links,
        'phone' => $phone,
        'workHours' => mb_substr(trim((string)($b['workHours'] ?? '')), 0, 60),
        'workHoursRu' => mb_substr(trim((string)($b['workHoursRu'] ?? '')), 0, 60),
        'workHoursEn' => mb_substr(trim((string)($b['workHoursEn'] ?? '')), 0, 60),
        'hideTelegramBot' => !empty($b['hideTelegramBot']),
    ];
    setting_set('social', json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    json_out(['ok' => true, 'social' => social_settings()]);
});
