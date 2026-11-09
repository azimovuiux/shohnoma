<?php
declare(strict_types=1);

/* ── Admin: sayt sozlamalari (Telegram bot, to‘lovlar) ── */
const SETTING_SECRET = ['TELEGRAM_BOT_TOKEN', 'PAYME_KEY', 'CLICK_SECRET_KEY'];

function settings_out(): array
{
    $out = [];
    foreach (SETTING_KEYS as $k) {
        $v = env($k);
        $fromDb = (db_settings()[$k] ?? '') !== '';
        $out[$k] = in_array($k, SETTING_SECRET, true)
            ? ['set' => (bool)$v, 'hint' => $v ? '••••' . substr($v, -4) : null, 'source' => $v ? ($fromDb ? 'admin' : 'env') : null]
            : ['set' => (bool)$v, 'value' => $v, 'source' => $v ? ($fromDb ? 'admin' : 'env') : null];
    }
    $bot = env('TELEGRAM_BOT_TOKEN') ? tg_bot_username() : null;
    $hook = site_url() . '/api/telegram/webhook';
    $info = $bot ? tg_api('getWebhookInfo', []) : null;
    // Webhook ulanmagan yoki boshqa manzilga qarab tursa — qayta ulaymiz
    if ($bot && $info !== null && ($info['url'] ?? '') !== $hook) {
        tg_api('setWebhook', ['url' => $hook, 'secret_token' => tg_webhook_secret(), 'allowed_updates' => ['message']]);
        $info = tg_api('getWebhookInfo', []);
    }
    return ['settings' => $out, 'telegram' => [
        'bot' => $bot,
        'adminLinked' => (bool)env('TELEGRAM_ADMIN_CHAT_ID'),
        'adminChatIsGroup' => str_starts_with((string)env('TELEGRAM_ADMIN_CHAT_ID'), '-'),
        'webhook' => $hook,
        'webhookOk' => $info !== null && ($info['url'] ?? '') === $hook,
        'webhookError' => $info['last_error_message'] ?? null,
    ]];
}

route('GET', '/admin/settings', function () {
    require_admin();
    json_out(['ok' => true] + settings_out());
});

route('PUT', '/admin/settings', function () {
    require_admin();
    $b = body();
    foreach (SETTING_KEYS as $k) {
        if (!array_key_exists($k, $b)) continue;
        $v = trim((string)($b[$k] ?? ''));
        if ($k === 'TELEGRAM_BOT_TOKEN' && $v !== '') {
            if (!preg_match('/^\d{5,15}:[A-Za-z0-9_-]{30,50}$/', $v)) fail('Bot token noto‘g‘ri ko‘rinishda. BotFather bergan tokenni to‘liq nusxalang.', 422);
            $ch = curl_init("https://api.telegram.org/bot$v/getMe");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
            $d = json_decode((string)curl_exec($ch), true);
            curl_close($ch);
            if (empty($d['ok'])) fail('Telegram bu tokenni qabul qilmadi. Tokenni tekshiring.', 422);
        }
        if ($k === 'GA_MEASUREMENT_ID' && $v !== '') {
            $v = strtoupper($v);
            if (!preg_match('/^(G|GTM)-[A-Z0-9]{4,16}$/', $v)) fail('ID «G-XXXXXXXXXX» (Google Analytics) yoki «GTM-XXXXXXX» (Tag Manager) ko‘rinishida bo‘lsin.', 422);
        }
        if (str_ends_with($k, '_DISABLED')) $v = $v === '1' ? '1' : '';
        if ($k === 'P2P_CARD' && $v !== '' && !preg_match('/^\d{4} ?\d{4} ?\d{4} ?\d{4}$/', $v)) fail('Karta raqami 16 ta raqam bo‘lsin', 422);
        setting_set($k, $v === '' ? null : mb_substr($v, 0, 500));
    }
    // Token o‘zgargan bo‘lsa — webhookni darhol ulaymiz
    if (!empty($b['TELEGRAM_BOT_TOKEN']) && env('TELEGRAM_BOT_TOKEN')) {
        if (tg_api('setWebhook', ['url' => site_url() . '/api/telegram/webhook', 'secret_token' => tg_webhook_secret(), 'allowed_updates' => ['message']]) === null) fail('Token saqlandi, lekin webhook ulanmadi. Birozdan so‘ng qayta saqlab ko‘ring.', 502);
    }
    json_out(['ok' => true] + settings_out());
});

/** Admin Telegramini ulash: bir martalik havola → botda /start admin_<kod> → shu chat admin bo‘ladi */
route('POST', '/admin/telegram/link', function () {
    require_admin();
    $bot = tg_bot_username() ?? fail('Avval bot tokenini saqlang', 422);
    $code = strtolower(substr(preg_replace('/[^a-zA-Z0-9]/', '', new_token(24)), 0, 20));
    setting_set('TG_ADMIN_LINK', hash('sha256', $code) . '|' . (time() + 600));
    json_out(['ok' => true, 'url' => "https://t.me/$bot?start=admin_$code", 'groupUrl' => "https://t.me/$bot?startgroup=admin_$code", 'command' => "/start@$bot admin_$code"]);
});

/** Webhook'dan: /start admin_<kod> */
function tg_admin_link_handle(array $msg): bool
{
    $text = trim((string)($msg['text'] ?? ''));
    // Shaxsiy chat: "/start admin_<kod>"; guruh: "/start@bot_nomi admin_<kod>"
    if (!preg_match('/^\/start(?:@\w+)?\s+admin_([a-z0-9]{8,40})\s*$/i', $text, $m)) return false;
    $m[1] = strtolower($m[1]);
    $chat = (string)($msg['chat']['id'] ?? '');
    [$hash, $exp] = array_pad(explode('|', db_settings()['TG_ADMIN_LINK'] ?? ''), 2, '0');
    if (!$hash || (int)$exp < time() || !hash_equals($hash, hash('sha256', $m[1]))) {
        tg_api('sendMessage', ['chat_id' => $chat, 'text' => 'Bu havola eskirgan. Admin panel → Sozlamalar → «Telegramni ulash» tugmasini qayta bosing.']);
        return true;
    }
    setting_set('TELEGRAM_ADMIN_CHAT_ID', $chat);
    setting_set('TG_ADMIN_LINK', null);
    $where = ($msg['chat']['type'] ?? '') === 'private' ? 'shu chatga' : 'shu guruhga';
    tg_api('sendMessage', ['chat_id' => $chat, 'text' => "✅ Ulandi! Endi $where keladi:\n• saytdagi chat xabarlari (javob uchun — xabarga Reply qiling)\n• yangi buyurtmalar va to‘lovlar\n• briflar va murojaatlar"]);
    return true;
}
