<?php
declare(strict_types=1);

/* ── Admin: umumiy chegirma va promokodlar ── */

route('GET', '/admin/discount', function () {
    require_admin();
    json_out(['ok' => true, 'discount' => discount_get(), 'activePercent' => discount_percent()]);
});

route('PUT', '/admin/discount', function () {
    require_admin();
    $b = body();
    $pct = filter_var($b['percent'] ?? 0, FILTER_VALIDATE_INT);
    if ($pct === false || $pct < 0 || $pct > 90) fail('Chegirma 0% dan 90% gacha bo‘lishi kerak');
    $until = trim((string)($b['until'] ?? ''));
    if ($until !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $until)) fail('Sana noto‘g‘ri');
    setting_set('discount', $pct ? json_encode(['percent' => $pct, 'until' => $until ?: null]) : null);
    json_out(['ok' => true, 'discount' => discount_get(), 'activePercent' => discount_percent()]);
});

route('GET', '/admin/promos', function () {
    require_admin();
    json_out(['ok' => true, 'promos' => array_map('promo_out', all('SELECT * FROM promo_codes ORDER BY created_at DESC, code LIMIT 1000'))]);
});

/** Promokod yaratish: o‘z kodi (code) yoki generatsiya (count ta, prefix bilan) */
route('POST', '/admin/promos', function () {
    require_admin();
    $b = body();
    $kind = ($b['kind'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
    $value = filter_var($b['value'] ?? 0, FILTER_VALIDATE_INT);
    if ($kind === 'percent' && ($value === false || $value < 1 || $value > 90)) fail('Foiz 1 dan 90 gacha bo‘lishi kerak');
    if ($kind === 'fixed' && ($value === false || $value < 1000 || $value > 10000000)) fail('Summa 1 000 so‘mdan katta bo‘lishi kerak');
    $max = ($b['maxUses'] ?? '') === '' || $b['maxUses'] === null ? null : filter_var($b['maxUses'], FILTER_VALIDATE_INT);
    if ($max === false || ($max !== null && $max < 1)) fail('Ishlatish soni noto‘g‘ri');
    $exp = trim((string)($b['expiresAt'] ?? ''));
    if ($exp !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $exp)) fail('Sana noto‘g‘ri');
    $expAt = $exp !== '' ? $exp . ' 18:59:59' : null; // Toshkent vaqti bilan kun oxiri (UTC+5)
    $note = mb_substr(trim((string)($b['note'] ?? '')), 0, 190) ?: null;

    $codes = [];
    $custom = promo_norm((string)($b['code'] ?? ''));
    if ($custom !== '') {
        if (strlen($custom) < 3 || strlen($custom) > 40) fail('Kod 3–40 belgidan iborat bo‘lsin (lotin harflari, raqam, chiziqcha)');
        if (one('SELECT id FROM promo_codes WHERE code = ?', [$custom])) fail('Bunday promokod allaqachon bor', 409);
        $codes[] = $custom;
    } else {
        $n = filter_var($b['count'] ?? 1, FILTER_VALIDATE_INT);
        if ($n === false || $n < 1 || $n > 500) fail('Soni 1 dan 500 gacha bo‘lsin');
        $prefix = substr(promo_norm((string)($b['prefix'] ?? '')), 0, 12);
        $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // o‘xshash belgilarsiz (0/O, 1/I)
        while (count($codes) < $n) {
            $c = '';
            for ($i = 0; $i < 6; $i++) $c .= $abc[random_int(0, strlen($abc) - 1)];
            $c = ($prefix !== '' ? "$prefix-" : '') . $c;
            if (!in_array($c, $codes, true) && !one('SELECT id FROM promo_codes WHERE code = ?', [$c])) $codes[] = $c;
        }
    }
    foreach ($codes as $c)
        q('INSERT INTO promo_codes (id, code, kind, value, max_uses, expires_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())', [new_id(), $c, $kind, $value, $max, $expAt, $note]);
    json_out(['ok' => true, 'codes' => $codes]);
});

route('PATCH', '/admin/promos/:id', function ($p) {
    require_admin();
    $row = one('SELECT id FROM promo_codes WHERE id = ?', [$p['id']]) ?? fail('Promokod topilmadi', 404);
    $b = body();
    if (array_key_exists('active', $b)) q('UPDATE promo_codes SET is_active = ? WHERE id = ?', [$b['active'] ? 1 : 0, $row['id']]);
    json_out(['ok' => true]);
});

route('DELETE', '/admin/promos/:id', function ($p) {
    require_admin();
    q('DELETE FROM promo_codes WHERE id = ?', [$p['id']]);
    json_out(['ok' => true]);
});
