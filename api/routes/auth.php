<?php
declare(strict_types=1);

/* Mijozlar faqat Telegram bot orqali kiradi — routes/auth_tg.php */

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
    if (!empty($u['is_blocked'])) fail('Hisobingiz bloklangan', 403);
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
