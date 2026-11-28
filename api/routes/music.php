<?php
declare(strict_types=1);

/*
 * Musiqa kutubxonasi — admin MP3 yuklaydi, barcha shablonlar uchun umumiy.
 * Fayllar: <storage>/music/<id>.mp3 → /files/music/<id>.mp3 (Range qo‘llab-quvvatlanadi).
 */

function music_out(array $r): array
{
    return [
        'id' => $r['id'],
        'title' => $r['title'],
        'artist' => $r['artist'],
        'duration' => $r['duration'] !== null ? (int)$r['duration'] : null,
        'url' => '/files/music/' . $r['id'] . '.mp3',
        'active' => (bool)$r['is_active'],
        'size' => (int)$r['size'],
    ];
}

/** Faol treklar (buyurtma formasi uchun) */
route('GET', '/music', function () {
    json_out(['ok' => true, 'tracks' => array_map('music_out', all('SELECT * FROM music_tracks WHERE is_active = 1 ORDER BY sort, created_at'))]);
});

route('GET', '/admin/music', function () {
    require_admin();
    $rows = all('SELECT m.*, (SELECT COUNT(*) FROM invitations i WHERE i.music_track = m.id) AS used FROM music_tracks m ORDER BY m.sort, m.created_at');
    json_out(['ok' => true, 'tracks' => array_map(fn($r) => music_out($r) + ['used' => (int)$r['used']], $rows)]);
});

/** Yuklash: multipart "file" (MP3), "title", "artist", "duration" (soniya, brauzer o‘lchaydi) */
route('POST', '/admin/music', function () {
    require_admin();
    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        $e = (int)($f['error'] ?? UPLOAD_ERR_NO_FILE);
        fail($e === UPLOAD_ERR_INI_SIZE || $e === UPLOAD_ERR_FORM_SIZE ? 'Fayl serverning yuklash chegarasidan katta (php upload_max_filesize)' : 'MP3 fayl tanlanmagan', 422);
    }
    if ($f['size'] > MUSIC_MAX_BYTES) fail('Fayl 15 MB dan katta', 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    if (!in_array($mime, ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'application/octet-stream'], true) || !preg_match('/\.mp3$/i', (string)$f['name'])) fail('Faqat MP3 fayl yuklang', 422);
    $title = trim((string)($_POST['title'] ?? ''));
    if ($title === '') $title = trim(preg_replace('/\.mp3$/i', '', (string)$f['name']));
    $title = mb_substr($title, 0, 120);
    $artist = mb_substr(trim((string)($_POST['artist'] ?? '')), 0, 120) ?: null;
    $dur = isset($_POST['duration']) && is_numeric($_POST['duration']) ? max(0, min(3600, (int)round((float)$_POST['duration']))) : null;
    $id = new_id(16);
    if (!move_uploaded_file($f['tmp_name'], music_dir() . "/$id.mp3")) fail('Faylni saqlab bo‘lmadi', 500);
    $sort = (int)scalar('SELECT COALESCE(MAX(sort), 0) + 1 FROM music_tracks');
    q('INSERT INTO music_tracks (id, title, artist, duration, size, sort) VALUES (?, ?, ?, ?, ?, ?)', [$id, $title, $artist, $dur, (int)$f['size'], $sort]);
    json_out(['ok' => true, 'track' => music_out(one('SELECT * FROM music_tracks WHERE id = ?', [$id]))]);
});

route('PATCH', '/admin/music/:id', function ($p) {
    require_admin();
    one('SELECT id FROM music_tracks WHERE id = ?', [$p['id']]) ?? fail('Trek topilmadi', 404);
    $b = body();
    if (array_key_exists('title', $b)) {
        $t = mb_substr(trim((string)$b['title']), 0, 120);
        if ($t === '') fail('Nomi bo‘sh bo‘lmasin', 422);
        q('UPDATE music_tracks SET title = ? WHERE id = ?', [$t, $p['id']]);
    }
    if (array_key_exists('artist', $b)) q('UPDATE music_tracks SET artist = ? WHERE id = ?', [mb_substr(trim((string)$b['artist']), 0, 120) ?: null, $p['id']]);
    if (array_key_exists('active', $b)) q('UPDATE music_tracks SET is_active = ? WHERE id = ?', [$b['active'] ? 1 : 0, $p['id']]);
    if (array_key_exists('sort', $b) && is_numeric($b['sort'])) q('UPDATE music_tracks SET sort = ? WHERE id = ?', [(int)$b['sort'], $p['id']]);
    json_out(['ok' => true, 'track' => music_out(one('SELECT * FROM music_tracks WHERE id = ?', [$p['id']]))]);
});

route('DELETE', '/admin/music/:id', function ($p) {
    require_admin();
    one('SELECT id FROM music_tracks WHERE id = ?', [$p['id']]) ?? fail('Trek topilmadi', 404);
    // Tanlagan taklifnomalar shablonning standart musiqasiga qaytadi
    q('UPDATE invitations SET music_track = NULL WHERE music_track = ?', [$p['id']]);
    q('DELETE FROM music_tracks WHERE id = ?', [$p['id']]);
    @unlink(music_dir() . '/' . $p['id'] . '.mp3');
    json_out(['ok' => true]);
});
