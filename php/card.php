<?php
/**
 * Raqamli vizitka: /v/<slug>/ — statik qobiq (/v/_/index.html) ga Telegram/WhatsApp uchun OG meta qo‘shadi
 * (sarlavha «Ism — lavozim», tavsif, portret). Ma’lumotni brauzer /api/c/<slug> dan oladi.
 * To‘lanmagan yoki topilmagan vizitka — 404.
 */
declare(strict_types=1);
require __DIR__ . '/api/lib/bootstrap.php';
foreach (glob(__DIR__ . '/api/lib/*.php') as $f) require_once $f;

$slug = (string)($_GET['slug'] ?? '');
$lang = in_array($_GET['lang'] ?? '', ['ru', 'en'], true) ? $_GET['lang'] : 'uz';
$shell = __DIR__ . '/v/_/index.html';
$notFound = __DIR__ . '/404.html';

$r = null;
try {
    $r = public_card($slug);
} catch (Throwable $e) {
    error_log('[card] ' . $e->getMessage());
}

if (!$r || !is_file($shell)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    readfile(is_file($notFound) ? $notFound : $shell);
    exit;
}

$ct = card_content($r['card']);
$L = fn(array $v) => trim((string)(($v[$lang] ?? '') !== '' ? $v[$lang] : ($v['uz'] ?? '')));
$name = trim($ct['fullName']) ?: 'Vizitka';
$position = $L($ct['position']);
$company = $L($ct['company']);
$title = $name . ($position !== '' ? " — $position" : '') . ($company !== '' && !str_contains($position, $company) ? ", $company" : '');
$desc = $L($ct['bio']) ?: trim(implode(' · ', array_filter([$position, $company])));
$url = site_url() . "/v/$slug/";

// og:image — portret (birinchi rasm); bo‘lmasa dizayn rasmi (/og/<dizayn>.png, bo‘lsa)
$image = null;
$photo = $ct['photos'][0] ?? null;
if (is_string($photo) && preg_match('#^/files/photos/[a-z0-9]+\.(jpg|png|webp)$#', $photo)) $image = site_url() . $photo;
$designOg = '/og/' . preg_replace('/[^a-z0-9-]/', '', (string)$r['order']['template_slug']) . '.png';
if (!$image && is_file(__DIR__ . $designOg)) $image = site_url() . $designOg;

$h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$meta = sprintf('<meta property="og:type" content="profile"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s"><meta name="description" content="%s"><meta name="robots" content="noindex">',
    $h($title), $h($desc), $h($url), $h($desc));
if ($image) $meta .= sprintf('<meta property="og:image" content="%s"><meta name="twitter:card" content="summary_large_image">', $h($image));

$html = (string)file_get_contents($shell);
$html = preg_replace('#<title>.*?</title>#s', '<title>' . $h($title) . '</title>', $html, 1);
$html = preg_replace('#<meta (property|name)="(og:[^"]+|twitter:[^"]+|description)"[^>]*>#', '', $html);
$html = str_replace('</head>', $meta . '</head>', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
echo $html;
