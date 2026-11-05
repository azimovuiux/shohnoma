<?php
declare(strict_types=1);

route('POST', '/payme', function () {
    $body = json_decode(file_get_contents('php://input') ?: 'null', true);
    $id = is_array($body) ? ($body['id'] ?? 0) : 0;
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? null) : null);
    if (!payme_authorized($auth)) json_out(payme_err($id, -32504, payme_msg('Ruxsat yo‘q', 'Недостаточно привилегий', 'Insufficient privileges')));
    if (!is_array($body) || empty($body['method'])) json_out(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32600, 'message' => 'Invalid request']]);
    json_out(handle_payme($body));
});

route('POST', '/click/prepare', function () {
    json_out(click_prepare(array_map('strval', $_POST)));
});

route('POST', '/click/complete', function () {
    json_out(click_complete(array_map('strval', $_POST)));
});
