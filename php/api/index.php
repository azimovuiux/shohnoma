<?php
/**
 * Shohnoma API router. .htaccess barcha /api/* so‘rovlarini shu faylga yo‘naltiradi.
 * Marshrutlar Node versiyasidagi bilan bir xil (docs/API.md).
 */
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
foreach (glob(__DIR__ . '/lib/*.php') as $f) require_once $f;

$routes = [];
/** @param callable $handler fn(array $params): never */
function route(string $method, string $pattern, callable $handler): void
{
    global $routes;
    $re = '#^' . preg_replace('#:([a-zA-Z]+)#', '(?P<$1>[^/]+)', $pattern) . '$#';
    $routes[] = [$method, $re, $handler];
}

foreach (glob(__DIR__ . '/routes/*.php') as $f) require $f;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . trim(preg_replace('#^.*?/api(?=/|$)#', '', $path), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $allowed = false;
    foreach ($routes as [$m, $re, $handler]) {
        if (!preg_match($re, $path, $mt)) continue;
        $allowed = true;
        if ($m !== $method && !($m === 'GET' && $method === 'HEAD')) continue;
        $params = array_filter($mt, 'is_string', ARRAY_FILTER_USE_KEY);
        $handler(array_map('urldecode', $params));
        json_out(['ok' => true]);
    }
    fail($allowed ? 'Method not allowed' : 'Not found', $allowed ? 405 : 404);
} catch (HttpError $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    error_log('[shohnoma] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    json_out(['ok' => false, 'error' => 'Serverda xatolik. Birozdan so‘ng qayta urinib ko‘ring.'], 500);
}
