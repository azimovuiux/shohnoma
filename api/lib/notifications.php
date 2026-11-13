<?php
declare(strict_types=1);

/**
 * Saytdagi bildirishnomalar (taklifnoma egasi uchun, `notifications` jadvali).
 * Turlar:
 *   rsvp_new   — yangi mehmon javobi            (ref_id = guest_responses.id)
 *   rsvp_edit  — mehmon javobini o‘zgartirdi    (ref_id = guest_responses.id)
 *   guest_open — maxsus mehmon birinchi marta ochdi (ref_id = special_guests.id)
 *   pay_ok     — to‘lov tasdiqlandi             (ref_id = payments.id | null)
 *   pay_reject — chek rad etildi                (ref_id = payments.id)
 * Yozish xatosi asosiy amalni (javob, to‘lov) hech qachon buzmaydi.
 */
const NOTIF_KINDS = ['rsvp_new', 'rsvp_edit', 'guest_open', 'pay_ok', 'pay_reject'];
const NOTIF_LIST = 30;
/** O‘qilgan eski bildirishnomalar shu muddatdan keyin o‘chiriladi */
const NOTIF_KEEP_DAYS = 180;

function notif_add(?string $userId, ?string $invitationId, string $kind, ?string $refId, array $payload = []): void
{
    if (!$userId || !in_array($kind, NOTIF_KINDS, true)) return;
    try {
        q('INSERT INTO notifications (user_id, invitation_id, kind, ref_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [$userId, $invitationId, $kind, $refId, json_encode($payload, JSON_UNESCAPED_UNICODE), now_utc()]);
        if (random_int(1, 50) === 1) {
            q('DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < ?', [gmdate('Y-m-d H:i:s', time() - NOTIF_KEEP_DAYS * 86400)]);
        }
    } catch (Throwable $e) {
        error_log('[notif] ' . $e->getMessage());
    }
}

/** Taklifnoma egasining id si (buyurtma orqali) */
function notif_invitation_owner(string $invitationId): ?string
{
    return scalar('SELECT o.user_id FROM invitations i JOIN orders o ON o.id = i.order_id WHERE i.id = ?', [$invitationId]) ?: null;
}

/**
 * Mehmon javobi: yangi yoki o‘zgartirilgan.
 * Egasi hali ko‘rmagan (o‘qilmagan) shu javob haqidagi bildirishnoma bo‘lsa — u olib tashlanib, eng so‘nggi
 * ma’lumot bilan yangisi yoziladi (bir mehmon 3 marta tahrirlasa — 3 ta emas, bitta). Yangi javob hali o‘qilmagan
 * bo‘lsa — turi «yangi» bo‘lib qoladi.
 */
function notif_rsvp(string $invitationId, string $responseId, array $in, ?array $sg, bool $edit): void
{
    $owner = notif_invitation_owner($invitationId);
    if (!$owner) return;
    $kind = $edit ? 'rsvp_edit' : 'rsvp_new';
    try {
        if ($edit) {
            $old = one("SELECT id, kind FROM notifications WHERE user_id = ? AND ref_id = ? AND kind IN ('rsvp_new', 'rsvp_edit') AND read_at IS NULL ORDER BY id DESC LIMIT 1", [$owner, $responseId]);
            if ($old) {
                $kind = $old['kind'];
                q('DELETE FROM notifications WHERE id = ?', [$old['id']]);
            }
        }
    } catch (Throwable $e) {
        error_log('[notif] ' . $e->getMessage());
    }
    $wish = trim((string)($in['wish'] ?? ''));
    notif_add($owner, $invitationId, $kind, $responseId, [
        'name' => $in['name'],
        'status' => $in['status'],
        'count' => (int)$in['count'],
        'wish' => $wish !== '' ? (mb_strlen($wish) > 140 ? mb_substr($wish, 0, 139) . '…' : $wish) : null,
        'sg' => $sg['name'] ?? null,
    ]);
}

function notif_out(array $n): array
{
    $names = trim(($n['person_a'] ?? '') . (!empty($n['person_b']) ? ' & ' . $n['person_b'] : ''));
    return [
        'id' => (int)$n['id'],
        'kind' => $n['kind'],
        'invitationId' => $n['invitation_id'],
        'orderId' => $n['order_id'] ?? null,
        'invitation' => $names !== '' ? $names : null,
        'refId' => $n['ref_id'],
        'data' => jdec($n['payload'], new stdClass()),
        'createdAt' => iso($n['created_at']),
        'read' => $n['read_at'] !== null,
    ];
}

/** Egasining o‘zi ko‘ra oladigan bildirishnomalar sharti (taklifnoma boshqa egaga o‘tgan bo‘lsa — ko‘rinmaydi) */
const NOTIF_FROM = 'FROM notifications n LEFT JOIN invitations i ON i.id = n.invitation_id LEFT JOIN orders o ON o.id = i.order_id
    WHERE n.user_id = ? AND (n.invitation_id IS NULL OR o.user_id = n.user_id)';

function notif_unread(string $userId): int
{
    return (int)scalar('SELECT COUNT(*) ' . NOTIF_FROM . ' AND n.read_at IS NULL', [$userId]);
}

/** Taklifnomaning o‘qilmagan javob bildirishnomalari (kabinet: «Yangi» belgisi) → guest_responses.id[] */
function notif_unread_refs(string $userId, string $invitationId, array $kinds): array
{
    if (!$kinds) return [];
    $in = implode(',', array_fill(0, count($kinds), '?'));
    return array_values(array_unique(array_column(all("SELECT ref_id FROM notifications WHERE user_id = ? AND invitation_id = ? AND read_at IS NULL AND kind IN ($in) AND ref_id IS NOT NULL", [$userId, $invitationId, ...$kinds]), 'ref_id')));
}
