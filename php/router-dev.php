<?php
// Faqat lokal sinov: `php -S localhost:8080 -t dist dist/router-dev.php` — .htaccess qoidalarini taqlid qiladi.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = __DIR__;
if (preg_match('#^/(api(/|$)|files/)#', $uri)) { require $root . '/api/index.php'; return true; }
if ($uri !== '/' && is_file($root . $uri)) return false;
if (is_dir($root . $uri) && is_file(rtrim($root . $uri, '/') . '/index.html')) { readfile(rtrim($root . $uri, '/') . '/index.html'); return true; }
$map = [
  '#^/buyurtma/[^/]+/(.*)$#' => '/buyurtma/_/$1',
  '#^/kabinet/t/[^/]+/(.*)$#' => '/kabinet/t/_/$1',
];
foreach ($map as $re => $to) {
  if (preg_match($re, $uri)) { $p = $root . rtrim(preg_replace($re, $to, $uri), '/') . '/index.html'; if (is_file($p)) { readfile($p); return true; } }
}
if (preg_match('#^/([a-z0-9][a-z0-9-]{1,79})/?$#', $uri, $m)) { $_GET['slug'] = $m[1]; require $root . '/invite.php'; return true; }
http_response_code(404); readfile($root . '/404.html'); return true;
