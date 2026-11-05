<?php
declare(strict_types=1);

const UPLOAD_MAX = 8 * 1024 * 1024;
const UPLOAD_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/heic' => 'heic',
    'image/heif' => 'heif',
    'application/pdf' => 'pdf',
];
const UPLOAD_DIRS = ['photos', 'receipts', 'briefs'];

function upload_root(): string { return storage_dir() . '/uploads'; }

/** $_FILES elementi → "/files/<dir>/<name>" */
function save_upload(?array $file, string $dir): string
{
    if (!in_array($dir, UPLOAD_DIRS, true)) throw new HttpError('Noto‘g‘ri papka', 400);
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE || empty($file['tmp_name'])) fail('Fayl tanlanmagan', 422);
    if (($file['error'] ?? 0) === UPLOAD_ERR_INI_SIZE || ($file['error'] ?? 0) === UPLOAD_ERR_FORM_SIZE || ($file['size'] ?? 0) > UPLOAD_MAX) fail('Fayl hajmi 8 MB dan oshmasin', 422);
    if (($file['error'] ?? 0) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) fail('Fayl yuklanmadi. Qayta urinib ko‘ring.', 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
    $ext = UPLOAD_TYPES[$mime] ?? null;
    if (!$ext) fail('Faqat rasm (JPG, PNG, WEBP) yoki PDF yuklang', 422);
    $folder = upload_root() . '/' . $dir;
    if (!is_dir($folder)) mkdir($folder, 0775, true);
    $name = new_id(20) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], "$folder/$name")) fail('Faylni saqlab bo‘lmadi', 500);
    return "/files/$dir/$name";
}

/** $_FILES['files'] (ko‘p fayl) → ro‘yxat */
function files_list(string $field): array
{
    $f = $_FILES[$field] ?? null;
    if (!$f) return [];
    if (!is_array($f['name'])) return [$f];
    $out = [];
    foreach ($f['name'] as $i => $n) {
        if (($f['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        $out[] = ['name' => $n, 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
    }
    return $out;
}

function delete_upload(string $url): void
{
    if (!preg_match('#^/files/(photos|receipts|briefs)/([a-z0-9]+\.[a-z]+)$#', $url, $m)) return;
    @unlink(upload_root() . "/{$m[1]}/{$m[2]}");
}
