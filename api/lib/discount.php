<?php
declare(strict_types=1);

/**
 * Umumiy chegirma (admin → Chegirmalar): barcha shablon narxlariga foiz.
 * settings.discount = {"percent": 20, "until": "2026-12-31"} — until ixtiyoriy (shu kun oxirigacha, Toshkent vaqti).
 */
function discount_get(): array
{
    $d = json_decode((string)(db_settings()['discount'] ?? ''), true);
    return ['percent' => max(0, min(90, (int)($d['percent'] ?? 0))), 'until' => is_string($d['until'] ?? null) ? $d['until'] : null];
}

function discount_percent(): int
{
    $d = discount_get();
    if ($d['percent'] <= 0) return 0;
    if ($d['until']) {
        $end = DateTime::createFromFormat('Y-m-d H:i:s', $d['until'] . ' 23:59:59', new DateTimeZone('Asia/Tashkent'));
        if ($end && $end < new DateTime('now', new DateTimeZone('Asia/Tashkent'))) return 0;
    }
    return $d['percent'];
}

/** Ming so‘mgacha yaxlitlash */
function round_sum(float $n): int { return (int)max(0, round($n / 1000) * 1000); }

/** Shablonning hozirgi sotuv narxi (umumiy chegirma bilan) */
function tpl_price(array $t): int
{
    $p = (int)($t['price'] ?? 0);
    $pct = discount_percent();
    return $pct ? round_sum($p * (100 - $pct) / 100) : $p;
}

/** Saytga chiqadigan ko‘rinish: chegirma bo‘lsa price — chegirmali, priceOld — asl (yoki kattaroq eski narx) */
function tpl_public(array $t): array
{
    $pct = discount_percent();
    if (!$pct) return $t;
    $orig = (int)($t['price'] ?? 0);
    $t['price'] = tpl_price($t);
    $t['priceOld'] = max($orig, (int)($t['priceOld'] ?? 0));
    $t['discountPercent'] = $pct;
    return $t;
}

/**
 * To‘lanmagan buyurtma narxini joriy narxga moslash (umumiy chegirma yoqilgan/o‘chirilgan bo‘lsa).
 * Admin qo‘lda narx qo‘ygan buyurtma (price_locked) o‘zgarmaydi. Promokod chegirmasi qayta hisoblanadi.
 */
function order_reprice(array $o): array
{
    if (!in_array($o['status'], ['draft', 'pending_payment', 'payment_failed', 'p2p_rejected'], true) || !empty($o['price_locked'])) return $o;
    $t = template_get($o['template_slug']);
    if (!$t) return $o;
    $base = tpl_price($t);
    if ($base === (int)$o['amount'] + (int)$o['promo_discount']) return $o;
    $disc = 0;
    if (!empty($o['promo_code'])) {
        $p = one('SELECT * FROM promo_codes WHERE code = ?', [$o['promo_code']]);
        $disc = $p ? promo_discount($p, $base) : 0;
    }
    $o['amount'] = $base - $disc;
    $o['promo_discount'] = $disc;
    if (!$disc) $o['promo_code'] = null;
    q('UPDATE orders SET amount = ?, promo_code = ?, promo_discount = ? WHERE id = ?', [$o['amount'], $o['promo_code'], $disc, $o['id']]);
    return $o;
}

/* ── Promokodlar ── */

function promo_norm(string $code): string { return strtoupper(preg_replace('/[^A-Za-z0-9-]/', '', $code) ?? ''); }

/** Ishlatsa bo‘ladigan promokod yoki xato matni */
function promo_find(string $code): array|string
{
    $code = promo_norm($code);
    if ($code === '') return 'Promokodni kiriting';
    $p = one('SELECT * FROM promo_codes WHERE code = ?', [$code]);
    if (!$p || !$p['is_active']) return 'Bunday promokod topilmadi';
    if ($p['expires_at'] && strtotime($p['expires_at'] . ' UTC') < time()) return 'Promokod muddati tugagan';
    if ($p['max_uses'] !== null && (int)$p['used'] >= (int)$p['max_uses']) return 'Promokod limiti tugagan';
    return $p;
}

/** Narxdan promokod chegirmasi (so‘m) */
function promo_discount(array $p, int $base): int
{
    $d = $p['kind'] === 'fixed' ? (int)$p['value'] : round_sum($base * (int)$p['value'] / 100);
    return max(0, min($d, $base - 1000)); // kamida 1 000 so‘m qoladi (to‘lov tizimlari 0 ni qabul qilmaydi)
}

function promo_out(array $p): array
{
    return [
        'id' => $p['id'], 'code' => $p['code'], 'kind' => $p['kind'], 'value' => (int)$p['value'],
        'maxUses' => $p['max_uses'] === null ? null : (int)$p['max_uses'], 'used' => (int)$p['used'],
        'expiresAt' => $p['expires_at'] ? substr($p['expires_at'], 0, 10) : null, 'active' => (bool)$p['is_active'],
        'note' => $p['note'], 'createdAt' => iso($p['created_at']),
    ];
}
