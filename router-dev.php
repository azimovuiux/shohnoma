<?php
// Faqat lokal sinov: `php -S localhost:8080 -t dist dist/router-dev.php` — .htaccess qoidalarini taqlid qiladi.
$uri = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)); // _next chunk nomlaridagi [id] → %5Bid%5D
$root = __DIR__;
/** Next RSC yuklamasi (index.txt) — Apache kabi text/plain (statik eksportda Next shuni kutadi; aks holda to‘liq sahifa yuklanadi) */
function serve_rsc(string $f): void { header('Content-Type: text/plain; charset=utf-8'); readfile($f); }
if (preg_match('#^/(api(/|$)|files/)#', $uri)) { require $root . '/api/index.php'; return true; }
if ($uri !== '/' && is_file($root . $uri)) return false;
if ($uri === '/sitemap-vizitka.xml') { $_GET['sitemap'] = '1'; require $root . '/card.php'; return true; }
if ($uri === '/sitemap-maqolalar.xml') { $_GET['sitemap'] = '1'; require $root . '/article.php'; return true; }
if (preg_match('#^/(?:(ru|en)/)?maqolalar/(?:([^/]+)/)?$#', $uri, $m)) { $_GET['lang'] = $m[1] ?? ''; if (!empty($m[2])) $_GET['slug'] = $m[2]; require $root . '/article.php'; return true; }
if (preg_match('#^/((?:ru/|en/)?)maqolalar/[a-z0-9-]+/index\.txt$#', $uri, $m)) { serve_rsc($root . '/' . $m[1] . 'maqolalar/_/index.txt'); return true; }
if (is_dir($root . $uri) && is_file(rtrim($root . $uri, '/') . '/index.html')) { readfile(rtrim($root . $uri, '/') . '/index.html'); return true; }
// Vizitka: /v/<slug>/ → card.php; RSC qobig‘i
if (preg_match('#^/v/[a-z0-9][a-z0-9-]{1,79}/index\.txt$#', $uri)) { serve_rsc($root . '/v/_/index.txt'); return true; }
if (preg_match('#^/v/([a-z0-9][a-z0-9-]{1,79})/?$#', $uri, $m)) { $_GET['slug'] = $m[1]; require $root . '/card.php'; return true; }
$map = [
  '#^/buyurtma/[^/]+/(.*)$#' => '/buyurtma/_/$1',
  '#^/kabinet/t/[^/]+/(.*)$#' => '/kabinet/t/_/$1',
  '#^/((?:ru/|en/)?)vizitka/buyurtma/[^/]+/(.*)$#' => '/$1vizitka/buyurtma/_/$2',
  '#^/((?:ru/|en/)?)kabinet/v/[^/]+/(.*)$#' => '/$1kabinet/v/_/$2',
  '#^/(ru|en)/buyurtma/[^/]+/(.*)$#' => '/$1/buyurtma/_/$2',
  '#^/(ru|en)/kabinet/t/[^/]+/(.*)$#' => '/$1/kabinet/t/_/$2',
];
// .htaccess dagi kabi: qobiq ichidagi fayllar ham (brauzer o‘tishlarida Next so‘raydigan …/index.txt RSC yuklamasi)
foreach ($map as $re => $to) {
  if (!preg_match($re, $uri)) continue;
  $t = $root . preg_replace($re, $to, $uri);
  if (str_ends_with($uri, '.txt')) { if (is_file($t)) { serve_rsc($t); return true; } continue; }
  $p = rtrim($t, '/') . '/index.html'; if (is_file($p)) { readfile($p); return true; }
}
// Admin qo‘shgan shablonlar (statik sahifasi yo‘q) → qobiq
if (preg_match('#^/((?:ru/|en/)?)(shablonlar|namuna)/[a-z0-9-]+/(index\.txt)?$#', $uri, $m)) {
  $f = $root . '/' . $m[1] . $m[2] . '/_/' . (!empty($m[3]) ? 'index.txt' : 'index.html');
  if (is_file($f)) { if (!empty($m[3])) serve_rsc($f); else readfile($f); return true; }
}
if (preg_match('#^/([a-z0-9][a-z0-9-]{1,79})/?$#', $uri, $m)) { $_GET['slug'] = $m[1]; require $root . '/invite.php'; return true; }
http_response_code(404); readfile($root . '/404.html'); return true;
