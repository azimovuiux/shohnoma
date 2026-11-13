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
    $u = one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP() AND COALESCE(u.is_blocked, 0) = 0', [hash('sha256', $token)]);
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
