<?php
declare(strict_types=1);

/** Egasi yoki admin bo‘lgan taklifnoma */
function owned_invitation(string $id): array
{
    $u = require_user();
    $i = one('SELECT * FROM invitations WHERE id = ?', [$id]);
    $o = $i ? one('SELECT * FROM orders WHERE id = ?', [$i['order_id']]) : null;
    if (!$i || !$o || ($o['user_id'] !== $u['id'] && !$u['is_admin'])) fail('Taklifnoma topilmadi', 404);
    return [$i, $o, $u];
}

route('GET', '/invitations/:id', function ($p) {
    [$i, $o, $u] = owned_invitation($p['id']);
    $recent = array_map('guest_out', all('SELECT * FROM guest_responses WHERE invitation_id = ? ORDER BY created_at DESC LIMIT 5', [$i['id']]));
    $payments = array_map('payment_out', all('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [$o['id']]));
    $switcher = [];
    $ownerId = $o['user_id'] ?? $u['id'];
    foreach (all('SELECT o.status, o.template_slug, i.id, i.person_a, i.person_b, i.date FROM orders o JOIN invitations i ON i.order_id = o.id WHERE o.user_id = ? ORDER BY o.created_at DESC', [$ownerId]) as $r) {
        $switcher[] = ['id' => $r['id'], 'names' => trim($r['person_a'] . ($r['person_b'] ? ' & ' . $r['person_b'] : '')), 'date' => $r['date'], 'status' => $r['status'], 'templateSlug' => $r['template_slug']];
    }
    json_out(['ok' => true, 'order' => order_out($o), 'invitation' => invitation_out($i), 'stats' => invitation_stats($i['id']), 'recent' => $recent, 'payments' => $payments, 'switcher' => $switcher, 'special' => sg_summary($i['id'])]);
});

route('GET', '/invitations/:id/responses', function ($p) {
    [$i] = owned_invitation($p['id']);
    $status = $_GET['status'] ?? '';
    $qtext = trim((string)($_GET['q'] ?? ''));
    $per = max(1, min(100, (int)($_GET['per'] ?? 8)));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $where = 'invitation_id = ?';
    $args = [$i['id']];
    if (in_array($status, ['coming', 'maybe', 'not_coming'], true)) { $where .= ' AND status = ?'; $args[] = $status; }
    if ($qtext !== '') { $where .= ' AND name LIKE ?'; $args[] = '%' . str_replace(['%', '_'], '', $qtext) . '%'; }
    $total = (int)scalar("SELECT COUNT(*) FROM guest_responses WHERE $where", $args);
    $offset = ($page - 1) * $per;
    $list = array_map('guest_out', all("SELECT * FROM guest_responses WHERE $where ORDER BY created_at DESC LIMIT $per OFFSET $offset", $args));
    $wishes = array_map('guest_out', all("SELECT * FROM guest_responses WHERE invitation_id = ? AND wish IS NOT NULL AND wish <> '' ORDER BY created_at DESC LIMIT 3", [$i['id']]));
    json_out(['ok' => true, 'total' => $total, 'list' => $list, 'stats' => invitation_stats($i['id']), 'views' => (int)$i['views'], 'wishes' => $wishes]);
});

route('GET', '/invitations/:id/guests', function ($p) {
    [$i] = owned_invitation($p['id']);
    $label = ['coming' => 'Boraman', 'maybe' => 'Hali aniq emas', 'not_coming' => 'Kela olmayman'];
    $esc = function ($v) {
        $s = (string)($v ?? '');
        return preg_match('/[";\n,]/', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s;
    };
    $lines = [implode(';', ['Mehmon', 'Kishi', 'Javob', 'Tilak', 'Vaqt'])];
    foreach (all('SELECT * FROM guest_responses WHERE invitation_id = ? ORDER BY created_at ASC', [$i['id']]) as $g) {
        $t = gmdate('d.m.Y H:i', strtotime($g['created_at'] . ' UTC') + 5 * 3600);
        $lines[] = implode(';', array_map($esc, [$g['name'], $g['count'], $label[$g['status']] ?? $g['status'], $g['wish'] ?? '', $t]));
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="mehmonlar-' . $i['slug'] . '.csv"');
    echo "\xEF\xBB\xBF" . implode("\r\n", $lines);
    exit;
});
