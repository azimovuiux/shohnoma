<?php
declare(strict_types=1);

const ORDER_STATUSES = ['draft', 'pending_payment', 'payment_processing', 'p2p_review', 'p2p_rejected', 'payment_failed', 'paid', 'active', 'archived'];

function admin_order_rows(array $orders): array
{
    $out = [];
    foreach ($orders as $o) {
        $i = one('SELECT * FROM invitations WHERE order_id = ?', [$o['id']]);
        $owner = $o['user_id'] ? one('SELECT phone, name FROM users WHERE id = ?', [$o['user_id']]) : null;
        $out[] = ['order' => order_out($o), 'invitation' => $i ? invitation_out($i) : null, 'owner' => $owner ? ['phone' => $owner['phone'] ?? ($i['contact_phone'] ?? null), 'name' => $owner['name']] : ($i && $i['contact_phone'] ? ['phone' => $i['contact_phone'], 'name' => null] : null)];
    }
    return $out;
}

function payment_rows(array $payments): array
{
    $out = [];
    foreach ($payments as $p) {
        $o = one('SELECT * FROM orders WHERE id = ?', [$p['order_id']]);
        $i = $o ? one('SELECT * FROM invitations WHERE order_id = ?', [$o['id']]) : null;
        $out[] = ['payment' => payment_out($p), 'order' => $o ? order_out($o) : null, 'invitation' => $i ? invitation_out($i) : null];
    }
    return $out;
}

route('GET', '/admin/counts', function () {
    require_admin();
    json_out(['ok' => true,
        'pendingP2p' => (int)scalar("SELECT COUNT(*) FROM payments WHERE provider = 'p2p' AND status = 'review'"),
        'newBriefs' => (int)scalar("SELECT COUNT(*) FROM briefs WHERE status = 'new'"),
        'newLeads' => (int)scalar("SELECT COUNT(*) FROM leads WHERE status = 'new'"),
        'unreadChats' => (int)scalar('SELECT COUNT(*) FROM chat_sessions WHERE unread_admin > 0')]);
});

route('GET', '/admin/dashboard', function () {
    require_admin();
    // Toshkent vaqti bo‘yicha bugun va shu oy (UTC+5)
    $todayStart = gmdate('Y-m-d H:i:s', strtotime(gmdate('Y-m-d', time() + 5 * 3600) . ' 00:00:00 UTC') - 5 * 3600);
    $monthStart = gmdate('Y-m-d H:i:s', strtotime(gmdate('Y-m-01', time() + 5 * 3600) . ' 00:00:00 UTC') - 5 * 3600);
    json_out([
        'ok' => true,
        'todayOrders' => (int)scalar('SELECT COUNT(*) FROM orders WHERE created_at >= ?', [$todayStart]),
        'todayPaid' => (int)scalar("SELECT COUNT(*) FROM orders WHERE paid_at >= ? AND status IN ('paid','active')", [$todayStart]),
        'monthRevenue' => (int)scalar("SELECT COALESCE(SUM(amount),0) FROM orders WHERE paid_at >= ? AND status IN ('paid','active','archived')", [$monthStart]),
        'monthPaidCount' => (int)scalar("SELECT COUNT(*) FROM orders WHERE paid_at >= ? AND status IN ('paid','active','archived')", [$monthStart]),
        'activeInvitations' => (int)scalar("SELECT COUNT(*) FROM orders WHERE status IN ('paid','active')"),
        'pendingP2p' => (int)scalar("SELECT COUNT(*) FROM payments WHERE provider = 'p2p' AND status = 'review'"),
        'newBriefs' => (int)scalar("SELECT COUNT(*) FROM briefs WHERE status = 'new'"),
        'newLeads' => (int)scalar("SELECT COUNT(*) FROM leads WHERE status = 'new'"),
        'recent' => array_map(fn($r) => ['order' => $r['order'], 'invitation' => $r['invitation']], admin_order_rows(all('SELECT * FROM orders ORDER BY created_at DESC, seq DESC LIMIT 8'))),
    ]);
});

route('GET', '/admin/orders', function () {
    require_admin();
    $where = '1=1';
    $args = [];
    $status = $_GET['status'] ?? '';
    if (in_array($status, ORDER_STATUSES, true)) { $where .= ' AND o.status = ?'; $args[] = $status; }
    $tpl = (string)($_GET['tpl'] ?? '');
    if ($tpl !== '' && preg_match('/^[a-z0-9-]{2,80}$/', $tpl)) { $where .= ' AND o.template_slug = ?'; $args[] = $tpl; }
    $qtext = trim((string)($_GET['q'] ?? ''));
    if ($qtext !== '') {
        $like = '%' . str_replace(['%', '_'], '', $qtext) . '%';
        $digits = preg_replace('/\D/', '', $qtext);
        $where .= ' AND (o.code LIKE ? OR i.slug LIKE ? OR i.person_a LIKE ? OR i.person_b LIKE ? OR i.contact_phone LIKE ? OR u.phone LIKE ?)';
        $phoneLike = $digits !== '' ? '%' . $digits . '%' : $like;
        array_push($args, $like, $like, $like, $like, $phoneLike, $phoneLike);
    }
    $from = 'FROM orders o JOIN invitations i ON i.order_id = o.id LEFT JOIN users u ON u.id = o.user_id';
    $total = (int)scalar("SELECT COUNT(*) $from WHERE $where", $args);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * 30;
    $rows = all("SELECT o.* $from WHERE $where ORDER BY o.created_at DESC, o.seq DESC LIMIT 30 OFFSET $offset", $args);
    json_out(['ok' => true, 'total' => $total, 'items' => admin_order_rows($rows)]);
});

route('PATCH', '/admin/orders/:id', function ($p) {
    require_admin();
    $b = body();
    // Fon musiqasini yoqish/o‘chirish (admin buyurtmalar ro‘yxatidan)
    if (array_key_exists('musicEnabled', $b)) {
        $o = one('SELECT id FROM orders WHERE id = ?', [$p['id']]) ?? fail('Buyurtma topilmadi', 404);
        q('UPDATE invitations SET music_enabled = ? WHERE order_id = ?', [$b['musicEnabled'] ? 1 : 0, $o['id']]);
        json_out(['ok' => true]);
    }
    // Narxni o‘zgartirish — faqat hali to‘lanmagan va to‘lov jarayonida bo‘lmagan buyurtmada
    if (array_key_exists('amount', $b)) {
        $o = one('SELECT id, status FROM orders WHERE id = ?', [$p['id']]) ?? fail('Buyurtma topilmadi', 404);
        if (!in_array($o['status'], ['draft', 'pending_payment', 'payment_failed', 'p2p_rejected'], true))
            fail('To‘langan yoki to‘lov jarayonidagi buyurtma narxini o‘zgartirib bo‘lmaydi', 409);
        $amount = filter_var($b['amount'], FILTER_VALIDATE_INT);
        if ($amount === false || $amount < 1000 || $amount > 100000000) fail('Narx 1 000 so‘mdan 100 000 000 so‘mgacha bo‘lishi kerak');
        q('UPDATE orders SET amount = ?, promo_code = NULL, promo_discount = 0, price_locked = 1 WHERE id = ?', [$amount, $o['id']]);
        json_out(['ok' => true, 'amount' => $amount]);
    }
    $status = $b['status'] ?? '';
    if (!in_array($status, ORDER_STATUSES, true)) fail('Holat noto‘g‘ri');
    $o = one('SELECT * FROM orders WHERE id = ?', [$p['id']]) ?? fail('Buyurtma topilmadi', 404);
    if (($status === 'paid' || $status === 'active') && !in_array($o['status'], ['archived', 'active', 'paid'], true)) {
        mark_order_paid($o['id'], 'p2p');
        json_out(['ok' => true]);
    }
    q('UPDATE orders SET status = ? WHERE id = ?', [$status, $o['id']]);
    json_out(['ok' => true]);
});

route('DELETE', '/admin/orders/:id', function ($p) {
    require_admin();
    $o = one('SELECT id FROM orders WHERE id = ?', [$p['id']]) ?? fail('Buyurtma topilmadi', 404);
    order_purge($o['id']);
    json_out(['ok' => true]);
});

route('GET', '/admin/payments', function () {
    require_admin();
    json_out(['ok' => true,
        'pending' => payment_rows(all("SELECT * FROM payments WHERE provider = 'p2p' AND status = 'review' ORDER BY created_at DESC")),
        'recent' => payment_rows(all("SELECT * FROM payments WHERE NOT (provider = 'p2p' AND status = 'review') ORDER BY created_at DESC LIMIT 30"))]);
});

route('POST', '/admin/payments/:id', function ($p) {
    $admin = require_admin();
    $b = body();
    $pay = one('SELECT * FROM payments WHERE id = ?', [$p['id']]);
    if (!$pay || $pay['provider'] !== 'p2p') fail('To‘lov topilmadi', 404);
    if ($pay['status'] !== 'review') fail('Bu chek allaqachon ko‘rib chiqilgan', 409);
    $action = $b['action'] ?? '';
    if ($action === 'approve') {
        q('UPDATE payments SET reviewed_by = ? WHERE id = ?', [$admin['id'], $pay['id']]);
        mark_order_paid($pay['order_id'], 'p2p', $pay['id']);
        json_out(['ok' => true]);
    }
    if ($action === 'reject') {
        $reason = mb_substr(trim((string)($b['note'] ?? '')), 0, 300) ?: 'Chek ma’lumotlari mos kelmadi';
        q("UPDATE payments SET status = 'rejected', review_note = ?, reviewed_by = ? WHERE id = ?", [$reason, $admin['id'], $pay['id']]);
        q("UPDATE orders SET status = 'p2p_rejected' WHERE id = ?", [$pay['order_id']]);
        $o = one('SELECT * FROM orders WHERE id = ?', [$pay['order_id']]);
        $i = one('SELECT * FROM invitations WHERE order_id = ?', [$pay['order_id']]);
        $owner = $o['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$o['user_id']]) : null;
        $phone = $owner['phone'] ?? $i['contact_phone'] ?? null;
        notif_add($o['user_id'], $i['id'] ?? null, 'pay_reject', $pay['id'], ['code' => $o['code'], 'reason' => $reason]);
        $text = "Shohnoma: {$o['code']} bo‘yicha chek qabul qilinmadi: $reason";
        try {
            if ($phone) send_sms($phone, $text);
            notify_user($owner['telegram_id'] ?? null, $text);
        } catch (Throwable $e) {
            error_log('[reject notify] ' . $e->getMessage());
        }
        json_out(['ok' => true]);
    }
    fail('Noma’lum amal');
});

route('GET', '/admin/briefs', function () {
    require_admin();
    json_out(['ok' => true, 'items' => array_map('brief_out', all('SELECT * FROM briefs ORDER BY created_at DESC LIMIT 200'))]);
});
route('PATCH', '/admin/briefs/:id', function ($p) {
    require_admin();
    $s = body()['status'] ?? '';
    if (!in_array($s, ['new', 'contacted', 'in_progress', 'done', 'rejected'], true)) fail('Holat noto‘g‘ri');
    q('UPDATE briefs SET status = ? WHERE id = ?', [$s, $p['id']]);
    json_out(['ok' => true]);
});

route('GET', '/admin/leads', function () {
    require_admin();
    json_out(['ok' => true, 'items' => array_map('lead_out', all('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200'))]);
});
route('PATCH', '/admin/leads/:id', function ($p) {
    require_admin();
    $s = body()['status'] ?? '';
    if (!in_array($s, ['new', 'contacted', 'done'], true)) fail('Holat noto‘g‘ri');
    q('UPDATE leads SET status = ? WHERE id = ?', [$s, $p['id']]);
    json_out(['ok' => true]);
});
