<?php
declare(strict_types=1);

function http_post(string $url, array $opts = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10] + $opts);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_string($res) ? $res : ''];
}

/** SMS (Eskiz.uz). Sozlanmagan bo‘lsa — PHP error log'ga yoziladi. */
function send_sms(string $phone, string $text): bool
{
    $email = env('ESKIZ_EMAIL');
    $pass = env('ESKIZ_PASSWORD');
    if (!$email || !$pass) {
        error_log("[sms→$phone] $text");
        return true;
    }
    $cache = storage_dir() . '/.eskiz_token';
    $token = is_file($cache) && filemtime($cache) > time() - 25 * 86400 ? trim((string)file_get_contents($cache)) : '';
    for ($attempt = 0; $attempt < 2; $attempt++) {
        if (!$token) {
            [, $res] = http_post('https://notify.eskiz.uz/api/auth/login', [CURLOPT_POSTFIELDS => ['email' => $email, 'password' => $pass]]);
            $token = json_decode($res, true)['data']['token'] ?? '';
            if (!$token) return false;
            file_put_contents($cache, $token);
        }
        [$code] = http_post('https://notify.eskiz.uz/api/message/sms/send', [
            CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
            CURLOPT_POSTFIELDS => ['mobile_phone' => ltrim($phone, '+'), 'message' => $text, 'from' => env('ESKIZ_FROM', '4546')],
        ]);
        if ($code === 401) { $token = ''; @unlink($cache); continue; }
        return $code >= 200 && $code < 300;
    }
    return false;
}

function tg_send(string $chatId, string $text): bool
{
    $token = env('TELEGRAM_BOT_TOKEN');
    if (!$token) {
        error_log("[telegram→$chatId] $text");
        return true;
    }
    [$code] = http_post("https://api.telegram.org/bot$token/sendMessage", [
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => true], JSON_UNESCAPED_UNICODE),
    ]);
    return $code === 200;
}
/** Telegramga yuborib, xabar id sini qaytaradi (chat javoblarini bog‘lash uchun). Sozlanmagan bo‘lsa — null */
function tg_send_id(string $chatId, string $text): ?int
{
    $token = env('TELEGRAM_BOT_TOKEN');
    if (!$token || !$chatId) { error_log("[telegram→$chatId] $text"); return null; }
    [$code, $res] = http_post("https://api.telegram.org/bot$token/sendMessage", [
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => true], JSON_UNESCAPED_UNICODE),
    ]);
    return $code === 200 ? (int)(json_decode($res, true)['result']['message_id'] ?? 0) ?: null : null;
}
function notify_admin(string $text): bool { return tg_send(env('TELEGRAM_ADMIN_CHAT_ID') ?? 'admin', $text); }
function notify_user(?string $telegramId, string $text): bool { return $telegramId ? tg_send($telegramId, $text) : false; }

function verify_telegram_auth(array $data): bool
{
    $token = env('TELEGRAM_BOT_TOKEN');
    if (!$token || empty($data['hash'])) return false;
    $hash = $data['hash'];
    unset($data['hash']);
    ksort($data);
    $check = implode("\n", array_map(fn($k) => "$k=" . $data[$k], array_keys($data)));
    $sig = hash_hmac('sha256', $check, hash('sha256', $token, true));
    return hash_equals($sig, $hash) && (time() - (int)($data['auth_date'] ?? 0)) < 86400;
}
