<?php
declare(strict_types=1);

/**
 * Kabinet: maxsus mehmonlar (faqat taklifnoma egasi yoki admin).
 *   GET    /invitations/:id/special-guests          — ro‘yxat + har birining javobi
 *   POST   /invitations/:id/special-guests          — {names: string[]} (bitta yoki ro‘yxat), {note?}
 *   PATCH  /invitations/:id/special-guests/:gid     — {name?, note?}
 *   DELETE /invitations/:id/special-guests/:gid     — javobi umumiy ro‘yxatda qoladi
 *   GET    /invitations/:id/special-guests-csv      — CSV
 * Qo‘shish/tahrirlash — faqat to‘langan (faol) taklifnomada; arxivda faqat ko‘rish.
 */

/** Ro‘yxat: [guest_row, response_row|null][] (yaratilish tartibida) */
function sg_rows(string $invitationId): array
{
    // yangi qo‘shilganlar tepada; bir martada (ro‘yxat bilan) qo‘shilganlar — ro‘yxatdagi tartibida
    $guests = all('SELECT * FROM special_guests WHERE invitation_id = ? ORDER BY created_at DESC, pos ASC', [$invitationId]);
    $resp = [];
    foreach (all('SELECT * FROM guest_responses WHERE invitation_id = ? AND special_guest_id IS NOT NULL ORDER BY created_at ASC', [$invitationId]) as $r) {
        $resp[$r['special_guest_id']] = $r; // bir nechta bo‘lsa — oxirgisi
    }
    return array_map(fn($g) => [$g, $resp[$g['id']] ?? null], $guests);
}

function sg_editable(array $order): void
{
    if (!is_paid_status($order['status'])) fail($order['status'] === 'archived' ? 'Arxivlangan taklifnomani tahrirlab bo‘lmaydi' : 'Taklifnoma faol emas', 409);
}

function sg_owned_guest(array $inv, string $gid): array
{
    return one('SELECT * FROM special_guests WHERE id = ? AND invitation_id = ?', [$gid, $inv['id']]) ?? fail('Mehmon topilmadi', 404);
}

route('GET', '/invitations/:id/special-guests', function ($p) {
    [$i, $o] = owned_invitation($p['id']);
    $list = array_map(fn($x) => special_guest_out($x[0], $x[1]), sg_rows($i['id']));
    json_out(['ok' => true, 'list' => $list, 'max' => SG_MAX, 'editable' => is_paid_status($o['status'])]);
});

route('POST', '/invitations/:id/special-guests', function ($p) {
    [$i, $o] = owned_invitation($p['id']);
    sg_editable($o);
    $b = body();
    $raw = is_array($b['names'] ?? null) ? $b['names'] : [$b['name'] ?? ''];
    $note = mb_substr(sg_clean_name($b['note'] ?? ''), 0, SG_NOTE_MAX) ?: null;
    $names = [];
    foreach ($raw as $n) {
        if (!is_string($n)) continue;
        $n = sg_clean_name($n);
        if ($n === '') continue;
        if (mb_strlen($n) > SG_NAME_MAX) fail('Ism juda uzun (ko‘pi bilan 40 belgi)', 422);
        $names[mb_strtolower($n)] ??= $n;
    }
    if (!$names) fail('Mehmon ismini yozing', 422);
    if (rate_limited('sgadd:' . $i['id'], 200, 3600)) fail('Juda ko‘p urinish', 429);
    $existing = [];
    foreach (all('SELECT name FROM special_guests WHERE invitation_id = ?', [$i['id']]) as $r) $existing[mb_strtolower($r['name'])] = true;
    $new = array_diff_key($names, $existing);
    if (count($existing) + count($new) > SG_MAX) fail('Ko‘pi bilan 1000 ta maxsus mehmon qo‘shish mumkin', 422);
    $ids = [];
    $now = now_utc();
    $pos = (int)scalar('SELECT COALESCE(MAX(pos), 0) FROM special_guests WHERE invitation_id = ?', [$i['id']]);
    db()->beginTransaction();
    try {
        foreach ($new as $n) {
            $id = new_id();
            q('INSERT INTO special_guests (id, invitation_id, name, token, note, pos, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [$id, $i['id'], $n, sg_new_token(), $note, ++$pos, $now]);
            $ids[] = $id;
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    $added = $ids ? all('SELECT * FROM special_guests WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY pos ASC', $ids) : [];
    json_out(['ok' => true, 'added' => array_map(fn($g) => special_guest_out($g, null), $added), 'skipped' => count($names) - count($new)]);
});

route('PATCH', '/invitations/:id/special-guests/:gid', function ($p) {
    [$i, $o] = owned_invitation($p['id']);
    sg_editable($o);
    $g = sg_owned_guest($i, $p['gid']);
    $b = body();
    $name = array_key_exists('name', $b) ? sg_clean_name($b['name']) : $g['name'];
    if ($name === '') fail('Mehmon ismini yozing', 422);
    if (mb_strlen($name) > SG_NAME_MAX) fail('Ism juda uzun (ko‘pi bilan 40 belgi)', 422);
    $note = array_key_exists('note', $b) ? (mb_substr(sg_clean_name($b['note']), 0, SG_NOTE_MAX) ?: null) : $g['note'];
    if (mb_strtolower($name) !== mb_strtolower($g['name']) && scalar('SELECT 1 FROM special_guests WHERE invitation_id = ? AND name = ? AND id <> ?', [$i['id'], $name, $g['id']]))
        fail('Bu ismli mehmon ro‘yxatda bor', 422);
    q('UPDATE special_guests SET name = ?, note = ? WHERE id = ?', [$name, $note, $g['id']]);
    $g = sg_owned_guest($i, $g['id']);
    $r = one('SELECT * FROM guest_responses WHERE special_guest_id = ? ORDER BY created_at DESC LIMIT 1', [$g['id']]);
    json_out(['ok' => true, 'guest' => special_guest_out($g, $r)]);
});

route('DELETE', '/invitations/:id/special-guests/:gid', function ($p) {
    [$i, $o] = owned_invitation($p['id']);
    sg_editable($o);
    $g = sg_owned_guest($i, $p['gid']);
    // Javob va tilak umumiy «Mehmonlar javobi» ro‘yxatida qoladi
    q('UPDATE guest_responses SET special_guest_id = NULL WHERE special_guest_id = ?', [$g['id']]);
    q('DELETE FROM special_guests WHERE id = ?', [$g['id']]);
    json_out(['ok' => true]);
});

route('GET', '/invitations/:id/special-guests-csv', function ($p) {
    [$i] = owned_invitation($p['id']);
    $esc = function ($v) {
        $s = (string)($v ?? '');
        // Excel formula sifatida o‘qimasin
        if ($s !== '' && strpbrk($s[0], '=+-@') !== false) $s = "'" . $s;
        return preg_match('/[";\n\r,]/', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s;
    };
    $tk = fn(?string $dt) => $dt ? gmdate('d.m.Y H:i', strtotime($dt . ' UTC') + 5 * 3600) : '';
    $base = site_url() . '/' . $i['slug'] . '/?g=';
    $lines = [implode(';', ['Mehmon', 'Holat', 'Kishi', 'Tilak', 'Ochgan', 'Necha marta', 'Javobdagi ism', 'Izoh', 'Havola'])];
    foreach (sg_rows($i['id']) as [$g, $r]) {
        $state = $r ? (RSVP_LABEL[$r['status']] ?? $r['status']) : ((int)$g['open_count'] > 0 ? 'Ochgan — javob yo‘q' : 'Ochilmagan');
        $lines[] = implode(';', array_map($esc, [
            $g['name'], $state, $r && $r['status'] !== 'not_coming' ? $r['count'] : '', $r['wish'] ?? '',
            $tk($g['last_opened_at']), (int)$g['open_count'] ?: '', $r && $r['name'] !== $g['name'] ? $r['name'] : '', $g['note'] ?? '', $base . $g['token'],
        ]));
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="maxsus-mehmonlar-' . $i['slug'] . '.csv"');
    header('Cache-Control: no-store');
    echo "\xEF\xBB\xBF" . implode("\r\n", $lines);
    exit;
});
