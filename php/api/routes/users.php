<?php
declare(strict_types=1);

/* ── Admin: foydalanuvchilarni boshqarish ── */

function admin_user_out(array $u): array
{
    return user_out($u) + [
        'login' => $u['login'] ?? null,
        'hasPassword' => !empty($u['password_hash']),
        'isBlocked' => (bool)($u['is_blocked'] ?? false),
        'note' => $u['note'] ?? null,
        'orders' => (int)scalar('SELECT COUNT(*) FROM orders WHERE user_id = ?', [$u['id']]),
        'activeOrders' => (int)scalar("SELECT COUNT(*) FROM orders WHERE user_id = ? AND status IN ('paid','active')", [$u['id']]),
        'spent' => (int)scalar("SELECT COALESCE(SUM(amount),0) FROM orders WHERE user_id = ? AND status IN ('paid','active')", [$u['id']]),
        'lastSeen' => iso(scalar('SELECT MAX(created_at) FROM sessions WHERE user_id = ?', [$u['id']]) ?: null),
    ];
}

function admin_user_or_404(string $id): array { return one('SELECT * FROM users WHERE id = ?', [$id]) ?? fail('Foydalanuvchi topilmadi', 404); }

/** Ma’lumotlarni tekshirib, users ustunlariga */
function admin_user_fields(array $b, ?array $cur): array
{
    $f = [];
    if (array_key_exists('name', $b)) $f['name'] = str_in($b['name'], 120) ?: null;
    if (array_key_exists('phone', $b)) {
        $raw = trim((string)$b['phone']);
        if ($raw === '') $f['phone'] = null;
        else {
            $p = normalize_phone($raw) ?? tg_phone($raw) ?? fail('Telefon raqam noto‘g‘ri', 422);
            $o = one('SELECT id FROM users WHERE phone = ?', [$p]);
            if ($o && $o['id'] !== ($cur['id'] ?? '')) fail('Bu raqam boshqa foydalanuvchida bor', 409);
            $f['phone'] = $p;
        }
    }
    if (array_key_exists('telegramUser', $b)) {
        $t = ltrim(trim((string)$b['telegramUser']), '@');
        if ($t !== '' && !preg_match('/^[A-Za-z0-9_]{4,32}$/', $t)) fail('Telegram username noto‘g‘ri', 422);
        $f['telegram_user'] = $t === '' ? null : "@$t";
    }
    if (array_key_exists('note', $b)) $f['note'] = str_in($b['note'], 2000) ?: null;
    if (array_key_exists('isAdmin', $b)) $f['is_admin'] = !empty($b['isAdmin']) ? 1 : 0;
    if (array_key_exists('isBlocked', $b)) $f['is_blocked'] = !empty($b['isBlocked']) ? 1 : 0;
    if (array_key_exists('login', $b)) {
        $l = strtolower(trim((string)$b['login']));
        if ($l === '') $f['login'] = null;
        else {
            if (!preg_match('/^[a-z0-9._-]{3,64}$/', $l)) fail('Login: 3–64 belgi, lotin harf, raqam, . _ -', 422);
            $o = one('SELECT id FROM users WHERE login = ?', [$l]);
            if ($o && $o['id'] !== ($cur['id'] ?? '')) fail('Bu login band', 409);
            $f['login'] = $l;
        }
    }
    if (!empty($b['password'])) {
        if (mb_strlen((string)$b['password']) < 8) fail('Parol kamida 8 belgi bo‘lsin', 422);
        $f['password_hash'] = password_hash((string)$b['password'], PASSWORD_BCRYPT);
    }
    return $f;
}

route('GET', '/admin/users', function () {
    require_admin();
    $where = '1=1';
    $args = [];
    $role = $_GET['role'] ?? '';
    if ($role === 'admin') $where .= ' AND u.is_admin = 1';
    if ($role === 'blocked') $where .= ' AND u.is_blocked = 1';
    if ($role === 'customers') $where .= " AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.status IN ('paid','active'))";
    $qtext = trim((string)($_GET['q'] ?? ''));
    if ($qtext !== '') {
        $like = '%' . str_replace(['%', '_'], '', $qtext) . '%';
        $digits = preg_replace('/\D/', '', $qtext);
        $where .= ' AND (u.name LIKE ? OR u.telegram_user LIKE ? OR u.login LIKE ? OR u.phone LIKE ?)';
        array_push($args, $like, $like, $like, $digits !== '' ? "%$digits%" : $like);
    }
    $total = (int)scalar("SELECT COUNT(*) FROM users u WHERE $where", $args);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * 40;
    $rows = all("SELECT u.* FROM users u WHERE $where ORDER BY u.created_at DESC LIMIT 40 OFFSET $offset", $args);
    json_out(['ok' => true, 'total' => $total, 'items' => array_map('admin_user_out', $rows)]);
});

route('GET', '/admin/users/:id', function ($p) {
    require_admin();
    $u = admin_user_or_404($p['id']);
    $orders = all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [$u['id']]);
    $favs = array_column(all('SELECT template_slug FROM favorites WHERE user_id = ?', [$u['id']]), 'template_slug');
    json_out(['ok' => true, 'user' => admin_user_out($u), 'orders' => admin_order_rows($orders), 'favorites' => $favs]);
});

route('POST', '/admin/users', function () {
    require_admin();
    $b = body();
    $f = admin_user_fields($b, null);
    if (empty($f['phone']) && empty($f['telegram_user']) && empty($f['login'])) fail('Telefon, Telegram yoki login — kamida bittasini kiriting', 422);
    if (!empty($f['login']) && empty($f['password_hash'])) fail('Login uchun parol ham kiriting', 422);
    $f['id'] = new_id();
    $cols = array_keys($f);
    q('INSERT INTO users (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')', array_values($f));
    json_out(['ok' => true, 'user' => admin_user_out(admin_user_or_404($f['id']))]);
});

route('PATCH', '/admin/users/:id', function ($p) {
    $me = require_admin();
    $u = admin_user_or_404($p['id']);
    $f = admin_user_fields(body(), $u);
    if ($u['id'] === $me['id'] && ((isset($f['is_admin']) && !$f['is_admin']) || !empty($f['is_blocked']))) fail('O‘zingizni admindan chiqara yoki bloklay olmaysiz', 422);
    if (isset($f['is_admin']) && !$f['is_admin'] && (int)scalar('SELECT COUNT(*) FROM users WHERE is_admin = 1 AND id <> ?', [$u['id']]) === 0) fail('Kamida bitta admin qolishi kerak', 422);
    if (!empty($f['login']) && empty($u['password_hash']) && empty($f['password_hash'])) fail('Login uchun parol ham kiriting', 422);
    if ($f) {
        q('UPDATE users SET ' . implode(', ', array_map(fn($c) => "$c = ?", array_keys($f))) . ' WHERE id = ?', [...array_values($f), $u['id']]);
        if (!empty($f['is_blocked'])) q('DELETE FROM sessions WHERE user_id = ?', [$u['id']]);
    }
    json_out(['ok' => true, 'user' => admin_user_out(admin_user_or_404($u['id']))]);
});

route('DELETE', '/admin/users/:id', function ($p) {
    $me = require_admin();
    $u = admin_user_or_404($p['id']);
    if ($u['id'] === $me['id']) fail('O‘zingizni o‘chira olmaysiz', 422);
    if ($u['is_admin'] && (int)scalar('SELECT COUNT(*) FROM users WHERE is_admin = 1') <= 1) fail('Oxirgi adminni o‘chirib bo‘lmaydi', 422);
    // Buyurtmalar saqlanadi (egasiz qoladi), sessiya va sevimlilar o‘chadi
    q('UPDATE orders SET user_id = NULL WHERE user_id = ?', [$u['id']]);
    q('DELETE FROM sessions WHERE user_id = ?', [$u['id']]);
    q('DELETE FROM favorites WHERE user_id = ?', [$u['id']]);
    q('DELETE FROM users WHERE id = ?', [$u['id']]);
    json_out(['ok' => true]);
});

/** Foydalanuvchiga shablon biriktirish: buyurtma + taklifnoma ochiladi; "activate" bo‘lsa — to‘lovsiz faollashtiriladi */
route('POST', '/admin/users/:id/enroll', function ($p) {
    require_admin();
    $u = admin_user_or_404($p['id']);
    $b = body();
    $slug = (string)($b['templateSlug'] ?? '');
    $t = template_get($slug) ?? fail('Shablonni tanlang', 422);
    $amount = isset($b['amount']) && $b['amount'] !== '' ? max(0, (int)$b['amount']) : (int)$t['price'];
    $orderId = create_draft_order($slug, $u, $amount);
    $inv = one('SELECT * FROM invitations WHERE order_id = ?', [$orderId]);
    $set = [];
    $args = [];
    foreach (['personA' => 'person_a', 'personB' => 'person_b', 'venueName' => 'venue_name', 'address' => 'address'] as $k => $col) {
        if (isset($b[$k]) && trim((string)$b[$k]) !== '') { $set[] = "$col = ?"; $args[] = str_in($b[$k], 160); }
    }
    if (!empty($b['date']) && preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/', (string)$b['date'])) { $set[] = 'date = ?'; $args[] = (string)$b['date']; }
    if ($u['phone']) { $set[] = 'contact_phone = COALESCE(contact_phone, ?)'; $args[] = $u['phone']; }
    if ($set) q('UPDATE invitations SET ' . implode(', ', $set) . ' WHERE id = ?', [...$args, $inv['id']]);
    if (!empty($b['activate'])) mark_order_paid($orderId, 'admin');
    $o = one('SELECT * FROM orders WHERE id = ?', [$orderId]);
    json_out(['ok' => true, 'order' => admin_order_rows([$o])[0]]);
});

/** Foydalanuvchi sifatida kirish (uning kabinetini ko‘rish/tahrirlash uchun) */
route('POST', '/admin/users/:id/impersonate', function ($p) {
    require_admin();
    $u = admin_user_or_404($p['id']);
    if ($u['is_blocked']) fail('Bloklangan foydalanuvchi', 422);
    destroy_session();
    create_session($u['id']);
    json_out(['ok' => true]);
});

/** Buyurtmani boshqa foydalanuvchiga o‘tkazish */
route('POST', '/admin/orders/:id/owner', function ($p) {
    require_admin();
    $o = one('SELECT * FROM orders WHERE id = ?', [$p['id']]) ?? fail('Buyurtma topilmadi', 404);
    $uid = (string)(body()['userId'] ?? '');
    $u = admin_user_or_404($uid);
    q('UPDATE orders SET user_id = ?, guest_token = NULL WHERE id = ?', [$u['id'], $o['id']]);
    json_out(['ok' => true]);
});
