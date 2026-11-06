<?php
declare(strict_types=1);

function jdec(?string $v, mixed $default = []): mixed
{
    if ($v === null || $v === '') return $default;
    $d = json_decode($v, true);
    return $d ?? $default;
}

function order_out(array $o): array
{
    return [
        'id' => $o['id'],
        'code' => $o['code'],
        'seq' => (int)$o['seq'],
        'userId' => $o['user_id'],
        'templateSlug' => $o['template_slug'],
        'status' => $o['status'],
        'amount' => (int)$o['amount'],
        'paidAt' => iso($o['paid_at']),
        'createdAt' => iso($o['created_at']),
        'updatedAt' => iso($o['updated_at']),
    ];
}

function invitation_out(array $i): array
{
    return [
        'id' => $i['id'],
        'orderId' => $i['order_id'],
        'slug' => $i['slug'],
        'ceremony' => $i['ceremony'],
        'personA' => $i['person_a'],
        'personB' => $i['person_b'],
        'date' => $i['date'],
        'venueName' => $i['venue_name'],
        'address' => $i['address'],
        'mapUrl' => $i['map_url'],
        'message' => $i['message'],
        'program' => jdec($i['program']),
        'photos' => jdec($i['photos']),
        'extra' => (object)(jdec($i['extra'] ?? null) ?: []),
        'rsvpEnabled' => (bool)$i['rsvp_enabled'],
        'rsvpDeadline' => $i['rsvp_deadline'],
        'musicEnabled' => (bool)$i['music_enabled'],
        'musicTrack' => $i['music_track'] ?? null,
        'contactPhone' => $i['contact_phone'],
        'contactTg' => $i['contact_tg'],
        'views' => (int)$i['views'],
        'createdAt' => iso($i['created_at']),
    ];
}

function payment_out(array $p): array
{
    return [
        'id' => $p['id'],
        'orderId' => $p['order_id'],
        'provider' => $p['provider'],
        'amount' => (int)$p['amount'],
        'status' => $p['status'],
        'receiptUrl' => $p['receipt_url'],
        'reviewNote' => $p['review_note'],
        'createdAt' => iso($p['created_at']),
        'paidAt' => iso($p['paid_at']),
    ];
}

function guest_out(array $g): array
{
    return [
        'id' => $g['id'],
        'invitationId' => $g['invitation_id'],
        'name' => $g['name'],
        'status' => $g['status'],
        'count' => (int)$g['count'],
        'wish' => $g['wish'],
        'createdAt' => iso($g['created_at']),
        'updatedAt' => iso($g['updated_at']),
    ];
}

function brief_out(array $b): array
{
    return [
        'id' => $b['id'],
        'ceremony' => $b['ceremony'],
        'date' => $b['date'],
        'guestCount' => $b['guest_count'] === null ? null : (int)$b['guest_count'],
        'styles' => jdec($b['styles']),
        'colors' => jdec($b['colors']),
        'ideas' => $b['ideas'],
        'references' => jdec($b['references']),
        'budget' => $b['budget'],
        'name' => $b['name'],
        'phone' => $b['phone'],
        'contactVia' => $b['contact_via'],
        'status' => $b['status'],
        'createdAt' => iso($b['created_at']),
    ];
}

function lead_out(array $l): array
{
    return [
        'id' => $l['id'],
        'name' => $l['name'],
        'phone' => $l['phone'],
        'ceremony' => $l['ceremony'],
        'message' => $l['message'],
        'replyVia' => $l['reply_via'],
        'status' => $l['status'],
        'createdAt' => iso($l['created_at']),
    ];
}
