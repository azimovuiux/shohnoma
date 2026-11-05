<?php
declare(strict_types=1);

route('POST', '/auth/otp', function () {
    $phone = normalize_phone(body()['phone'] ?? '') ?? fail('Telefon raqam to‘liq emas', 422);
    if (rate_limited('otp:' . client_ip(), 8, 3600)) fail('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429);
    $r = send_otp($phone);
    json_out($r, $r['ok'] ? 200 : 429);
});

route('POST', '/auth/verify', function () {
    $b = body();
    $phone = normalize_phone($b['phone'] ?? '');
    $code = (string)($b['code'] ?? '');
    if (!$phone || !preg_match('/^\d{6}$/', $code)) fail('Kodni to‘liq kiriting', 422);
    if ($err = verify_otp($phone, $code)) fail($err, 401);
    $u = find_or_create_user_by_phone($phone);
    create_session($u['id']);
    json_out(['ok' => true]);
});

route('POST', '/auth/telegram', function () {
    $data = array_map('strval', array_filter(body(), fn($v) => $v !== null && $v !== ''));
    if (!verify_telegram_auth($data)) fail('Telegram ma’lumotini tasdiqlab bo‘lmadi', 401);
    $tgUser = !empty($data['username']) ? '@' . $data['username'] : null;
    $name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')) ?: null;
    if ($cur = current_user()) {
        q('UPDATE users SET telegram_id = ?, telegram_user = ? WHERE id = ?', [$data['id'], $tgUser, $cur['id']]);
        json_out(['ok' => true, 'linked' => true]);
    }
    $u = one('SELECT * FROM users WHERE telegram_id = ?', [$data['id']]);
    if (!$u) {
        $id = new_id();
        q('INSERT INTO users (id, telegram_id, telegram_user, name) VALUES (?, ?, ?, ?)', [$id, $data['id'], $tgUser, $name]);
        $u = one('SELECT * FROM users WHERE id = ?', [$id]);
    }
    create_session($u['id']);
    json_out(['ok' => true]);
});

route('POST', '/auth/logout', function () {
    destroy_session();
    json_out(['ok' => true]);
});

/* Admin: login + parol (SMS/Telegram sozlanmagan bo‘lsa ham kirish uchun) */
route('POST', '/auth/password', function () {
    $b = body();
    $login = strtolower(trim((string)($b['login'] ?? '')));
    $pass = (string)($b['password'] ?? '');
    if ($login === '' || $pass === '') fail('Login va parolni kiriting', 422);
    // Faqat xato urinishlar sanaladi: 15 daqiqada 8 ta xato → blok
    $key = 'pwfail:' . client_ip();
    $fails = (int)scalar('SELECT COUNT(*) FROM rate_hits WHERE k = ? AND created_at >= ?', [$key, gmdate('Y-m-d H:i:s', time() - 900)]);
    if ($fails >= 8) fail('Juda ko‘p xato urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.', 429);
    $u = one('SELECT * FROM users WHERE login = ? AND password_hash IS NOT NULL', [$login]);
    if (!$u || !password_verify($pass, $u['password_hash'])) {
        q('INSERT INTO rate_hits (k, created_at) VALUES (?, ?)', [$key, now_utc()]);
        fail('Login yoki parol noto‘g‘ri', 401);
    }
    create_session($u['id']);
    json_out(['ok' => true]);
});

route('POST', '/auth/password/change', function () {
    $u = require_admin();
    $b = body();
    $cur = (string)($b['current'] ?? '');
    $new = (string)($b['password'] ?? '');
    if (empty($u['password_hash']) || !password_verify($cur, $u['password_hash'])) fail('Joriy parol noto‘g‘ri', 401);
    if (mb_strlen($new) < 10) fail('Yangi parol kamida 10 belgidan iborat bo‘lsin', 422);
    q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($new, PASSWORD_BCRYPT), $u['id']]);
    json_out(['ok' => true]);
});
