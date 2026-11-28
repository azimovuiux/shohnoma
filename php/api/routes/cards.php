<?php
declare(strict_types=1);

/*
 * «Vizitka» API (shartnoma: src/lib/cardTypes.ts → CARD_API). :id — buyurtma (orders.id).
 * To‘lov, promokod, holat — taklifnoma bilan umumiy yordamchilar (start_payment, promo_*, rahmat_sync, mark_order_paid).
 */

const CARD_PROMO_STATUSES = ['draft', 'pending_payment', 'payment_failed', 'p2p_rejected'];

function card_get_payload(array $b): array
{
    $pay = latest_payment($b['order']['id']);
    return ['ok' => true, 'order' => card_order_info($b['order']), 'card' => card_out($b['card'], $b['order']),
        'payment' => $pay ? payment_out($pay) : null, 'missing' => card_missing($b['card'], $b['order']['template_slug'])];
}

route('POST', '/cards', function () {
    $design = body()['design'] ?? '';
    if (!is_string($design) || !card_design_active($design)) fail('Dizayn topilmadi', 404);
    if (rate_limited('order:' . client_ip(), 20, 3600)) fail('Juda ko‘p urinish', 429);
    json_out(['ok' => true, 'id' => card_create_draft($design)]);
});

route('GET', '/cards/:id', function ($p) {
    json_out(card_get_payload(owned_card_or_404($p['id'])));
});

route('PATCH', '/cards/:id', function ($p) {
    $b = owned_card_or_404($p['id']);
    if ($b['order']['status'] === 'archived') fail('Vizitka o‘chirilgan', 409);
    $body = body();
    // Qoralama (avtosaqlash): xato maydon butun so‘rovni yiqitmaydi — `skipped` ga tushadi, qolganlari saqlanadi
    $draft = !empty($body['_draft']);
    unset($body['_draft']);
    if (!$body && !$draft) fail('Ma’lumot yo‘q');
    $card = $b['card'];
    $skipped = [];
    if ($draft) {
        foreach ($body as $k => $v) {
            try {
                $card = card_apply_patch($b, [$k => $v], false);
                $b['card'] = $card;
                if ($k === 'design') $b['order'] = one('SELECT * FROM orders WHERE id = ?', [$b['order']['id']]);
            } catch (HttpError $e) {
                if ($e->status !== 422) throw $e;
                $skipped[] = (string)$k;
            }
        }
    } else {
        $card = card_apply_patch($b, $body, true);
    }
    $o = one('SELECT * FROM orders WHERE id = ?', [$b['order']['id']]);
    $out = ['ok' => true, 'card' => card_out($card, $o), 'missing' => card_missing($card, $o['template_slug'])];
    if ($draft) $out['skipped'] = $skipped;
    json_out($out);
});

/** Faqat rasm (save_upload PDF ham qabul qiladi — vizitkada kerak emas) */
function card_save_image(): string
{
    $url = save_upload($_FILES['file'] ?? null, 'photos');
    if (str_ends_with($url, '.pdf')) {
        delete_upload($url);
        fail('Faqat rasm yuklang (JPG, PNG, WEBP)', 422);
    }
    return $url;
}

/* ── Rasmlar: file (+ slot — o‘sha o‘rindagi rasm almashtiriladi; kind=logo — logotip) ── */
route('POST', '/cards/:id/photos', function ($p) {
    $b = owned_card_or_404($p['id']);
    $c = $b['card'];
    $photos = jdec($c['photos'] ?? null) ?: [];
    if (($_POST['kind'] ?? '') === 'logo') {
        $url = card_save_image();
        if ($c['logo']) delete_upload($c['logo']);
        q('UPDATE cards SET logo = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [$url, $c['id']]);
        json_out(['ok' => true, 'url' => $url, 'photos' => $photos, 'logo' => $url]);
    }
    $max = card_limit('photos', 6);
    $slot = isset($_POST['slot']) && is_numeric($_POST['slot']) ? (int)$_POST['slot'] : -1;
    $replace = $slot >= 0 && $slot < count($photos);
    if (!$replace && count($photos) >= $max) fail("Ko‘pi bilan $max ta rasm", 422);
    $url = card_save_image();
    if ($replace) {
        $old = $photos[$slot];
        $photos[$slot] = $url;
        delete_upload($old);
    } else {
        $photos[] = $url;
    }
    q('UPDATE cards SET photos = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [json_encode(array_values($photos)), $c['id']]);
    json_out(['ok' => true, 'url' => $url, 'photos' => array_values($photos), 'logo' => $c['logo'] ?: null]);
});

route('DELETE', '/cards/:id/photos', function ($p) {
    $b = owned_card_or_404($p['id']);
    $c = $b['card'];
    $url = (string)(body()['url'] ?? '');
    $photos = array_values(array_filter(jdec($c['photos'] ?? null) ?: [], fn($x) => $x !== $url));
    $logo = $c['logo'] === $url ? null : ($c['logo'] ?: null);
    q('UPDATE cards SET photos = ?, logo = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [json_encode($photos), $logo, $c['id']]);
    if ($url && preg_match(CARD_PHOTO_RE, $url)) delete_upload($url);
    json_out(['ok' => true, 'photos' => $photos, 'logo' => $logo]);
});

/* ── Promokod ── */
route('POST', '/cards/:id/promo', function ($p) {
    $o = owned_card_or_404($p['id'])['order'];
    if (!in_array($o['status'], CARD_PROMO_STATUSES, true)) fail('Bu bosqichda promokod qo‘llab bo‘lmaydi', 409);
    $promo = promo_find((string)(body()['code'] ?? ''));
    if (is_string($promo)) fail($promo, 422);
    $base = (int)$o['amount'] + (int)$o['promo_discount'];
    $disc = promo_discount($promo, $base);
    if ($disc <= 0) fail('Bu promokod ushbu buyurtmaga chegirma bermaydi', 422);
    q('UPDATE orders SET amount = ?, promo_code = ?, promo_discount = ? WHERE id = ?', [$base - $disc, $promo['code'], $disc, $o['id']]);
    json_out(['ok' => true, 'amount' => $base - $disc, 'promoCode' => $promo['code'], 'promoDiscount' => $disc]);
});

route('DELETE', '/cards/:id/promo', function ($p) {
    $o = owned_card_or_404($p['id'])['order'];
    if (!in_array($o['status'], CARD_PROMO_STATUSES, true)) fail('Bu bosqichda promokodni o‘zgartirib bo‘lmaydi', 409);
    $amount = (int)$o['amount'] + (int)$o['promo_discount'];
    q('UPDATE orders SET amount = ?, promo_code = NULL, promo_discount = 0 WHERE id = ?', [$amount, $o['id']]);
    json_out(['ok' => true, 'amount' => $amount]);
});

/* ── To‘lov ── */
route('POST', '/cards/:id/pay', function ($p) {
    $b = owned_card_or_404($p['id']);
    $id = $b['order']['id'];
    if (is_paid_status($b['order']['status'])) json_out(['ok' => true, 'url' => "/vizitka/buyurtma/$id/tayyor/"]);
    if (card_missing($b['card'], $b['order']['template_slug'])) fail('Avval vizitka ma’lumotlarini to‘ldiring', 422);
    $provider = body()['provider'] ?? '';
    if (!in_array($provider, enabled_providers(), true)) fail('Bu to‘lov usuli hozircha mavjud emas', 422);
    json_out(['ok' => true, 'url' => start_payment($b['order'], $provider)]);
});

route('GET', '/cards/:id/status', function ($p) {
    $b = owned_card_or_404($p['id']);
    $pay = latest_payment($b['order']['id']);
    if ($pay && $pay['provider'] === 'rahmat' && $pay['status'] === 'processing') {
        try { rahmat_sync($pay); } catch (Throwable $e) { error_log('[rahmat sync] ' . $e->getMessage()); }
        $b = owned_card_or_404($p['id']);
        $pay = latest_payment($b['order']['id']);
    }
    json_out(['ok' => true, 'status' => $b['order']['status'], 'slug' => $b['card']['slug'],
        'payment' => $pay ? ['provider' => $pay['provider'], 'status' => $pay['status'], 'note' => $pay['review_note']] : null]);
});

route('POST', '/cards/:id/sandbox', function ($p) {
    if (env('PAYMENTS_SANDBOX') !== '1') fail('Not found', 404);
    $b = owned_card_or_404($p['id']);
    $id = $b['order']['id'];
    $body = body();
    $provider = in_array($body['provider'] ?? '', ['payme', 'click', 'rahmat', 'google_pay', 'p2p'], true) ? $body['provider'] : 'payme';
    $pid = new_id();
    q("INSERT INTO payments (id, order_id, provider, amount, status, external_id) VALUES (?, ?, ?, ?, 'processing', ?)", [$pid, $id, $provider, (int)$b['order']['amount'], "sandbox-$pid"]);
    if (($body['result'] ?? '') === 'success') {
        mark_order_paid($id, $provider, $pid);
        json_out(['ok' => true, 'url' => "/vizitka/buyurtma/$id/tolov/qabul-qilindi/"]);
    }
    q("UPDATE payments SET status = 'failed' WHERE id = ?", [$pid]);
    q("UPDATE orders SET status = 'payment_failed' WHERE id = ?", [$id]);
    json_out(['ok' => true, 'url' => "/vizitka/buyurtma/$id/tolov/xato/"]);
});

/* ── Murojaatlar (egasi) ── */
route('GET', '/cards/:id/leads', function ($p) {
    $b = owned_card_or_404($p['id']);
    json_out(['ok' => true, 'leads' => array_map('card_lead_out', all('SELECT * FROM card_leads WHERE card_id = ? ORDER BY created_at DESC, id DESC LIMIT 500', [$b['card']['id']]))]);
});

route('PATCH', '/cards/:id/leads/:leadId', function ($p) {
    $b = owned_card_or_404($p['id']);
    $s = body()['status'] ?? '';
    if (!in_array($s, ['new', 'seen', 'done'], true)) fail('Holat noto‘g‘ri', 422);
    $l = one('SELECT id FROM card_leads WHERE id = ? AND card_id = ?', [$p['leadId'], $b['card']['id']]) ?? fail('Murojaat topilmadi', 404);
    q('UPDATE card_leads SET status = ? WHERE id = ?', [$s, $l['id']]);
    if ($s !== 'new' && $b['order']['user_id']) q("UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND kind = 'card_lead' AND ref_id = ? AND read_at IS NULL", [$b['order']['user_id'], $l['id']]);
    json_out(['ok' => true]);
});

/* ── Ommaviy ── */
route('GET', '/c/:slug', function ($p) {
    $r = public_card($p['slug']) ?? fail('Vizitka topilmadi', 404);
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $bot = function_exists('stat_is_bot') ? stat_is_bot($ua) : $ua === '';
    if (empty($_GET['nocount']) && !$bot) q('UPDATE cards SET views = views + 1 WHERE id = ?', [$r['card']['id']]);
    json_out(['ok' => true, 'card' => card_public_out($r['card'], $r['order'])]);
});

route('GET', '/c/:slug/vcard', function ($p) {
    $r = public_card($p['slug']) ?? fail('Vizitka topilmadi', 404);
    $lang = in_array($_GET['lang'] ?? '', CARD_LANGS, true) ? $_GET['lang'] : 'uz';
    $vcf = card_vcard($r['card'], $lang);
    q('UPDATE cards SET vcf_downloads = vcf_downloads + 1 WHERE id = ?', [$r['card']['id']]);
    $file = (slugify((string)$r['card']['full_name']) ?: $r['card']['slug']) . '.vcf';
    header('Content-Type: text/vcard; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $file . '"');
    header('Cache-Control: no-store');
    header('Content-Length: ' . strlen($vcf));
    echo $vcf;
    exit;
});

route('POST', '/c/:slug/lead', function ($p) {
    $r = public_card($p['slug']) ?? fail('Vizitka topilmadi', 404);
    $c = $r['card'];
    if (!$c['lead_form']) fail('Bu vizitkada murojaat formasi o‘chirilgan', 409);
    $b = body();
    // Honeypot: yashirin «website» maydoni to‘ldirilgan bo‘lsa — bot; jim muvaffaqiyat
    if (trim((string)($b['website'] ?? '')) !== '') json_out(['ok' => true]);
    $len = fn(string $k, int $max, string $label) => mb_strlen(trim((string)($b[$k] ?? ''))) > $max ? fail("«{$label}» juda uzun (ko‘pi bilan $max belgi)", 422) : trim(str_replace("\r", '', (string)($b[$k] ?? '')));
    $name = $len('name', card_limit('leadName', 80), 'Ismingiz');
    $company = $len('company', card_limit('leadCompany', 120), 'Kompaniya va lavozim');
    $contact = $len('contact', card_limit('leadContact', 120), 'Telefon yoki email');
    $purpose = $len('purpose', card_limit('leadPurpose', 40), 'Maqsad');
    $message = $len('message', card_limit('leadMessage', 1000), 'Xabar');
    if ($name === '') fail('Ismingizni kiriting', 422);
    if ($contact === '') fail('Telefon yoki email kiriting', 422);
    if (!normalize_phone($contact) && !filter_var($contact, FILTER_VALIDATE_EMAIL) && !preg_match('/^@?[A-Za-z0-9_]{4,32}$/', $contact)) fail('Telefon raqam, email yoki Telegram nomini kiriting', 422);
    if (rate_limited('card_lead:' . client_ip(), 5, 600) || rate_limited('card_lead:' . $c['id'] . ':' . client_ip(), 3, 3600)) fail('Juda ko‘p urinish. Birozdan so‘ng qayta yuboring.', 429);
    $contact = normalize_phone($contact) ?? $contact;
    $id = new_id();
    q('INSERT INTO card_leads (id, card_id, name, company, contact, purpose, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$id, $c['id'], $name, $company ?: null, $contact, $purpose ?: null, $message ?: null, 'new', now_utc()]);
    $ownerId = $r['order']['user_id'];
    notif_add($ownerId, null, 'card_lead', $id, ['name' => $name, 'contact' => $contact, 'purpose' => $purpose ?: null, 'orderId' => $r['order']['id'], 'slug' => $c['slug'], 'card' => $c['full_name']]);
    try {
        $owner = $ownerId ? one('SELECT telegram_id FROM users WHERE id = ?', [$ownerId]) : null;
        $msg = trim("📇 Vizitkangizdan yangi murojaat\n$name" . ($company ? " · $company" : '') . "\n$contact" . ($purpose ? "\nMaqsad: $purpose" : '') . ($message ? "\n\n" . mb_substr($message, 0, 500) : '')
            . "\n\n" . site_url() . "/kabinet/v/{$r['order']['id']}/");
        notify_user($owner['telegram_id'] ?? null, $msg);
    } catch (Throwable $e) {
        error_log('[card lead notify] ' . $e->getMessage());
    }
    json_out(['ok' => true]);
});

/* ── Kabinet / admin ro‘yxatlari ── */
route('GET', '/me/cards', function () {
    $u = require_user();
    $rows = all("SELECT o.*, c.id AS c_id FROM orders o JOIN cards c ON c.order_id = o.id WHERE o.user_id = ? AND o.product = 'vizitka' ORDER BY o.created_at DESC, o.seq DESC", [$u['id']]);
    $out = [];
    foreach ($rows as $o) {
        $c = one('SELECT * FROM cards WHERE id = ?', [$o['c_id']]);
        $out[] = card_order_row(order_reprice($o), $c);
    }
    json_out(['ok' => true, 'cards' => $out]);
});

route('GET', '/admin/cards', function () {
    require_admin();
    $where = "o.product = 'vizitka'";
    $args = [];
    $status = (string)($_GET['status'] ?? '');
    if ($status === 'paid') $where .= " AND o.status IN ('paid','active')";
    elseif ($status === 'unpaid') $where .= " AND o.status NOT IN ('paid','active','archived')";
    elseif (in_array($status, ORDER_STATUSES, true)) { $where .= ' AND o.status = ?'; $args[] = $status; }
    $design = (string)($_GET['design'] ?? '');
    if ($design !== '' && card_design_get($design)) { $where .= ' AND o.template_slug = ?'; $args[] = $design; }
    $qtext = trim((string)($_GET['q'] ?? ''));
    if ($qtext !== '') {
        $like = '%' . str_replace(['%', '_'], '', $qtext) . '%';
        $digits = preg_replace('/\D/', '', $qtext);
        $phoneLike = $digits !== '' ? '%' . $digits . '%' : $like;
        $where .= ' AND (o.code LIKE ? OR c.slug LIKE ? OR c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR u.phone LIKE ?)';
        array_push($args, $like, $like, $like, $like, $phoneLike, $phoneLike);
    }
    $from = 'FROM orders o JOIN cards c ON c.order_id = o.id LEFT JOIN users u ON u.id = o.user_id';
    $total = (int)scalar("SELECT COUNT(*) $from WHERE $where", $args);
    $per = 30;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * $per;
    $rows = all("SELECT o.*, c.id AS c_id, u.name AS u_name, u.phone AS u_phone $from WHERE $where ORDER BY o.created_at DESC, o.seq DESC LIMIT $per OFFSET $offset", $args);
    $out = [];
    foreach ($rows as $o) {
        $c = one('SELECT * FROM cards WHERE id = ?', [$o['c_id']]);
        $out[] = card_order_row($o, $c) + ['userId' => $o['user_id'], 'ownerName' => $o['u_name'], 'ownerPhone' => $o['u_phone'],
            'phone' => (string)($c['phone'] ?? ''), 'promoCode' => $o['promo_code'], 'income' => (int)($o['income'] ?? 0)];
    }
    json_out(['ok' => true, 'cards' => $out, 'total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $per))]);
});

route('GET', '/admin/cards/:id', function ($p) {
    require_admin();
    $o = one("SELECT * FROM orders WHERE (id = ? OR code = ?) AND product = 'vizitka'", [$p['id'], strtoupper($p['id'])]) ?? fail('Vizitka topilmadi', 404);
    $c = one('SELECT * FROM cards WHERE order_id = ?', [$o['id']]) ?? fail('Vizitka topilmadi', 404);
    $owner = $o['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$o['user_id']]) : null;
    json_out([
        'ok' => true,
        'order' => card_order_info($o) + ['userId' => $o['user_id'], 'income' => (int)($o['income'] ?? 0)],
        'card' => card_out($c, $o),
        'owner' => $owner ? ['id' => $owner['id'], 'name' => $owner['name'], 'phone' => $owner['phone'], 'telegramUser' => $owner['telegram_user']] : null,
        'payments' => array_map('payment_out', all('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [$o['id']])),
        'leads' => array_map('card_lead_out', all('SELECT * FROM card_leads WHERE card_id = ? ORDER BY created_at DESC LIMIT 500', [$c['id']])),
    ]);
});
