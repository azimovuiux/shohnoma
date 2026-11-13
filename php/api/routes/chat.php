<?php
declare(strict_types=1);

/*
 * Sayt chati: mehmon ism + telefon qoldiradi, keyin yozishadi.
 * Xabarlar admin panelda (/admin/chatlar/) va Telegram botda (TELEGRAM_ADMIN_CHAT_ID) ko‘rinadi.
 * Telegramda bot xabariga "Reply" qilib javob yozilsa — javob saytdagi chatga qaytadi (webhook).
 */
const CHAT_COOKIE = 'sh_chat';

function chat_session(): ?array
{
    $t = $_COOKIE[CHAT_COOKIE] ?? '';
    return $t ? one('SELECT * FROM chat_sessions WHERE token_hash = ?', [hash('sha256', $t)]) : null;
}

function chat_msg_out(array $m): array
{
    return ['id' => (int)$m['id'], 'sender' => $m['sender'], 'text' => $m['text'], 'createdAt' => iso($m['created_at'])];
}

function chat_session_out(array $s): array
{
    return ['id' => $s['id'], 'name' => $s['name'], 'phone' => $s['phone'], 'telegram' => !empty($s['tg_chat_id']), 'tgUsername' => $s['tg_username'] ?? null, 'page' => $s['page'], 'status' => $s['status'], 'unread' => (int)$s['unread_admin'], 'createdAt' => iso($s['created_at']), 'lastAt' => iso($s['last_at'])];
}

function chat_add(string $sid, string $sender, string $text, ?int $tgId = null): array
{
    q('INSERT INTO chat_messages (session_id, sender, text, tg_message_id) VALUES (?, ?, ?, ?)', [$sid, $sender, $text, $tgId]);
    $id = (int)db()->lastInsertId();
    if ($sender === 'user') q('UPDATE chat_sessions SET last_at = UTC_TIMESTAMP(), unread_admin = unread_admin + 1, status = \'open\' WHERE id = ?', [$sid]);
    else q('UPDATE chat_sessions SET last_at = UTC_TIMESTAMP() WHERE id = ?', [$sid]);
    return one('SELECT * FROM chat_messages WHERE id = ?', [$id]);
}

/** Telegramga: "#chat-id" sarlavha bilan; bot xabar id si saqlanadi — reply shu orqali topiladi */
function chat_to_telegram(array $s, string $text, int $msgId): void
{
    $admin = env('TELEGRAM_ADMIN_CHAT_ID');
    if (!$admin || !env('TELEGRAM_BOT_TOKEN')) return;
    $head = "💬 {$s['name']} · {$s['phone']}";
    $tg = tg_send_id($admin, "$head\n\n$text\n\n↩️ Javob berish uchun shu xabarga Reply qiling");
    if ($tg) q('UPDATE chat_messages SET tg_message_id = ? WHERE id = ?', [$tg, $msgId]);
}

route('POST', '/chat/start', function () {
    $b = body();
    $name = str_in($b['name'] ?? '', 80);
    $phone = normalize_phone($b['phone'] ?? '');
    if (mb_strlen($name) < 2) fail('Ismingizni kiriting', 422);
    if (!$phone) fail('Telefon raqam to‘liq emas', 422);
    if (rate_limited('chat-start:' . client_ip(), 6, 3600)) fail('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429);
    $token = new_token();
    $id = new_id();
    q('INSERT INTO chat_sessions (id, token_hash, name, phone, page) VALUES (?, ?, ?, ?, ?)', [$id, hash('sha256', $token), $name, $phone, str_in($b['page'] ?? '', 255) ?: null]);
    cookie_set(CHAT_COOKIE, $token, time() + 90 * 86400);
    $s = one('SELECT * FROM chat_sessions WHERE id = ?', [$id]);
    $first = str_in($b['text'] ?? '', 2000);
    if ($first !== '') {
        $m = chat_add($id, 'user', $first);
        chat_to_telegram($s, $first, (int)$m['id']);
    } else {
        $tg = tg_send_id((string)env('TELEGRAM_ADMIN_CHAT_ID'), "🆕 Saytda yangi chat: {$name} · {$phone}\n\n↩️ Javob berish uchun shu xabarga Reply qiling");
        if ($tg) q('INSERT INTO chat_messages (session_id, sender, text, tg_message_id) VALUES (?, \'system\', ?, ?)', [$id, 'Chat boshlandi', $tg]);
    }
    chat_add($id, 'bot', "Rahmat, {$name}! Savolingizni yozing — menejerimiz shu yerda javob beradi. Odatda bir necha daqiqada javob beramiz.");
    json_out(['ok' => true, 'session' => chat_session_out($s)]);
});

route('GET', '/chat', function () {
    $s = chat_session();
    if (!$s) json_out(['ok' => true, 'session' => null, 'messages' => []]);
    $after = max(0, (int)($_GET['after'] ?? 0));
    $rows = all('SELECT * FROM chat_messages WHERE session_id = ? AND id > ? AND sender <> \'system\' ORDER BY id LIMIT 200', [$s['id'], $after]);
    json_out(['ok' => true, 'session' => chat_session_out($s), 'messages' => array_map('chat_msg_out', $rows)]);
});

route('POST', '/chat/messages', function () {
    $s = chat_session() ?? fail('Chat topilmadi. Qayta boshlang.', 404);
    $text = str_in(body()['text'] ?? '', 2000);
    if ($text === '') fail('Xabar bo‘sh', 422);
    if (rate_limited('chat-msg:' . $s['id'], 30, 600)) fail('Juda tez yozyapsiz. Biroz kuting.', 429);
    $m = chat_add($s['id'], 'user', $text);
    chat_to_telegram($s, $text, (int)$m['id']);
    json_out(['ok' => true, 'message' => chat_msg_out($m)]);
});

/* ── Admin ── */
route('GET', '/admin/chats', function () {
    require_admin();
    $rows = all('SELECT s.*, (SELECT text FROM chat_messages m WHERE m.session_id = s.id AND m.sender IN (\'user\',\'admin\') ORDER BY m.id DESC LIMIT 1) AS last_text FROM chat_sessions s ORDER BY s.last_at DESC LIMIT 200');
    json_out(['ok' => true, 'items' => array_map(fn($s) => chat_session_out($s) + ['lastText' => $s['last_text']], $rows)]);
});

route('GET', '/admin/chats/:id', function ($p) {
    require_admin();
    $s = one('SELECT * FROM chat_sessions WHERE id = ?', [$p['id']]) ?? fail('Chat topilmadi', 404);
    $after = max(0, (int)($_GET['after'] ?? 0));
    if ((int)$s['unread_admin'] > 0) q('UPDATE chat_sessions SET unread_admin = 0 WHERE id = ?', [$s['id']]);
    $rows = all('SELECT * FROM chat_messages WHERE session_id = ? AND id > ? AND sender <> \'system\' ORDER BY id', [$s['id'], $after]);
    json_out(['ok' => true, 'session' => chat_session_out($s), 'messages' => array_map('chat_msg_out', $rows)]);
});

route('POST', '/admin/chats/:id', function ($p) {
    require_admin();
    $s = one('SELECT * FROM chat_sessions WHERE id = ?', [$p['id']]) ?? fail('Chat topilmadi', 404);
    $b = body();
    if (isset($b['status'])) {
        q('UPDATE chat_sessions SET status = ? WHERE id = ?', [$b['status'] === 'closed' ? 'closed' : 'open', $s['id']]);
        json_out(['ok' => true]);
    }
    $text = str_in($b['text'] ?? '', 2000);
    if ($text === '') fail('Xabar bo‘sh', 422);
    // Telegram mijozi: javob botdan uning chatiga yuboriladi
    if (!empty($s['tg_chat_id']) && tg_api('sendMessage', ['chat_id' => $s['tg_chat_id'], 'text' => $text]) === null) fail('Telegram’ga yuborilmadi — mijoz botni to‘xtatgan bo‘lishi mumkin', 502);
    $m = chat_add($s['id'], 'admin', $text);
    json_out(['ok' => true, 'message' => chat_msg_out($m)]);
});

/* ── Telegram webhook: admin bot xabariga Reply qilsa → saytdagi chatga ── */
function tg_webhook_secret(): string { return substr(hash('sha256', 'tg-webhook:' . env('SESSION_SECRET', 'dev') . ':' . env('TELEGRAM_BOT_TOKEN', '')), 0, 48); }

route('POST', '/telegram/webhook', function () {
    if (!hash_equals(tg_webhook_secret(), (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? ''))) {
        // Kalit eskirgan bo‘lishi mumkin — webhookni yangi kalit bilan qayta ulaymiz (keyingi xabarlar o‘tadi)
        tg_webhook_sync(true);
        fail('Forbidden', 403);
    }
    // Har qanday xatoda ham Telegram'ga 200 qaytariladi: aks holda bitta "buzuq" xabar navbatni to‘sib qo‘yadi
    try {
        tg_webhook_handle(json_decode((string)file_get_contents('php://input'), true) ?: []);
    } catch (Throwable $e) {
        error_log('[shohnoma] telegram webhook: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    }
    json_out(['ok' => true]);
});

function tg_webhook_handle(array $u): void
{
    $msg = $u['message'] ?? null;
    if ($msg && (tg_admin_link_handle($msg) || tg_login_handle($msg))) json_out(['ok' => true]);
    $admin = (string)env('TELEGRAM_ADMIN_CHAT_ID');
    if (!$msg) json_out(['ok' => true]);
    if ((string)($msg['chat']['id'] ?? '') !== $admin) {
        // Botga shaxsiy yozgan mijoz → support suhbati (admin guruhga yuboriladi)
        if (($msg['chat']['type'] ?? '') === 'private' && empty($msg['from']['is_bot'])) tg_support_incoming($msg, $admin);
        json_out(['ok' => true]);
    }
    $replyTo = (int)($msg['reply_to_message']['message_id'] ?? 0);
    $text = trim((string)($msg['text'] ?? $msg['caption'] ?? ''));
    if (!$replyTo) {
        if ($text !== '' && !str_starts_with($text, '/') && ($msg['chat']['type'] ?? '') === 'private') tg_send($admin, 'Mijozga javob berish uchun uning xabariga Reply qiling.');
        json_out(['ok' => true]);
    }
    $orig = one('SELECT * FROM chat_messages WHERE tg_message_id = ?', [$replyTo]);
    if (!$orig) json_out(['ok' => true]); // boshqa xabarga reply (guruhdagi oddiy suhbat) — e’tiborsiz
    $s = one('SELECT * FROM chat_sessions WHERE id = ?', [$orig['session_id']]);
    if (!$s) json_out(['ok' => true]);
    if (!empty($s['tg_chat_id'])) {
        // Telegram mijozi: javob botdan mijozga boradi (matn yoki rasm/ovoz/fayl — nusxa)
        $ok = isset($msg['text'])
            ? tg_api('sendMessage', ['chat_id' => $s['tg_chat_id'], 'text' => mb_substr($text, 0, 4000)]) !== null
            : tg_api('copyMessage', ['chat_id' => $s['tg_chat_id'], 'from_chat_id' => $admin, 'message_id' => (int)$msg['message_id']]) !== null;
        if (!$ok) tg_send($admin, '⚠️ Javob yetkazilmadi — mijoz botni to‘xtatgan (bloklagan) bo‘lishi mumkin.');
        chat_add($s['id'], 'admin', $text !== '' ? mb_substr($text, 0, 2000) : tg_media_label($msg));
        json_out(['ok' => true]);
    }
    if ($text === '' || !isset($msg['text'])) { tg_send($admin, 'Saytdagi chatga faqat matnli javob yuboriladi.'); json_out(['ok' => true]); }
    chat_add($orig['session_id'], 'admin', mb_substr($text, 0, 2000));
    json_out(['ok' => true]);
}

/** Matnsiz xabar uchun qisqa belgi (admin panel tarixida) */
function tg_media_label(array $m): string
{
    foreach (['photo' => '🖼 Rasm', 'video' => '🎬 Video', 'voice' => '🎤 Ovozli xabar', 'video_note' => '🎥 Video xabar', 'audio' => '🎵 Audio', 'document' => '📎 Fayl', 'sticker' => '🙂 Stiker', 'location' => '📍 Joylashuv', 'contact' => '👤 Kontakt'] as $k => $label)
        if (isset($m[$k])) return $label . (!empty($m['caption']) ? ': ' . mb_substr((string)$m['caption'], 0, 1900) : '');
    return '✉️ Xabar';
}

/** Botga yozgan mijozning xabari → suhbat (chat_sessions) + admin guruhga (Reply bilan javob beriladi) */
function tg_support_incoming(array $msg, string $admin): void
{
    $chat = (string)$msg['chat']['id'];
    $from = $msg['from'] ?? [];
    $text = trim((string)($msg['text'] ?? ''));
    if (str_starts_with($text, '/')) {
        tg_api('sendMessage', ['chat_id' => $chat, 'text' => 'Savolingizni oddiy xabar qilib yozing — support jamoamiz shu yerda javob beradi.']);
        return;
    }
    if (rate_limited('tg-support:' . $chat, 40, 600)) return;
    $name = mb_substr(trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'Telegram foydalanuvchi', 0, 80);
    $username = !empty($from['username']) ? mb_substr((string)$from['username'], 0, 64) : null;
    $s = one('SELECT * FROM chat_sessions WHERE tg_chat_id = ?', [$chat]);
    $fresh = false;
    if (!$s) {
        // Saytda Telegram orqali kirgan foydalanuvchi bo‘lsa — telefon raqami ham ko‘rinadi
        $u = one('SELECT phone FROM users WHERE telegram_id = ?', [(string)($from['id'] ?? '')]);
        $id = new_id();
        q('INSERT INTO chat_sessions (id, token_hash, name, phone, page, tg_chat_id, tg_username) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$id, hash('sha256', 'tg:' . $chat . ':' . new_token()), $name, (string)($u['phone'] ?? ''), 'Telegram bot', $chat, $username]);
        $s = one('SELECT * FROM chat_sessions WHERE id = ?', [$id]);
        $fresh = true;
    } elseif ($s['name'] !== $name || $s['tg_username'] !== $username) {
        q('UPDATE chat_sessions SET name = ?, tg_username = ? WHERE id = ?', [$name, $username, $s['id']]);
    }
    $stored = $text !== '' ? mb_substr($text, 0, 2000) : tg_media_label($msg);
    $quiet = !$fresh && (int)(one("SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ? AND sender = 'user' AND created_at > ?", [$s['id'], gmdate('Y-m-d H:i:s', time() - 3600)])['n'] ?? 0) > 0;
    $m = chat_add($s['id'], 'user', $stored);

    $who = "{$name}" . ($username ? " (@{$username})" : '') . ($s['phone'] ? " · {$s['phone']}" : '');
    $tgId = null;
    if ($admin && env('TELEGRAM_BOT_TOKEN')) {
        if (isset($msg['text'])) {
            $tgId = tg_send_id($admin, "🤖 Botda · {$who}\n\n{$text}\n\n↩️ Javob berish uchun shu xabarga Reply qiling");
        } else {
            // rasm/ovoz/fayl: avval sarlavha, keyin xabarning nusxasi (ikkalasiga ham Reply qilsa bo‘ladi)
            $head = tg_send_id($admin, "🤖 Botda · {$who}\n\n" . tg_media_label($msg) . "\n\n↩️ Javob berish uchun shu xabarga yoki pastdagisiga Reply qiling");
            $copy = tg_api('copyMessage', ['chat_id' => $admin, 'from_chat_id' => $chat, 'message_id' => (int)$msg['message_id']]);
            $tgId = $head;
            if (!empty($copy['message_id'])) q('INSERT INTO chat_messages (session_id, sender, text, tg_message_id) VALUES (?, \'system\', ?, ?)', [$s['id'], 'media', (int)$copy['message_id']]);
        }
    }
    if ($tgId) q('UPDATE chat_messages SET tg_message_id = ? WHERE id = ?', [$tgId, (int)$m['id']]);
    // Birinchi xabarga (yoki 1 soat jim turgandan keyin) qisqa javob — mijoz xabari yetganini bilsin
    if (!$quiet) tg_api('sendMessage', ['chat_id' => $chat, 'text' => 'Xabaringiz qabul qilindi ✅ Support jamoamiz shu chatda javob beradi (odatda bir necha daqiqada, ish vaqtida).']);
}

/** Admin: Telegram webhookni ulash (bot token sozlangan bo‘lsa) */
route('POST', '/admin/telegram/setup', function () {
    require_admin();
    $token = env('TELEGRAM_BOT_TOKEN');
    if (!$token || !env('TELEGRAM_ADMIN_CHAT_ID')) fail('.env faylida TELEGRAM_BOT_TOKEN va TELEGRAM_ADMIN_CHAT_ID sozlanmagan', 422);
    [$code, $res] = http_post("https://api.telegram.org/bot$token/setWebhook", [
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['url' => site_url() . '/api/telegram/webhook', 'secret_token' => tg_webhook_secret(), 'allowed_updates' => ['message']]),
    ]);
    $d = json_decode($res, true) ?: [];
    if ($code !== 200 || empty($d['ok'])) fail('Telegram: ' . ($d['description'] ?? "xato ($code)"), 502);
    json_out(['ok' => true]);
});

route('GET', '/admin/telegram/status', function () {
    require_admin();
    json_out(['ok' => true, 'configured' => (bool)(env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_ADMIN_CHAT_ID'))]);
});
