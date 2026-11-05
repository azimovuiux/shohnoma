<?php
declare(strict_types=1);

const SESSION_COOKIE = 'sh_session';
const GUEST_COOKIE = 'sh_guest';

function cookie_set(string $name, string $value, int $expires): void
{
    setcookie($name, $value, ['expires' => $expires, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => is_https()]);
}

function normalize_phone(?string $raw): ?string
{
    $d = preg_replace('/\D/', '', (string)$raw);
    if (strlen($d) === 9) $d = '998' . $d;
    return preg_match('/^998\d{9}$/', $d) ? "+$d" : null;
}
function format_phone(?string $p): string
{
    if (!$p) return '';
    $d = preg_replace('/^998/', '', preg_replace('/\D/', '', $p));
    return sprintf('+998 %s %s %s %s', substr($d, 0, 2), substr($d, 2, 3), substr($d, 5, 2), substr($d, 7, 2));
}
function admin_phones(): array { return array_values(array_filter(array_map('trim', explode(',', env('ADMIN_PHONES', ''))))); }

/** users jadvali qatorini frontend formatiga (camelCase) */
function user_out(array $u): array
{
    return [
        'id' => $u['id'],
        'phone' => $u['phone'],
        'name' => $u['name'],
        'telegramId' => $u['telegram_id'],
        'telegramUser' => $u['telegram_user'],
        'isAdmin' => (bool)$u['is_admin'],
        'notifyRsvpTelegram' => (bool)$u['notify_rsvp_telegram'],
        'notifyRsvpSms' => (bool)$u['notify_rsvp_sms'],
        'notifyDayBefore' => (bool)$u['notify_day_before'],
        'createdAt' => iso($u['created_at']),
    ];
}

function current_user(): ?array
{
    static $cached = false;
    if ($cached !== false) return $cached;
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if (!$token) return $cached = null;
    $u = one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP()', [hash('sha256', $token)]);
    if ($u && !$u['is_admin'] && $u['phone'] && in_array($u['phone'], admin_phones(), true)) {
        q('UPDATE users SET is_admin = 1 WHERE id = ?', [$u['id']]);
        $u['is_admin'] = 1;
    }
    return $cached = $u ?: null;
}
function require_user(): array { return current_user() ?? fail('Kirilmagan', 401); }
function require_admin(): array { $u = require_user(); if (!$u['is_admin']) fail('Ruxsat yo‘q', 403); return $u; }

function create_session(string $userId): void
{
    $token = new_token();
    $exp = time() + 60 * 86400;
    q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [hash('sha256', $token), $userId, gmdate('Y-m-d H:i:s', $exp)]);
    cookie_set(SESSION_COOKIE, $token, $exp);
    $guest = $_COOKIE[GUEST_COOKIE] ?? '';
    if ($guest) q('UPDATE orders SET user_id = ? WHERE guest_token = ? AND user_id IS NULL', [$userId, $guest]);
}

function destroy_session(): void
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token) q('DELETE FROM sessions WHERE id = ?', [hash('sha256', $token)]);
    cookie_set(SESSION_COOKIE, '', time() - 3600);
}

function guest_token(bool $create = false): ?string
{
    $t = $_COOKIE[GUEST_COOKIE] ?? null;
    if (!$t && $create) {
        $t = new_token(24);
        cookie_set(GUEST_COOKIE, $t, time() + 90 * 86400);
        $_COOKIE[GUEST_COOKIE] = $t;
    }
    return $t;
}

function find_or_create_user_by_phone(string $phone, ?string $name = null): array
{
    $u = one('SELECT * FROM users WHERE phone = ?', [$phone]);
    if ($u) return $u;
    $id = new_id();
    q('INSERT INTO users (id, phone, name, is_admin) VALUES (?, ?, ?, ?)', [$id, $phone, $name, in_array($phone, admin_phones(), true) ? 1 : 0]);
    return one('SELECT * FROM users WHERE id = ?', [$id]);
}

/* ── SMS kod: 1 daqiqada 1 ta, 5 daqiqa amal qiladi, 5 xato → 15 daqiqa blok ── */
function otp_hash(string $phone, string $code): string { return hash('sha256', "$phone:$code:" . env('SESSION_SECRET', 'dev')); }

function send_otp(string $phone): array
{
    $last = one('SELECT *, TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS age FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1', [$phone]);
    if ($last) {
        if ((int)$last['attempts'] >= 5 && (int)$last['age'] < 900) return ['ok' => false, 'error' => 'Ko‘p marta xato kiritildi. 15 daqiqadan so‘ng urinib ko‘ring.'];
        if ((int)$last['age'] < 60) return ['ok' => false, 'error' => 'Kodni qayta so‘rashdan oldin biroz kuting.', 'retryIn' => 60 - (int)$last['age']];
    }
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    q('INSERT INTO otp_codes (id, phone, code_hash, expires_at) VALUES (?, ?, ?, ?)', [new_id(), $phone, otp_hash($phone, $code), gmdate('Y-m-d H:i:s', time() + 300)]);
    if (!send_sms($phone, "Shohnoma: kirish kodi $code. Kodni hech kimga bermang.")) return ['ok' => false, 'error' => 'SMS yuborilmadi. Birozdan so‘ng urinib ko‘ring.'];
    $out = ['ok' => true, 'phone' => $phone];
    if (!env('ESKIZ_EMAIL') && env('APP_DEBUG') === '1') $out['devCode'] = $code;
    return $out;
}

function verify_otp(string $phone, string $code): ?string
{
    $row = one('SELECT * FROM otp_codes WHERE phone = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [$phone]);
    if (!$row || strtotime($row['expires_at'] . ' UTC') < time()) return 'Kod eskirgan. Yangi kod so‘rang.';
    if ((int)$row['attempts'] >= 5) return 'Ko‘p marta xato kiritildi. 15 daqiqadan so‘ng urinib ko‘ring.';
    if (!hash_equals($row['code_hash'], otp_hash($phone, $code))) {
        q('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [$row['id']]);
        return 'Kod noto‘g‘ri';
    }
    q('UPDATE otp_codes SET used_at = UTC_TIMESTAMP() WHERE id = ?', [$row['id']]);
    return null;
}
