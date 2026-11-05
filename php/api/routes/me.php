<?php
declare(strict_types=1);

route('GET', '/me', function () {
    $u = current_user();
    if (!$u) json_out(['ok' => true, 'user' => null, 'counts' => ['orders' => 0, 'favorites' => 0]]);
    json_out([
        'ok' => true,
        'user' => user_out($u),
        'counts' => [
            'orders' => (int)scalar('SELECT COUNT(*) FROM orders WHERE user_id = ?', [$u['id']]),
            'favorites' => (int)scalar('SELECT COUNT(*) FROM favorites WHERE user_id = ?', [$u['id']]),
        ],
    ]);
});

route('PATCH', '/me', function () {
    $u = require_user();
    $b = body();
    $set = [];
    if (array_key_exists('name', $b)) {
        if (!is_string($b['name']) || mb_strlen(trim($b['name'])) > 120) fail('Ma’lumot noto‘g‘ri', 422);
        $set['name'] = trim($b['name']) ?: null;
    }
    foreach (['notifyRsvpTelegram' => 'notify_rsvp_telegram', 'notifyRsvpSms' => 'notify_rsvp_sms', 'notifyDayBefore' => 'notify_day_before'] as $k => $col) {
        if (!array_key_exists($k, $b)) continue;
        if (!is_bool($b[$k])) fail('Ma’lumot noto‘g‘ri', 422);
        $set[$col] = $b[$k] ? 1 : 0;
    }
    if ($set) {
        $cols = implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($set)));
        q("UPDATE users SET $cols WHERE id = ?", [...array_values($set), $u['id']]);
    }
    json_out(['ok' => true]);
});

route('GET', '/me/orders', function () {
    $u = require_user();
    $items = [];
    foreach (all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, seq DESC', [$u['id']]) as $o) {
        $i = one('SELECT * FROM invitations WHERE order_id = ?', [$o['id']]);
        if (!$i) continue;
        $p = latest_payment($o['id']);
        $items[] = ['order' => order_out($o), 'invitation' => invitation_out($i), 'stats' => invitation_stats($i['id']), 'payment' => $p ? payment_out($p) : null];
    }
    json_out(['ok' => true, 'items' => $items]);
});

route('GET', '/me/payments', function () {
    $u = require_user();
    $rows = all('SELECT p.id AS p_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.user_id = ? ORDER BY p.created_at DESC', [$u['id']]);
    $items = [];
    foreach ($rows as $r) {
        $p = one('SELECT * FROM payments WHERE id = ?', [$r['p_id']]);
        $o = one('SELECT * FROM orders WHERE id = ?', [$p['order_id']]);
        $i = one('SELECT * FROM invitations WHERE order_id = ?', [$o['id']]);
        $items[] = ['payment' => payment_out($p), 'order' => order_out($o), 'invitation' => $i ? invitation_out($i) : null];
    }
    json_out(['ok' => true, 'items' => $items]);
});

route('GET', '/me/favorites', function () {
    $u = current_user();
    if (!$u) json_out(['ok' => true, 'slugs' => null]);
    json_out(['ok' => true, 'slugs' => array_column(all('SELECT template_slug FROM favorites WHERE user_id = ? ORDER BY created_at DESC', [$u['id']]), 'template_slug')]);
});

route('POST', '/me/favorites', function () {
    $u = require_user();
    $b = body();
    $list = array_merge(is_array($b['slugs'] ?? null) ? $b['slugs'] : [], isset($b['slug']) ? [$b['slug']] : []);
    foreach ($list as $s) {
        if (is_string($s) && template_get($s)) q('INSERT IGNORE INTO favorites (user_id, template_slug) VALUES (?, ?)', [$u['id'], $s]);
    }
    json_out(['ok' => true]);
});

route('DELETE', '/me/favorites', function () {
    $u = require_user();
    $slug = body()['slug'] ?? null;
    if (is_string($slug)) q('DELETE FROM favorites WHERE user_id = ? AND template_slug = ?', [$u['id'], $slug]);
    json_out(['ok' => true]);
});
