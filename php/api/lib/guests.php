<?php
declare(strict_types=1);

/**
 * Maxsus mehmonlar (special_guests): har mehmonga shaxsiy havola /<slug>/?g=<token>.
 * Havola ochilganda taklifnoma «Hurmatli {ism}» deb ochiladi, ochilish soni va javobi egasiga ko‘rinadi.
 * Token — 10 belgi [a-z0-9] (36^10 ≈ 3.6·10^15), taxmin qilishga qarshi IP bo‘yicha xato urinishlar cheklanadi.
 */
const SG_MAX = 1000;
const SG_NAME_MAX = 40;
const SG_NOTE_MAX = 200;
/** Qayta yuklash/til almashtirish ochilishlar sonini oshirmasin — shu oraliqdagi ochilishlar bitta hisoblanadi */
const SG_OPEN_GAP = 600;
/** Bir IP dan noto‘g‘ri token urinishlari (soatiga) */
const SG_MISS_MAX = 30;

function sg_token_ok(mixed $t): bool { return is_string($t) && preg_match('/^[a-z0-9]{10}$/', $t) === 1; }

function sg_new_token(): string
{
    for ($i = 0; $i < 8; $i++) {
        $t = new_id(10);
        if (!scalar('SELECT 1 FROM special_guests WHERE token = ?', [$t])) return $t;
    }
    fail('Havola yaratilmadi', 500);
}

/** Ko‘rinadigan murojaat: bo‘shliqlar yig‘iladi, boshqaruv belgilari olib tashlanadi */
function sg_clean_name(mixed $v): string
{
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)($v ?? '')) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $s) ?? '');
}

/** Rate-limit hisobini oshirmasdan tekshirish */
function rate_peek(string $key, int $max, int $windowSec): bool
{
    return (int)scalar('SELECT COUNT(*) FROM rate_hits WHERE k = ? AND created_at >= ?', [$key, gmdate('Y-m-d H:i:s', time() - $windowSec)]) >= $max;
}

/**
 * Taklifnomadagi maxsus mehmon (token bo‘yicha). Topilmasa — IP bo‘yicha xato urinish yoziladi;
 * chegaradan oshgan IP uchun to‘g‘ri token ham tekshirilmaydi (taxmin qilib topishning oldini oladi).
 */
function sg_find(string $invitationId, mixed $token): ?array
{
    if (!sg_token_ok($token)) return null;
    $key = 'gmiss:' . client_ip();
    if (rate_peek($key, SG_MISS_MAX, 3600)) return null;
    $g = one('SELECT * FROM special_guests WHERE token = ? AND invitation_id = ?', [$token, $invitationId]);
    if (!$g) rate_limited($key, SG_MISS_MAX, 3600);
    return $g;
}

/** Havola oldindan ko‘rinishini oluvchi botlar va avtomatik brauzerlar — «ochdi» deb hisoblanmaydi */
function is_bot_request(): bool
{
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($ua === '') return true;
    // Diqqat: ilova ichidagi brauzerlar (Telegram-Android, Instagram, FBAV) — haqiqiy mehmon, ular bu ro‘yxatda yo‘q
    return preg_match('/(?<!cu)bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|^whatsapp\/|vkshare|embedly|curl\/|wget|python-|okhttp|go-http|java\/|headlesschrome|lighthouse|pagespeed/i', $ua) === 1;
}

/** Taklifnoma egasi yoki admin (kabinetdan «Ochish» bosgan) — ochilish hisoblanmaydi */
function sg_viewer_is_owner(array $order): bool
{
    $u = current_user();
    return $u && ($u['id'] === $order['user_id'] || $u['is_admin']);
}

/** Mehmon havolani ochdi: birinchi/oxirgi vaqt va son (SG_OPEN_GAP ichidagi qayta ochishlar bitta) */
function sg_mark_open(array $g): void
{
    $now = now_utc();
    q('UPDATE special_guests SET open_count = open_count + IF(last_opened_at IS NULL OR last_opened_at < ?, 1, 0), first_opened_at = COALESCE(first_opened_at, ?), last_opened_at = ? WHERE id = ?',
        [gmdate('Y-m-d H:i:s', time() - SG_OPEN_GAP), $now, $now, $g['id']]);
}

/** Ochilish hisoblansinmi: bot emas, egasi emas, arxiv emas */
function sg_should_count(array $order): bool
{
    return $order['status'] !== 'archived' && !is_bot_request() && !sg_viewer_is_owner($order);
}

function special_guest_out(array $g, ?array $r): array
{
    return [
        'id' => $g['id'],
        'name' => $g['name'],
        'note' => $g['note'],
        'token' => $g['token'],
        'openCount' => (int)$g['open_count'],
        'firstOpenedAt' => iso($g['first_opened_at']),
        'lastOpenedAt' => iso($g['last_opened_at']),
        'createdAt' => iso($g['created_at']),
        'response' => $r ? [
            'name' => $r['name'],
            'status' => $r['status'],
            'count' => (int)$r['count'],
            'wish' => $r['wish'],
            'at' => iso($r['updated_at'] ?: $r['created_at']),
        ] : null,
    ];
}

/** Maxsus mehmonlar jamlanmasi (kabinet: Umumiy sahifa) */
function sg_summary(string $invitationId): array
{
    $r = one('SELECT COUNT(*) AS total, SUM(open_count > 0) AS opened FROM special_guests WHERE invitation_id = ?', [$invitationId]);
    return ['total' => (int)($r['total'] ?? 0), 'opened' => (int)($r['opened'] ?? 0)];
}
