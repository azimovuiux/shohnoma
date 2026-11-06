<?php
declare(strict_types=1);

/* Musiqa kutubxonasi — umumiy funksiyalar (yo‘llar: routes/music.php, fayl: routes/files.php) */

const MUSIC_MAX_BYTES = 15 * 1024 * 1024;

function music_dir(): string
{
    $d = storage_dir() . '/music';
    if (!is_dir($d)) @mkdir($d, 0775, true);
    return $d;
}

/** Audio fayl — Range so‘rovlari bilan (telefonlarda o‘tkazib yuborish/yuklash uchun zarur) */
function music_serve(string $file): never
{
    if (!preg_match('/^([a-z0-9]{8,32})\.mp3$/i', $file, $m)) { http_response_code(404); exit; }
    $path = music_dir() . '/' . $m[1] . '.mp3';
    if (!is_file($path)) { http_response_code(404); exit; }
    $size = filesize($path);
    $start = 0; $end = $size - 1;
    header('Content-Type: audio/mpeg');
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=31536000, immutable');
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $r)) {
        if ($r[1] === '' && $r[2] !== '') { $start = max(0, $size - (int)$r[2]); }
        else { $start = (int)$r[1]; if ($r[2] !== '') $end = min($end, (int)$r[2]); }
        if ($start > $end || $start >= $size) { http_response_code(416); header("Content-Range: bytes */$size"); exit; }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }
    $len = $end - $start + 1;
    header("Content-Length: $len");
    $fh = fopen($path, 'rb');
    fseek($fh, $start);
    while ($len > 0 && !feof($fh)) { $chunk = fread($fh, min(65536, $len)); echo $chunk; $len -= strlen($chunk); flush(); }
    fclose($fh);
    exit;
}
