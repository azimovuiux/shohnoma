<?php
declare(strict_types=1);

/**
 * POST /api/invitations/:id/share-image — ulashish kartasi (multipart: file — JPEG 1080×1440, hash, guest?)
 * Egasi (yoki buyurtma brauzer tokeni) va faqat faol (to‘langan) taklifnoma.
 */
route('POST', '/invitations/:id/share-image', function ($p) {
    $i = one('SELECT * FROM invitations WHERE id = ?', [$p['id']]);
    $b = $i ? owned_order($i['order_id']) : null;
    if (!$i || !$b) fail('Taklifnoma topilmadi', 404);
    if (!is_paid_status($b['order']['status'])) fail('Taklifnoma faol emas', 409);
    $hash = (string)($_POST['hash'] ?? '');
    if (!preg_match('/^[a-z0-9]{6,16}$/', $hash)) fail('Noto‘g‘ri xesh', 422);
    $guest = mb_substr(trim((string)($_POST['guest'] ?? '')), 0, 80);
    if (rate_limited('share:' . $i['id'], 120, 3600)) fail('Juda ko‘p urinish', 429);

    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Rasm yuklanmadi', 422);
    if (($f['size'] ?? 0) > SHARE_MAX) fail('Rasm hajmi 2 MB dan oshmasin', 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    $dim = @getimagesize($f['tmp_name']);
    if ($mime !== 'image/jpeg' || !$dim || $dim[0] !== SHARE_W || $dim[1] !== SHARE_H) fail('Rasm JPEG 1080×1440 bo‘lishi kerak', 422);

    $map = jdec($i['share_image'] ?? null) ?: [];
    $key = share_key($guest);
    // Asosiy rasm o‘zgarsa (ma’lumot tahrirlangan) — eski shaxsiy rasmlar o‘chadi (og:image asosiysiga qaytadi)
    if ($key === 'm' && ($map['m']['h'] ?? null) !== $hash) {
        foreach (array_keys($map) as $k) {
            if ($k === 'm') continue;
            @unlink(share_path($i['id'], (string)$k));
            unset($map[$k]);
        }
    }
    // Shaxsiy rasmlar soni cheklangan — eng eskilari o‘chadi
    $guests = array_filter($map, fn($v, $k) => $k !== 'm' && $k !== $key, ARRAY_FILTER_USE_BOTH);
    if (count($guests) >= SHARE_GUESTS_MAX) {
        uasort($guests, fn($a, $c) => ($a['t'] ?? 0) <=> ($c['t'] ?? 0));
        foreach (array_slice(array_keys($guests), 0, count($guests) - SHARE_GUESTS_MAX + 1) as $k) {
            @unlink(share_path($i['id'], (string)$k));
            unset($map[$k]);
        }
    }
    $dir = upload_root() . '/share';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    if (!move_uploaded_file($f['tmp_name'], share_path($i['id'], $key))) fail('Rasmni saqlab bo‘lmadi', 500);
    @chmod(share_path($i['id'], $key), 0644);
    $map[$key] = ['h' => $hash, 't' => time()];
    q('UPDATE invitations SET share_image = ? WHERE id = ?', [json_encode($map), $i['id']]);
    json_out(['ok' => true, 'url' => "/files/share/{$i['id']}$key.jpg?v=$hash", 'hash' => $hash]);
});
