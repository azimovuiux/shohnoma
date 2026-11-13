<?php
declare(strict_types=1);

route('POST', '/orders', function () {
    $slug = body()['templateSlug'] ?? '';
    if (!is_string($slug) || !template_active($slug)) fail('Shablon topilmadi', 404);
    if (rate_limited('order:' . client_ip(), 20, 3600)) fail('Juda ko‘p urinish', 429);
    json_out(['ok' => true, 'id' => create_draft_order($slug)]);
});

route('GET', '/orders/:id', function ($p) {
    $b = owned_order_or_404($p['id']);
    $pay = latest_payment($b['order']['id']);
    json_out(['ok' => true, 'order' => order_out($b['order']), 'invitation' => invitation_out($b['invitation']), 'payment' => $pay ? payment_out($pay) : null, 'missing' => missing_fields($b['invitation'])]);
});

route('PATCH', '/orders/:id', function ($p) {
    $b = owned_order_or_404($p['id']);
    if ($b['order']['status'] === 'archived') fail('Taklifnoma arxivlangan', 409);
    $body = body();
    // Qoralama rejimi (buyurtma to‘ldirilayotganda): noto‘g‘ri/to‘liq bo‘lmagan maydon butun so‘rovni yiqitmaydi —
    // o‘sha maydon o‘tkazib yuboriladi (`skipped`), qolganlari saqlanadi. Majburiy maydonlar faqat «Davom etish»da tekshiriladi.
    $draft = !empty($body['_draft']) && !is_paid_status($b['order']['status']);
    unset($body['_draft']);
    if (!$body) {
        if ($draft) json_out(['ok' => true, 'invitation' => invitation_out($b['invitation']), 'skipped' => []]);
        fail('Ma’lumot yo‘q');
    }
    if (array_key_exists('templateSlug', $body)) {
        $t = is_string($body['templateSlug']) ? template_get($body['templateSlug']) : null;
        if (!$t) fail('Shablon topilmadi', 404);
        if (is_paid_status($b['order']['status'])) fail('To‘lovdan so‘ng shablonni almashtirib bo‘lmaydi', 409);
        q('UPDATE orders SET template_slug = ?, amount = ?, promo_code = NULL, promo_discount = 0 WHERE id = ?', [$t['slug'], tpl_price($t), $b['order']['id']]);
        unset($body['templateSlug']);
    }
    if ($draft) {
        // sana + vaqt birga, qolganlari alohida: bittasi xato bo‘lsa — faqat o‘sha o‘tkazib yuboriladi
        $groups = [];
        foreach (array_keys($body) as $k) {
            if ($k === 'day' || $k === 'time') $groups['date'][$k] = $body[$k];
            else $groups[$k] = [$k => $body[$k]];
        }
        $skipped = [];
        $inv = $b['invitation'];
        foreach ($groups as $part) {
            try {
                $inv = apply_invitation_patch($b, $part, true);
                $b['invitation'] = $inv;
            } catch (HttpError $e) {
                if ($e->status !== 422) throw $e;
                array_push($skipped, ...array_keys($part));
            }
        }
        json_out(['ok' => true, 'invitation' => invitation_out($inv), 'skipped' => $skipped]);
    }
    $inv = apply_invitation_patch($b, $body);
    json_out(['ok' => true, 'invitation' => invitation_out($inv)]);
});

/* ── Promokod: to‘lovdan oldin qo‘llash / olib tashlash ── */
const PROMO_STATUSES = ['draft', 'pending_payment', 'payment_failed', 'p2p_rejected'];

route('POST', '/orders/:id/promo', function ($p) {
    $b = owned_order_or_404($p['id']);
    $o = $b['order'];
    if (!in_array($o['status'], PROMO_STATUSES, true)) fail('Bu bosqichda promokod qo‘llab bo‘lmaydi', 409);
    $promo = promo_find((string)(body()['code'] ?? ''));
    if (is_string($promo)) fail($promo, 422);
    $base = (int)$o['amount'] + (int)$o['promo_discount'];
    $disc = promo_discount($promo, $base);
    if ($disc <= 0) fail('Bu promokod ushbu buyurtmaga chegirma bermaydi', 422);
    q('UPDATE orders SET amount = ?, promo_code = ?, promo_discount = ? WHERE id = ?', [$base - $disc, $promo['code'], $disc, $o['id']]);
    json_out(['ok' => true, 'amount' => $base - $disc, 'promoCode' => $promo['code'], 'promoDiscount' => $disc]);
});

route('DELETE', '/orders/:id/promo', function ($p) {
    $b = owned_order_or_404($p['id']);
    $o = $b['order'];
    if (!in_array($o['status'], PROMO_STATUSES, true)) fail('Bu bosqichda promokodni o‘zgartirib bo‘lmaydi', 409);
    $amount = (int)$o['amount'] + (int)$o['promo_discount'];
    q('UPDATE orders SET amount = ?, promo_code = NULL, promo_discount = 0 WHERE id = ?', [$amount, $o['id']]);
    json_out(['ok' => true, 'amount' => $amount]);
});

route('POST', '/orders/:id/photos', function ($p) {
    $b = owned_order_or_404($p['id']);
    $photos = jdec($b['invitation']['photos']);
    // slot berilsa va u band bo‘lsa — o‘sha joydagi surat almashtiriladi (shablondagi o‘rni saqlanadi)
    $slot = isset($_POST['slot']) && is_numeric($_POST['slot']) ? (int)$_POST['slot'] : -1;
    $replace = $slot >= 0 && $slot < count($photos);
    if (!$replace && count($photos) >= 10) fail('Ko‘pi bilan 10 ta surat', 422);
    $url = save_upload($_FILES['file'] ?? null, 'photos');
    if ($replace) {
        $old = $photos[$slot];
        $photos[$slot] = $url;
        delete_upload($old);
    } else {
        $photos[] = $url;
    }
    q('UPDATE invitations SET photos = ? WHERE id = ?', [json_encode($photos), $b['invitation']['id']]);
    json_out(['ok' => true, 'url' => $url, 'photos' => $photos]);
});

route('DELETE', '/orders/:id/photos', function ($p) {
    $b = owned_order_or_404($p['id']);
    $url = (string)(body()['url'] ?? '');
    $photos = array_values(array_filter(jdec($b['invitation']['photos']), fn($x) => $x !== $url));
    q('UPDATE invitations SET photos = ? WHERE id = ?', [json_encode($photos), $b['invitation']['id']]);
    if ($url) delete_upload($url);
    json_out(['ok' => true, 'photos' => $photos]);
});

route('POST', '/orders/:id/pay', function ($p) {
    $b = owned_order_or_404($p['id']);
    if (is_paid_status($b['order']['status'])) json_out(['ok' => true, 'url' => "/buyurtma/{$b['order']['id']}/tayyor/"]);
    if (missing_fields($b['invitation'])) fail('Avval marosim ma’lumotlarini to‘ldiring', 422);
    if (!$b['invitation']['contact_phone']) fail('Telefon raqamingizni kiriting', 422);
    $provider = body()['provider'] ?? '';
    if (!in_array($provider, enabled_providers(), true)) fail('Bu to‘lov usuli hozircha mavjud emas', 422);
    json_out(['ok' => true, 'url' => start_payment($b['order'], $provider)]);
});

route('POST', '/orders/:id/p2p-receipt', function ($p) {
    $b = owned_order_or_404($p['id']);
    if (is_paid_status($b['order']['status'])) fail('Buyurtma allaqachon to‘langan', 409);
    $url = save_upload($_FILES['file'] ?? null, 'receipts');
    q("INSERT INTO payments (id, order_id, provider, amount, status, receipt_url) VALUES (?, ?, 'p2p', ?, 'review', ?)", [new_id(), $b['order']['id'], (int)$b['order']['amount'], $url]);
    q("UPDATE orders SET status = 'p2p_review' WHERE id = ?", [$b['order']['id']]);
    notify_admin(sprintf("🧾 Yangi P2P chek: %s · %s\n%s%s\nTasdiqlash: %s/admin/tolovlar/", $b['order']['code'], format_price((int)$b['order']['amount']), site_url(), $url, site_url()));
    json_out(['ok' => true]);
});

route('GET', '/orders/:id/status', function ($p) {
    $b = owned_order_or_404($p['id']);
    $pay = latest_payment($b['order']['id']);
    json_out(['ok' => true, 'status' => $b['order']['status'], 'slug' => $b['invitation']['slug'],
        'payment' => $pay ? ['provider' => $pay['provider'], 'status' => $pay['status'], 'note' => $pay['review_note']] : null]);
});

route('POST', '/orders/:id/sandbox', function ($p) {
    if (env('PAYMENTS_SANDBOX') !== '1') fail('Not found', 404);
    $b = owned_order_or_404($p['id']);
    $body = body();
    $provider = in_array($body['provider'] ?? '', ['payme', 'click', 'google_pay', 'p2p'], true) ? $body['provider'] : 'payme';
    $pid = new_id();
    q("INSERT INTO payments (id, order_id, provider, amount, status, external_id) VALUES (?, ?, ?, ?, 'processing', ?)", [$pid, $b['order']['id'], $provider, (int)$b['order']['amount'], "sandbox-$pid"]);
    if (($body['result'] ?? '') === 'success') {
        mark_order_paid($b['order']['id'], $provider, $pid);
        json_out(['ok' => true, 'url' => "/buyurtma/{$b['order']['id']}/tolov/qabul-qilindi/"]);
    }
    q("UPDATE payments SET status = 'failed' WHERE id = ?", [$pid]);
    q("UPDATE orders SET status = 'payment_failed' WHERE id = ?", [$b['order']['id']]);
    json_out(['ok' => true, 'url' => "/buyurtma/{$b['order']['id']}/tolov/xato/"]);
});
