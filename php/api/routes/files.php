<?php
declare(strict_types=1);

/** /files/<dir>/<name> — router yo‘li "/files/..." ko‘rinishida keladi (api prefiksisiz) */
const FILE_MIME = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'heic' => 'image/heic', 'heif' => 'image/heif', 'pdf' => 'application/pdf'];

function serve_upload(string $dir, string $name): never
{
    if (!in_array($dir, UPLOAD_DIRS, true) || !preg_match('/^[a-z0-9]+\.([a-z]+)$/', $name, $m) || !isset(FILE_MIME[$m[1]])) {
        http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit;
    }
    $path = upload_root() . "/$dir/$name";
    if (!is_file($path)) { http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit; }
    header('Content-Type: ' . FILE_MIME[$m[1]]);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

route('GET', '/files/:dir/:name', fn($p) => serve_upload($p['dir'], $p['name']));
