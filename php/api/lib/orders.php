<?php
declare(strict_types=1);

const DEFAULT_MESSAGE = 'Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.';
const DEFAULT_PROGRAM = [
    'nikoh' => [['time' => '17:00', 'title' => 'Mehmonlarni kutib olish'], ['time' => '18:00', 'title' => 'Nikoh marosimi'], ['time' => '19:30', 'title' => 'Bazm va tabriklar'], ['time' => '22:00', 'title' => 'Kelin-kuyov raqsi']],
    'fotiha' => [['time' => '16:00', 'title' => 'Mehmonlarni kutib olish'], ['time' => '16:30', 'title' => 'Fotiha marosimi'], ['time' => '18:00', 'title' => 'Dasturxon va tabriklar']],
    'sunnat' => [['time' => '10:00', 'title' => 'Mehmonlarni kutib olish'], ['time' => '11:00', 'title' => 'Osh va tabriklar'], ['time' => '13:00', 'title' => 'Bazm']],
    'tugilgan-kun' => [['time' => '19:00', 'title' => 'Mehmonlarni kutib olish'], ['time' => '19:30', 'title' => 'Tabriklar va tort'], ['time' => '21:00', 'title' => 'Bazm']],
];
const RESERVED_SLUGS = ['shablonlar', 'buyurtma', 'kirish', 'kabinet', 'admin', 'api', 'maxsus-dizayn', 'files', 'i', 'ru', 'uz', 'en', '_next', 'robots-txt', 'sitemap-xml', 'favicon-ico', 'shartlar', 'maxfiylik', 'tolov', 'namuna', 'og', '404', 'music', 'invite'];

function is_paid_status(string $s): bool { return $s === 'paid' || $s === 'active'; }

function slugify(string $s): string
{
    $s = mb_strtolower($s, 'UTF-8');
    $s = preg_replace("/[‘’'`ʻʼ]/u", '', $s);
    $s = str_replace('&', '-', $s);
    if (class_exists('Normalizer')) $s = Normalizer::normalize($s, Normalizer::FORM_KD) ?: $s;
    $s = preg_replace('/\p{Mn}/u', '', $s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return substr(trim($s, '-'), 0, 60);
}

function unique_slug(string $base, ?string $exceptInvitationId = null): string
{
    $root = slugify($base) ?: 'taklifnoma';
    if (in_array($root, RESERVED_SLUGS, true)) $root .= '-toy';
    $rows = all('SELECT slug, id FROM invitations WHERE slug LIKE ?', [$root . '%']);
    $taken = [];
    foreach ($rows as $r) if ($r['id'] !== $exceptInvitationId) $taken[$r['slug']] = true;
    if (!isset($taken[$root])) return $root;
    for ($i = 2; ; $i++) if (!isset($taken["$root-$i"])) return "$root-$i";
}

function create_draft_order(string $templateSlug, ?array $owner = null, ?int $amount = null): string
{
    $t = template_get($templateSlug) ?? fail('Shablon topilmadi', 404);
    $user = $owner ?? current_user();
    $guest = $user ? null : guest_token(true);
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $next = (int)scalar('SELECT COALESCE(MAX(seq), 123) + 1 FROM orders');
        $id = new_id();
        try {
            db()->beginTransaction();
            q('INSERT INTO orders (id, seq, code, user_id, guest_token, template_slug, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                $id, $next, sprintf('SH-%05d', $next), $user['id'] ?? null, $guest, $templateSlug, $amount ?? tpl_price($t), 'draft',
            ]);
            q('INSERT INTO invitations (id, order_id, slug, ceremony, message, program, photos, contact_phone, contact_tg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                new_id(), $id, 'qoralama-' . substr($id, 0, 10), $t['ceremony'], DEFAULT_MESSAGE,
                json_encode(DEFAULT_PROGRAM[$t['ceremony']] ?? [], JSON_UNESCAPED_UNICODE), '[]', $user['phone'] ?? null, $user['telegram_user'] ?? null,
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

/** ['order'=>row, 'invitation'=>row, 'owner'=>row|null] */
function load_order(string $orderId): ?array
{
    $o = one('SELECT * FROM orders WHERE id = ?', [$orderId]);
    if (!$o) return null;
    $i = one('SELECT * FROM invitations WHERE order_id = ?', [$orderId]);
    if (!$i) return null;
    $owner = $o['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$o['user_id']]) : null;
    return ['order' => $o, 'invitation' => $i, 'owner' => $owner];
}

/** Egasi (user), admin yoki brauzer tokeni mos kelsa */
function owned_order(string $orderId): ?array
{
    $b = load_order($orderId);
    if (!$b) return null;
    $b['order'] = order_reprice($b['order']);
    $u = current_user();
    if ($u && ($b['order']['user_id'] === $u['id'] || $u['is_admin'])) return $b;
    $guest = $_COOKIE[GUEST_COOKIE] ?? '';
    if ($guest && $b['order']['guest_token'] && hash_equals($b['order']['guest_token'], $guest)) return $b;
    return null;
}
function owned_order_or_404(string $id): array { return owned_order($id) ?? fail('Buyurtma topilmadi', 404); }

function missing_fields(array $inv): array
{
    $m = [];
    if (!$inv['person_a']) $m[] = 'personA';
    if (in_array($inv['ceremony'], ['nikoh', 'fotiha'], true) && !$inv['person_b']) $m[] = 'personB';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', (string)$inv['date'])) $m[] = 'date';
    if (!$inv['venue_name']) $m[] = 'venueName';
    if (!$inv['address']) $m[] = 'address';
    // HTML shablonning majburiy qo‘shimcha maydonlari
    $o = one('SELECT template_slug FROM orders WHERE id = ?', [$inv['order_id']]);
    $t = $o ? template_get($o['template_slug']) : null;
    if ($t && !empty($t['fields'])) {
        $extra = jdec($inv['extra'] ?? null) ?: [];
        foreach ($t['fields'] as $f) {
            $v = $extra[$f['key']] ?? null;
            $min = (int)($f['min'] ?? 0);
            $missing = $f['type'] === 'list' ? ($min > 0 && count((array)$v) < $min) : (!empty($f['required']) && trim((string)$v) === '');
            // qoralamada chala qatorlar ham saqlanadi — majburiy ustuni bo‘sh qator bo‘lsa, ma’lumot hali to‘liq emas
            if ($f['type'] === 'list' && !$missing) {
                foreach ((array)$v as $row) {
                    foreach ($f['item'] ?? [] as $ck => $cf) {
                        if (!empty($cf['required']) && trim((string)(is_array($row) ? ($row[$ck] ?? '') : '')) === '') $missing = true;
                    }
                }
            }
            if ($missing) $m[] = 'extra.' . $f['key'];
        }
    }
    return $m;
}

function latest_payment(string $orderId): ?array
{
    return one('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [$orderId]);
}

/** Taklifnoma maydonlarini qisman yangilash (spec 02/03, kabinet tahrirlash) */
/** @param bool $draft qoralama: ro‘yxatdagi to‘liq bo‘lmagan qatorlar ham saqlanadi (majburiy ustunlar keyin tekshiriladi) */
function apply_invitation_patch(array $b, array $p, bool $draft = false): array
{
    $inv = $b['invitation'];
    $set = [];
    $time = fn($v) => is_string($v) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v);
    $date = fn($v) => is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v);

    if (array_key_exists('ceremony', $p)) {
        if (!in_array($p['ceremony'], ['nikoh', 'fotiha', 'sunnat', 'tugilgan-kun'], true)) fail('Marosim turini tanlang', 422);
        $set['ceremony'] = $p['ceremony'];
    }
    foreach (['personA' => ['person_a', 80], 'venueName' => ['venue_name', 160], 'address' => ['address', 200]] as $k => [$col, $max]) {
        if (!array_key_exists($k, $p)) continue;
        if (!is_string($p[$k] ?? '')) fail('Ma’lumot noto‘g‘ri', 422);
        if (mb_strlen(trim((string)$p[$k])) > $max) fail("Matn juda uzun (ko‘pi bilan $max belgi)", 422);
        $set[$col] = trim((string)$p[$k]);
    }
    if (array_key_exists('personB', $p)) {
        if (mb_strlen(trim((string)$p['personB'])) > 80) fail('Matn juda uzun (ko‘pi bilan 80 belgi)', 422);
        $set['person_b'] = trim((string)($p['personB'] ?? '')) ?: null;
    }
    if (array_key_exists('day', $p) || array_key_exists('time', $p)) {
        if (array_key_exists('day', $p) && !$date($p['day'])) fail('Sanani kiriting', 422);
        if (array_key_exists('time', $p) && !$time($p['time'])) fail('Vaqt noto‘g‘ri', 422);
        $parts = explode('T', (string)($inv['date'] ?: 'T'));
        $d0 = $parts[0] ?? '';
        $t0 = $parts[1] ?? '';
        $set['date'] = ($p['day'] ?? $d0) . 'T' . ($p['time'] ?? ($t0 ?: '18:00'));
    }
    if (array_key_exists('mapUrl', $p)) {
        $v = trim((string)($p['mapUrl'] ?? ''));
        if (mb_strlen($v) > 500) fail('Havola juda uzun', 422);
        if ($v && !preg_match('#^https?://#', $v)) fail('Havola https:// bilan boshlansin', 422);
        $set['map_url'] = $v ?: null;
    }
    if (array_key_exists('message', $p)) {
        $v = trim((string)($p['message'] ?? ''));
        if (mb_strlen($v) > 1000) fail('Matn juda uzun (ko‘pi bilan 1000 belgi)', 422);
        $set['message'] = $v;
    }
    if (array_key_exists('program', $p)) {
        if (!is_array($p['program']) || count($p['program']) > 12) fail('Dastur noto‘g‘ri', 422);
        $prog = [];
        foreach ($p['program'] as $it) {
            if (!is_array($it) || !$time($it['time'] ?? null)) fail('Vaqt noto‘g‘ri', 422);
            $title = trim((string)($it['title'] ?? ''));
            if ($title === '' || mb_strlen($title) > 120) fail('Dastur bandini to‘ldiring', 422);
            $prog[] = ['time' => $it['time'], 'title' => $title];
        }
        $set['program'] = json_encode($prog, JSON_UNESCAPED_UNICODE);
    }
    if (array_key_exists('extra', $p)) {
        $t = template_get($b['order']['template_slug']);
        $set['extra'] = json_encode(tpl_clean_extra($p['extra'], $t['fields'] ?? [], $draft ? (jdec($inv['extra'] ?? null) ?: []) : null), JSON_UNESCAPED_UNICODE);
    }
    if (array_key_exists('photos', $p)) {
        if (!is_array($p['photos']) || count($p['photos']) > 10) fail('Ko‘pi bilan 10 ta surat', 422);
        foreach ($p['photos'] as $u) if (!is_string($u) || !preg_match('#^/files/photos/[a-z0-9]+\.[a-z]+$#', $u)) fail('Surat noto‘g‘ri', 422);
        $set['photos'] = json_encode(array_values($p['photos']));
    }
    if (array_key_exists('musicTrack', $p)) {
        $mt = $p['musicTrack'];
        if ($mt !== null && $mt !== '' && !(is_string($mt) && one('SELECT id FROM music_tracks WHERE id = ? AND is_active = 1', [$mt]))) fail('Musiqa topilmadi', 422);
        $set['music_track'] = $mt ?: null;
    }
    foreach (['rsvpEnabled' => 'rsvp_enabled', 'musicEnabled' => 'music_enabled'] as $k => $col) {
        if (array_key_exists($k, $p)) $set[$col] = $p[$k] ? 1 : 0;
    }
    if (array_key_exists('rsvpDeadline', $p)) {
        if ($p['rsvpDeadline'] !== null && $p['rsvpDeadline'] !== '' && !$date($p['rsvpDeadline'])) fail('Sana noto‘g‘ri', 422);
        $set['rsvp_deadline'] = $p['rsvpDeadline'] ?: null;
    }
    if (array_key_exists('contactTg', $p)) {
        $v = trim((string)($p['contactTg'] ?? ''));
        if (mb_strlen($v) > 64) fail('Telegram nomi juda uzun', 422);
        $set['contact_tg'] = $v ? '@' . ltrim($v, '@') : null;
    }
    if (array_key_exists('contactPhone', $p)) {
        if ($p['contactPhone']) {
            $n = normalize_phone((string)$p['contactPhone']) ?? fail('Telefon raqam to‘liq emas', 422);
            $set['contact_phone'] = $n;
        } else $set['contact_phone'] = null;
    }
    if (array_key_exists('slug', $p)) {
        if (!is_paid_status($b['order']['status'])) fail('Havola manzili to‘lovdan so‘ng beriladi', 422);
        $s = slugify((string)$p['slug']);
        if (strlen($s) < 3) fail('Havola kamida 3 ta belgidan iborat bo‘lsin', 422);
        $u = unique_slug($s, $inv['id']);
        if ($u !== $s) fail("Bu manzil band. Masalan: $u", 422);
        $set['slug'] = $s;
    }

    if ($set) {
        $cols = implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($set)));
        q("UPDATE invitations SET $cols WHERE id = ?", [...array_values($set), $inv['id']]);
    }
    return one('SELECT * FROM invitations WHERE id = ?', [$inv['id']]);
}

/** To‘lov tasdiqlandi: havola, akkaunt, SMS/Telegram/admin xabari */
function mark_order_paid(string $orderId, string $provider, ?string $paymentId = null): void
{
    $b = load_order($orderId);
    if (!$b || is_paid_status($b['order']['status'])) return;
    $inv = $b['invitation'];
    $slug = $inv['slug'];
    if (str_starts_with($slug, 'qoralama-')) $slug = unique_slug(implode('-', array_filter([$inv['person_a'], $inv['person_b']])), $inv['id']);

    q("UPDATE orders SET status = 'active', paid_at = UTC_TIMESTAMP() WHERE id = ?", [$orderId]);
    if (!empty($b['order']['promo_code'])) q('UPDATE promo_codes SET used = used + 1 WHERE code = ?', [$b['order']['promo_code']]);
    q('UPDATE invitations SET slug = ? WHERE id = ?', [$slug, $inv['id']]);
    if ($paymentId) q("UPDATE payments SET status = 'paid', paid_at = UTC_TIMESTAMP() WHERE id = ?", [$paymentId]);

    $owner = $b['owner'];
    if (!$owner && $inv['contact_phone']) {
        $owner = find_or_create_user_by_phone($inv['contact_phone']);
        q('UPDATE orders SET user_id = ? WHERE id = ?', [$owner['id'], $orderId]);
    }
    notif_add($owner['id'] ?? null, $inv['id'], 'pay_ok', $paymentId, ['code' => $b['order']['code'], 'amount' => (int)$b['order']['amount'], 'slug' => $slug]);
    $link = preg_replace('#^https?://#', '', site_url()) . '/' . $slug;
    $text = "Taklifnomangiz tayyor: $link";
    $phone = $owner['phone'] ?? $inv['contact_phone'];
    try {
        if ($phone) send_sms($phone, "Shohnoma: $text");
        notify_user($owner['telegram_id'] ?? null, "✅ To‘lov qabul qilindi. $text");
        $t = template_get($b['order']['template_slug']);
        notify_admin(sprintf("💳 To‘lov: %s · %s · %s\n%s · %s\n%s\n%s", $b['order']['code'], format_price((int)$b['order']['amount']), strtoupper($provider),
            $t['name'] ?? $b['order']['template_slug'], ceremony_label($inv['ceremony']), format_phone($phone), $link));
    } catch (Throwable $e) {
        error_log('[mark_order_paid notify] ' . $e->getMessage());
    }
}

/** Taklifnoma statistikasi: kishi soni yig‘indisi */
function invitation_stats(string $invitationId): array
{
    $rows = all('SELECT status, SUM(`count`) AS people, COUNT(*) AS n FROM guest_responses WHERE invitation_id = ? GROUP BY status', [$invitationId]);
    $by = [];
    $cnt = [];
    $responses = 0;
    foreach ($rows as $r) {
        $by[$r['status']] = (int)$r['people'];
        $cnt[$r['status']] = (int)$r['n'];
        $responses += (int)$r['n'];
    }
    $c = $by['coming'] ?? 0;
    $m = $by['maybe'] ?? 0;
    $n = $by['not_coming'] ?? 0;
    // coming/maybe/notComing — kishilar soni; responsesBy — javoblar soni (filtr chiplari uchun)
    return ['coming' => $c, 'maybe' => $m, 'notComing' => $n, 'total' => $c + $m + $n, 'responses' => $responses,
        'responsesBy' => ['coming' => $cnt['coming'] ?? 0, 'maybe' => $cnt['maybe'] ?? 0, 'notComing' => $cnt['not_coming'] ?? 0]];
}
