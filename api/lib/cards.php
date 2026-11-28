<?php
declare(strict_types=1);

/*
 * «Vizitka» (raqamli vizitka) — alohida mahsulot.
 * Buyurtma: `orders` (product='vizitka', template_slug = dizayn slug’i, masalan 'v-noir'); invitations qatori YO‘Q.
 * Ma’lumot: `cards` (ism/telefon/email/telegram/rasmlar ustunlarda, qolgani `data` JSON da), murojaatlar: `card_leads`.
 * Dizaynlar va forma sxemasi: src/lib/cards.ts → scripts/export-cards.mts → lib/cards.json.
 * Ko‘p tilli matn: {uz, ru?, en?} — uz asosiy. To‘lov bir martalik, muddatsiz (arxiv/cron yo‘q).
 */

const CARD_SLUG_RE = '/^[a-z0-9][a-z0-9-]{1,79}$/';
const CARD_LANGS = ['uz', 'ru', 'en'];
/** data JSON ga tushadigan kalitlar (qolganlari — alohida ustunlar) */
const CARD_DATA_KEYS = ['position', 'company', 'bio', 'whatsapp', 'website', 'address', 'mapUrl', 'directions', 'stats', 'companies', 'socials', 'links'];
const CARD_RESERVED_SLUGS = ['_', 'api', 'admin', 'kabinet', 'vizitka', 'namuna', 'buyurtma', 'og', 'files', 'index'];
const CARD_PHOTO_RE = '#^/files/photos/[a-z0-9]+\.[a-z]+$#';
const CARD_VCF_PHOTO = 300;

/** cards.json: ['designs'=>[], 'fields'=>[], 'limits'=>[]] */
function cards_registry(): array
{
    static $r = null;
    if ($r !== null) return $r;
    $file = __DIR__ . '/cards.json';
    $r = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
    $r += ['designs' => [], 'fields' => [], 'limits' => []];
    return $r;
}
function card_design_get(string $slug): ?array
{
    foreach (cards_registry()['designs'] as $d) if (($d['slug'] ?? '') === $slug) return $d;
    return null;
}
function card_design_active(string $slug): ?array { $d = card_design_get($slug); return $d && !empty($d['active']) ? $d : null; }
function card_fields(): array { return cards_registry()['fields']; }
function card_field(string $key): ?array
{
    foreach (card_fields() as $f) if ($f['key'] === $key) return $f;
    return null;
}
function card_limit(string $k, int $def): int { return (int)(cards_registry()['limits'][$k] ?? $def); }
function is_card_order(?array $o): bool { return $o && ($o['product'] ?? 'taklifnoma') === 'vizitka'; }

/* ───────────── Yaratish / yuklash / egalik ───────────── */

function card_create_draft(string $design, ?array $owner = null): string
{
    $d = card_design_active($design) ?? fail('Dizayn topilmadi', 404);
    $user = $owner ?? current_user();
    $guest = $user ? null : guest_token(true);
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $next = (int)scalar('SELECT COALESCE(MAX(seq), 123) + 1 FROM orders');
        $id = new_id();
        try {
            db()->beginTransaction();
            q("INSERT INTO orders (id, seq, code, user_id, guest_token, template_slug, amount, status, product) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'vizitka')", [
                $id, $next, sprintf('SH-%05d', $next), $user['id'] ?? null, $guest, $d['slug'], tpl_price($d),
            ]);
            q('INSERT INTO cards (id, order_id, slug, full_name, phone, telegram, photos, data, lead_form) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)', [
                new_id(), $id, 'qoralama-' . substr($id, 0, 10), (string)($user['name'] ?? ''), $user['phone'] ?? null, $user['telegram_user'] ?? null, '[]', '{}',
            ]);
            db()->commit();
            return $id;
        } catch (PDOException $e) {
            if (db()->inTransaction()) db()->rollBack();
            if (str_contains($e->getMessage(), 'Duplicate') && $attempt < 4) continue;
            throw $e;
        }
    }
    fail('Buyurtma yaratilmadi', 500);
}

/** ['order'=>row, 'card'=>row, 'owner'=>row|null] — faqat vizitka buyurtmasi */
function card_load(string $orderId): ?array
{
    $o = one('SELECT * FROM orders WHERE id = ?', [$orderId]);
    if (!is_card_order($o)) return null;
    $c = one('SELECT * FROM cards WHERE order_id = ?', [$orderId]);
    if (!$c) return null;
    $owner = $o['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$o['user_id']]) : null;
    return ['order' => $o, 'card' => $c, 'owner' => $owner];
}

/** Egasi (user), admin yoki brauzer tokeni mos kelsa (owned_order bilan bir xil qoida) */
function owned_card(string $orderId): ?array
{
    $b = card_load($orderId);
    if (!$b) return null;
    $b['order'] = order_reprice($b['order']);
    $u = current_user();
    if ($u && ($b['order']['user_id'] === $u['id'] || $u['is_admin'])) return $b;
    $guest = $_COOKIE[GUEST_COOKIE] ?? '';
    if ($guest && $b['order']['guest_token'] && hash_equals($b['order']['guest_token'], $guest)) return $b;
    return null;
}
function owned_card_or_404(string $id): array { return owned_card($id) ?? fail('Vizitka topilmadi', 404); }

/** Ommaviy: faqat to‘langan (paid/active) */
function public_card(string $slug): ?array
{
    if (!preg_match(CARD_SLUG_RE, $slug)) return null;
    $c = one('SELECT * FROM cards WHERE slug = ?', [$slug]);
    if (!$c) return null;
    $o = one('SELECT * FROM orders WHERE id = ?', [$c['order_id']]);
    if (!is_card_order($o) || !is_paid_status($o['status'])) return null;
    return ['order' => $o, 'card' => $c];
}

/* ───────────── Chiqish (API formati) ───────────── */

function card_loc_out(mixed $v): array
{
    $out = ['uz' => ''];
    if (is_string($v)) $out['uz'] = $v;
    elseif (is_array($v)) foreach (CARD_LANGS as $l) if (isset($v[$l]) && is_string($v[$l]) && ($l === 'uz' || $v[$l] !== '')) $out[$l] = $v[$l];
    return $out;
}

/** cards qatori → CardContent */
function card_content(array $c): array
{
    $d = jdec($c['data'] ?? null) ?: [];
    // Ro‘yxat qatorlari: sxemadagi barcha ustunlar bilan (bo‘sh: "" yoki {uz:""}) — frontend tekshirmasdan o‘qiydi
    $lists = function (string $k) use ($d): array {
        $rows = is_array($d[$k] ?? null) ? array_values($d[$k]) : [];
        $f = card_field($k);
        if (!$f || empty($f['item'])) return $rows;
        return array_map(function ($row) use ($f) {
            $out = [];
            foreach ($f['item'] as $ck => $cf) $out[$ck] = !empty($cf['localized']) ? card_loc_out($row[$ck] ?? null) : (string)($row[$ck] ?? '');
            return $out;
        }, array_filter($rows, 'is_array'));
    };
    return [
        'fullName' => (string)$c['full_name'],
        'position' => card_loc_out($d['position'] ?? null),
        'company' => card_loc_out($d['company'] ?? null),
        'bio' => card_loc_out($d['bio'] ?? null),
        'phone' => (string)($c['phone'] ?? ''),
        'whatsapp' => (string)($d['whatsapp'] ?? ''),
        'email' => (string)($c['email'] ?? ''),
        'telegram' => (string)($c['telegram'] ?? ''),
        'website' => (string)($d['website'] ?? ''),
        'address' => card_loc_out($d['address'] ?? null),
        'mapUrl' => (string)($d['mapUrl'] ?? ''),
        'photos' => array_values(jdec($c['photos'] ?? null) ?: []),
        'logo' => $c['logo'] ?: null,
        'leadForm' => (bool)$c['lead_form'],
        'directions' => $lists('directions'),
        'stats' => $lists('stats'),
        'companies' => $lists('companies'),
        'socials' => $lists('socials'),
        'links' => $lists('links'),
    ];
}

function card_lead_counts(string $cardId): array
{
    $r = one("SELECT COUNT(*) AS total, SUM(status = 'new') AS fresh FROM card_leads WHERE card_id = ?", [$cardId]);
    return [(int)($r['total'] ?? 0), (int)($r['fresh'] ?? 0)];
}

function card_out(array $c, array $o): array
{
    [$total, $fresh] = card_lead_counts($c['id']);
    return ['id' => $c['id'], 'orderId' => $c['order_id'], 'slug' => $c['slug'], 'design' => $o['template_slug']] + card_content($c) + [
        'views' => (int)$c['views'],
        'vcfDownloads' => (int)$c['vcf_downloads'],
        'leadsTotal' => $total,
        'leadsNew' => $fresh,
        'createdAt' => iso($c['created_at']),
        'updatedAt' => iso($c['updated_at']),
    ];
}

function card_url(string $slug): string { return site_url() . "/v/$slug/"; }

function card_public_out(array $c, array $o): array
{
    return ['slug' => $c['slug'], 'design' => $o['template_slug']] + card_content($c) + [
        'url' => card_url($c['slug']),
        'vcardUrl' => '/api/c/' . $c['slug'] . '/vcard',
    ];
}

function card_order_info(array $o): array
{
    return [
        'id' => $o['id'], 'code' => $o['code'], 'status' => $o['status'], 'amount' => (int)$o['amount'],
        'promoCode' => $o['promo_code'] ?? null, 'promoDiscount' => (int)($o['promo_discount'] ?? 0),
        'paidAt' => iso($o['paid_at']), 'createdAt' => iso($o['created_at']), 'updatedAt' => iso($o['updated_at']),
    ];
}

/** Kabinet/admin ro‘yxati qatori (CardOrder) */
function card_order_row(array $o, array $c): array
{
    [$total, $fresh] = card_lead_counts($c['id']);
    $d = jdec($c['data'] ?? null) ?: [];
    $photos = jdec($c['photos'] ?? null) ?: [];
    return [
        'id' => $o['id'], 'code' => $o['code'], 'status' => $o['status'], 'amount' => (int)$o['amount'],
        'design' => $o['template_slug'], 'slug' => $c['slug'], 'fullName' => (string)$c['full_name'],
        'position' => card_loc_out($d['position'] ?? null), 'photo' => $photos[0] ?? null,
        'views' => (int)$c['views'], 'vcfDownloads' => (int)$c['vcf_downloads'], 'leadsTotal' => $total, 'leadsNew' => $fresh,
        'paidAt' => iso($o['paid_at']), 'createdAt' => iso($o['created_at']),
    ];
}

function card_lead_out(array $l): array
{
    return [
        'id' => $l['id'], 'name' => $l['name'], 'company' => $l['company'], 'contact' => $l['contact'],
        'purpose' => $l['purpose'], 'message' => $l['message'], 'status' => $l['status'], 'createdAt' => iso($l['created_at']),
    ];
}

/** Admin/kabinet ro‘yxatlari uchun qisqa ma’lumot (taklifnoma ro‘yxatlariga `card` kaliti) */
function card_brief(string $orderId): ?array
{
    $c = one('SELECT slug, full_name, photos FROM cards WHERE order_id = ?', [$orderId]);
    if (!$c) return null;
    $photos = jdec($c['photos'] ?? null) ?: [];
    return ['slug' => $c['slug'], 'fullName' => (string)$c['full_name'], 'photo' => $photos[0] ?? null];
}

/* ───────────── Tekshiruv (CARD_FIELDS sxemasi bo‘yicha) ───────────── */

/** URL: sxemasiz domen kiritilsa https:// qo‘shiladi; faqat http(s) */
function card_norm_url(string $v, string $label): string
{
    if ($v === '') return '';
    if (!preg_match('#^[a-z][a-z0-9+.-]*:#i', $v) && preg_match('#^[^\s/]+\.[^\s]+$#u', $v)) $v = 'https://' . $v;
    if (!preg_match('#^https?://[^\s<>"]+$#i', $v)) fail("«{$label}»: havola noto‘g‘ri (https://… )", 422);
    return $v;
}

function card_norm_telegram(string $v, string $label): string
{
    if ($v === '') return '';
    if (preg_match('#(?:t(?:elegram)?\.me)/([A-Za-z0-9_]+)#', $v, $m)) $v = $m[1];
    $v = ltrim($v, '@');
    if (!preg_match('/^[A-Za-z0-9_]{3,32}$/', $v)) fail("«{$label}»: Telegram nomi noto‘g‘ri (masalan, @username)", 422);
    return '@' . $v;
}

/**
 * Bitta qiymatni tozalash. Localized bo‘lsa — ['uz'=>…, 'ru'=>…, 'en'=>…] (bo‘sh ru/en tashlanadi).
 * $strict=false (qoralama): noto‘g‘ri qiymat — bo‘sh.
 */
function card_clean_value(mixed $v, array $f, string $label, bool $strict): mixed
{
    $type = $f['type'];
    $max = (int)($f['max'] ?? ($type === 'textarea' ? 1000 : 160));
    $str = function (mixed $x) use ($max, $label, $strict): string {
        $s = is_scalar($x) ? trim(str_replace("\r", '', (string)$x)) : '';
        if (mb_strlen($s) > $max) {
            if ($strict) fail("«{$label}»: ko‘pi bilan $max belgi", 422);
            $s = mb_substr($s, 0, $max);
        }
        return $s;
    };
    if (!empty($f['localized'])) {
        $in = is_array($v) ? $v : ['uz' => $v];
        $out = ['uz' => $str($in['uz'] ?? '')];
        foreach (['ru', 'en'] as $l) {
            $s = $str($in[$l] ?? '');
            if ($s !== '') $out[$l] = $s;
        }
        return $out;
    }
    if ($type === 'toggle') return (bool)$v;
    $s = $str($v);
    if ($s === '') return '';
    try {
        return match ($type) {
            'tel' => normalize_phone($s) ?? fail("«{$label}»: telefon raqam to‘liq emas", 422),
            'email' => filter_var($s, FILTER_VALIDATE_EMAIL) ? $s : fail("«{$label}»: email noto‘g‘ri", 422),
            'url' => card_norm_url($s, $label),
            'select' => in_array($s, $f['options'] ?? [], true) ? $s : fail("«{$label}»: ro‘yxatdan tanlang", 422),
            default => $s,
        };
    } catch (HttpError $e) {
        if ($strict) throw $e;
        return '';
    }
}

function card_value_empty(mixed $v): bool
{
    if (is_array($v)) { foreach ($v as $x) if (!card_value_empty($x)) return false; return true; }
    return $v === '' || $v === null || $v === false;
}

/** Ro‘yxat (directions/stats/…) — qatorlar soni, ustunlar; strict bo‘lsa majburiy ustunlar */
function card_clean_list(mixed $rows, array $f, bool $strict): array
{
    if (!is_array($rows)) fail("«{$f['label']}»: ma’lumot noto‘g‘ri", 422);
    $rows = array_values($rows);
    if (count($rows) > (int)$f['max']) fail("«{$f['label']}»: ko‘pi bilan {$f['max']} ta", 422);
    $out = [];
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        $r = [];
        foreach ($f['item'] as $ck => $cf) {
            $val = card_clean_value($row[$ck] ?? '', $cf, $cf['label'], $strict);
            // ixtiyoriy bo‘sh ustunlar saqlanmaydi; majburiy localized — {uz:""} bo‘lib qoladi (forma ko‘rsatadi)
            if (!card_value_empty($val) || (!empty($cf['localized']) && !empty($cf['required']))) $r[$ck] = $val;
        }
        if (card_value_empty($r)) continue;
        if ($strict) {
            foreach ($f['item'] as $ck => $cf) {
                if (!empty($cf['required']) && card_value_empty(!empty($cf['localized']) ? ($r[$ck]['uz'] ?? '') : ($r[$ck] ?? ''))) fail("«{$f['label']}»: «{$cf['label']}» ni to‘ldiring", 422);
            }
        }
        $out[] = $r;
    }
    if ($strict && count($out) < (int)($f['min'] ?? 0)) fail("«{$f['label']}»: kamida {$f['min']} ta", 422);
    return $out;
}

/**
 * PATCH maydonlari → ustun / data yangilanishi. $p — faqat sxemadagi kalitlar (+ design, slug).
 * $strict=false: ro‘yxatlarda chala qatorlar saqlanadi, noto‘g‘ri ustun bo‘sh qoladi.
 * Qaytaradi: yangilangan cards qatori.
 */
function card_apply_patch(array $b, array $p, bool $strict = true): array
{
    $c = $b['card'];
    $o = $b['order'];
    $set = [];
    $data = jdec($c['data'] ?? null) ?: [];
    $dataChanged = false;

    if (array_key_exists('design', $p)) {
        $d = is_string($p['design']) ? card_design_active($p['design']) : null;
        if (!$d) fail('Dizayn topilmadi', 422);
        if ($d['slug'] !== $o['template_slug']) {
            if (is_paid_status($o['status'])) fail('To‘lovdan so‘ng dizaynni almashtirib bo‘lmaydi', 409);
            q('UPDATE orders SET template_slug = ?, amount = ?, promo_code = NULL, promo_discount = 0 WHERE id = ?', [$d['slug'], tpl_price($d), $o['id']]);
        }
        unset($p['design']);
    }
    if (array_key_exists('slug', $p)) {
        if (!is_paid_status($o['status'])) fail('Havola manzili to‘lovdan so‘ng beriladi', 422);
        $s = slugify((string)$p['slug']);
        if (strlen($s) < 3) fail('Havola kamida 3 ta belgidan iborat bo‘lsin', 422);
        $u = card_unique_slug($s, $c['id']);
        if ($u !== $s) fail("Bu manzil band. Masalan: $u", 422);
        $set['slug'] = $s;
        unset($p['slug']);
    }

    foreach ($p as $k => $v) {
        $f = card_field((string)$k);
        if (!$f) fail('Noma’lum maydon: ' . $k, 422);
        if ($k === 'photos') {
            $max = card_limit('photos', 6);
            if (!is_array($v) || count($v) > $max) fail("Ko‘pi bilan $max ta rasm", 422);
            foreach ($v as $u) if (!is_string($u) || !preg_match(CARD_PHOTO_RE, $u)) fail('Rasm noto‘g‘ri', 422);
            $set['photos'] = json_encode(array_values($v));
            continue;
        }
        if ($k === 'logo') {
            if ($v !== null && $v !== '' && !(is_string($v) && preg_match(CARD_PHOTO_RE, $v))) fail('Logotip noto‘g‘ri', 422);
            $set['logo'] = $v ?: null;
            continue;
        }
        if ($f['type'] === 'list') {
            $data[$k] = card_clean_list($v, $f, $strict);
            $dataChanged = true;
            continue;
        }
        $val = $k === 'telegram' ? card_norm_telegram(card_clean_value($v, ['type' => 'text'] + $f, $f['label'], true), $f['label'])
            : card_clean_value($v, $f, $f['label'], true);
        $req = !empty($f['required']) && (!empty($f['localized']) ? $val['uz'] === '' : $val === '');
        if ($req && $strict) fail("«{$f['label']}» ni to‘ldiring", 422);
        match ($k) {
            'fullName' => $set['full_name'] = $val,
            'phone' => $set['phone'] = $val ?: null,
            'email' => $set['email'] = $val ?: null,
            'telegram' => $set['telegram'] = $val ?: null,
            'leadForm' => $set['lead_form'] = $val ? 1 : 0,
            default => null,
        };
        if (in_array($k, CARD_DATA_KEYS, true)) {
            if (card_value_empty($val)) unset($data[$k]);
            else $data[$k] = $val;
            $dataChanged = true;
        }
    }
    if ($dataChanged) $set['data'] = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($set) {
        $set['updated_at'] = now_utc();
        $cols = implode(', ', array_map(fn($col) => "`$col` = ?", array_keys($set)));
        q("UPDATE cards SET $cols WHERE id = ?", [...array_values($set), $c['id']]);
    }
    return one('SELECT * FROM cards WHERE id = ?', [$c['id']]);
}

/** To‘lovdan oldin to‘ldirilishi shart maydonlar (faqat shu dizayn bo‘limlari) */
function card_missing(array $c, string $design): array
{
    $d = card_design_get($design);
    $sections = $d['sections'] ?? [];
    $content = card_content($c);
    $m = [];
    foreach (card_fields() as $f) {
        if (!empty($f['section']) && !in_array($f['section'], $sections, true)) continue;
        $v = $content[$f['key']] ?? null;
        if ($f['type'] === 'list') {
            if (count((array)$v) < (int)($f['min'] ?? 0)) $m[] = $f['key'];
            foreach ((array)$v as $i => $row) {
                foreach ($f['item'] as $ck => $cf) {
                    if (empty($cf['required'])) continue;
                    $x = $row[$ck] ?? '';
                    if (!empty($cf['localized']) ? trim((string)($x['uz'] ?? '')) === '' : trim((string)$x) === '') $m[] = "{$f['key']}.$i.$ck";
                }
            }
            continue;
        }
        if (empty($f['required'])) continue;
        if (!empty($f['localized']) ? trim((string)($v['uz'] ?? '')) === '' : trim((string)$v) === '') $m[] = $f['key'];
    }
    return $m;
}

/* ───────────── Slug ───────────── */

function card_unique_slug(string $base, ?string $exceptCardId = null): string
{
    $root = slugify($base) ?: 'vizitka';
    if (strlen($root) < 2) $root = 'vizitka-' . $root;
    if (in_array($root, CARD_RESERVED_SLUGS, true) || str_starts_with($root, 'qoralama')) $root .= '-v';
    $taken = [];
    foreach (all('SELECT slug, id FROM cards WHERE slug LIKE ?', [$root . '%']) as $r) if ($r['id'] !== $exceptCardId) $taken[$r['slug']] = true;
    if (!isset($taken[$root])) return $root;
    for ($i = 2; ; $i++) if (!isset($taken["$root-$i"])) return "$root-$i";
}

/* ───────────── To‘lov tasdiqlandi (mark_order_paid ichidan chaqiriladi) ───────────── */

function card_mark_paid(string $orderId, string $provider, ?string $paymentId = null): void
{
    $b = card_load($orderId);
    if (!$b || is_paid_status($b['order']['status'])) return;
    $o = $b['order'];
    $c = $b['card'];
    $slug = $c['slug'];
    if (str_starts_with($slug, 'qoralama-')) $slug = card_unique_slug((string)$c['full_name'], $c['id']);

    // Tushum — faqat haqiqiy to‘lovdan (mark_order_paid bilan bir xil qoida)
    $income = 0;
    if ($paymentId) {
        $pay = one('SELECT amount, external_id, meta FROM payments WHERE id = ?', [$paymentId]);
        $pm = json_decode((string)($pay['meta'] ?? ''), true) ?: [];
        if ($pay && !str_starts_with((string)$pay['external_id'], 'sandbox-') && empty($pm['test'])) $income = (int)$pay['amount'];
    }
    q("UPDATE orders SET status = 'active', paid_at = UTC_TIMESTAMP(), income = ? WHERE id = ?", [$income, $orderId]);
    if (!empty($o['promo_code'])) q('UPDATE promo_codes SET used = used + 1 WHERE code = ?', [$o['promo_code']]);
    q('UPDATE cards SET slug = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [$slug, $c['id']]);
    if ($paymentId) q("UPDATE payments SET status = 'paid', paid_at = UTC_TIMESTAMP() WHERE id = ?", [$paymentId]);

    $owner = $b['owner'];
    if (!$owner && $c['phone']) {
        $owner = find_or_create_user_by_phone($c['phone']);
        q('UPDATE orders SET user_id = ? WHERE id = ?', [$owner['id'], $orderId]);
    }
    notif_add($owner['id'] ?? null, null, 'pay_ok', $paymentId, ['code' => $o['code'], 'amount' => (int)$o['amount'], 'slug' => $slug, 'product' => 'vizitka', 'orderId' => $orderId]);
    $link = preg_replace('#^https?://#', '', site_url()) . "/v/$slug/";
    $text = "Vizitkangiz tayyor: $link";
    $phone = $owner['phone'] ?? $c['phone'];
    try {
        if ($phone) send_sms($phone, "Shohnoma: $text");
        notify_user($owner['telegram_id'] ?? null, "✅ To‘lov qabul qilindi. $text");
        $d = card_design_get($o['template_slug']);
        notify_admin(sprintf("💳 To‘lov: %s · %s · %s\nVizitka · %s · %s\n%s\n%s", $o['code'], format_price((int)$o['amount']), strtoupper($provider),
            $d['name'] ?? $o['template_slug'], $c['full_name'] ?: '—', format_phone($phone), $link));
    } catch (Throwable $e) {
        error_log('[card_mark_paid notify] ' . $e->getMessage());
    }
}

/** Buyurtma o‘chirilganda (order_purge) — vizitka, murojaatlar, bildirishnomalar, rasmlar */
function card_purge(string $orderId): void
{
    $c = one('SELECT * FROM cards WHERE order_id = ?', [$orderId]);
    if (!$c) return;
    // vizitka bildirishnomalari (pay_ok, card_lead) — invitation_id yo‘q, payload.orderId bo‘yicha
    q("DELETE FROM notifications WHERE invitation_id IS NULL AND kind IN ('pay_ok', 'card_lead') AND payload LIKE ?", ['%"orderId":"' . $orderId . '"%']);
    q('DELETE FROM card_leads WHERE card_id = ?', [$c['id']]);
    foreach (array_merge(jdec($c['photos'] ?? null) ?: [], $c['logo'] ? [$c['logo']] : []) as $u) if (is_string($u)) delete_upload($u);
    q('DELETE FROM cards WHERE id = ?', [$c['id']]);
}

/* ───────────── vCard 3.0 (RFC 2426) ───────────── */

function vcf_escape(string $s): string
{
    return str_replace(["\\", "\n", ',', ';'], ["\\\\", "\\n", "\\,", "\\;"], str_replace("\r", '', $s));
}

/** 75 oktetdan uzun qatorlarni bukish (UTF-8 belgisini bo‘lmasdan), CRLF + bo‘shliq */
function vcf_fold(string $line): string
{
    if (strlen($line) <= 75) return $line;
    $out = '';
    $cur = '';
    $limit = 75;
    foreach (preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY) as $ch) {
        if (strlen($cur) + strlen($ch) > $limit) {
            $out .= $cur . "\r\n ";
            $cur = '';
            $limit = 74; // davom qatori boshidagi bo‘shliq ham hisobga kiradi
        }
        $cur .= $ch;
    }
    return $out . $cur;
}

/** Portret → 300×300 JPEG base64 (GD bo‘lmasa — kichik JPEG/PNG asl holicha) */
function vcf_photo(?string $url): ?array
{
    if (!$url || !preg_match('#^/files/photos/([a-z0-9]+\.[a-z]+)$#', $url, $m)) return null;
    $path = upload_root() . '/photos/' . $m[1];
    if (!is_file($path)) return null;
    $raw = (string)file_get_contents($path);
    if (function_exists('imagecreatefromstring')) {
        $im = @imagecreatefromstring($raw);
        if ($im) {
            $w = imagesx($im);
            $h = imagesy($im);
            $side = min($w, $h);
            // portret: yuqori qismdan (yuz odatda tepada) kvadrat
            $sx = (int)(($w - $side) / 2);
            $sy = $h > $w ? (int)(($h - $side) * 0.2) : 0;
            $dst = imagecreatetruecolor(CARD_VCF_PHOTO, CARD_VCF_PHOTO);
            imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
            imagecopyresampled($dst, $im, 0, 0, $sx, $sy, CARD_VCF_PHOTO, CARD_VCF_PHOTO, $side, $side);
            ob_start();
            imagejpeg($dst, null, 82);
            $jpg = (string)ob_get_clean();
            imagedestroy($im);
            imagedestroy($dst);
            if ($jpg !== '') return ['JPEG', base64_encode($jpg)];
        }
    }
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (strlen($raw) <= 200 * 1024 && in_array($ext, ['jpg', 'png'], true)) return [$ext === 'png' ? 'PNG' : 'JPEG', base64_encode($raw)];
    return null;
}

function card_vcard(array $c, string $lang = 'uz'): string
{
    $ct = card_content($c);
    $L = fn($v) => trim((string)(($v[$lang] ?? '') !== '' ? $v[$lang] : ($v['uz'] ?? '')));
    $name = trim($ct['fullName']) ?: 'Vizitka';
    $parts = preg_split('/\s+/u', $name);
    $family = count($parts) > 1 ? array_pop($parts) : '';
    $given = implode(' ', $parts);
    $lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    $lines[] = 'N;CHARSET=UTF-8:' . vcf_escape($family) . ';' . vcf_escape($given) . ';;;';
    $lines[] = 'FN;CHARSET=UTF-8:' . vcf_escape($name);
    if ($org = $L($ct['company'])) $lines[] = 'ORG;CHARSET=UTF-8:' . vcf_escape($org);
    if ($title = $L($ct['position'])) $lines[] = 'TITLE;CHARSET=UTF-8:' . vcf_escape($title);
    if ($ct['phone']) $lines[] = 'TEL;TYPE=CELL,VOICE:' . $ct['phone'];
    if ($ct['whatsapp'] && $ct['whatsapp'] !== $ct['phone']) $lines[] = 'TEL;TYPE=CELL:' . $ct['whatsapp'];
    if ($ct['email']) $lines[] = 'EMAIL;TYPE=INTERNET,PREF:' . vcf_escape($ct['email']);
    $uri = fn(string $u) => preg_replace('/[\r\n\s]+/', '', $u); // URI qiymati — escape qilinmaydi (RFC 2426 §5)
    $lines[] = 'URL:' . $uri(card_url($c['slug']));
    if ($ct['website']) $lines[] = 'URL;TYPE=WORK:' . $uri($ct['website']);
    if ($addr = $L($ct['address'])) $lines[] = 'ADR;TYPE=WORK;CHARSET=UTF-8:;;' . vcf_escape($addr) . ';;;;';
    $profiles = [];
    if ($ct['telegram']) $profiles['https://t.me/' . ltrim($ct['telegram'], '@')] = 'telegram';
    foreach ($ct['socials'] as $s) {
        if (empty($s['url']) || ($s['kind'] ?? '') === 'website') continue;
        $profiles[$s['url']] ??= preg_replace('/[^a-z]/', '', (string)$s['kind']);
    }
    foreach ($profiles as $u => $kind) $lines[] = "X-SOCIALPROFILE;TYPE=$kind:" . $uri((string)$u);
    if ($note = $L($ct['bio'])) $lines[] = 'NOTE;CHARSET=UTF-8:' . vcf_escape($note);
    if ($ph = vcf_photo($ct['photos'][0] ?? null)) $lines[] = "PHOTO;ENCODING=b;TYPE={$ph[0]}:{$ph[1]}";
    $lines[] = 'REV:' . gmdate('Ymd\THis\Z', strtotime((string)$c['updated_at'] . ' UTC') ?: time());
    $lines[] = 'END:VCARD';
    return implode("\r\n", array_map('vcf_fold', $lines)) . "\r\n";
}
