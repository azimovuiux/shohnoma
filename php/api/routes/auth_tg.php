<?php
declare(strict_types=1);

/*
 * Telegram orqali kirish / ro‘yxatdan o‘tish (bot orqali):
 * 1) sayt: POST /auth/tg/start → t.me/<bot>?start=login_<kod> havolasi (kod shu brauzerga bog‘langan)
 * 2) bot: /start login_<kod> → "📱 Raqamni yuborish" tugmasi (request_contact)
 * 3) foydalanuvchi o‘z kontaktini yuboradi → hisob topiladi yoki yaratiladi, kirish tasdiqlanadi
 * 4) sayt: GET /auth/tg/status (har 2 soniyada) → tasdiqlangan bo‘lsa sessiya ochiladi
 */
const TG_LOGIN_COOKIE = 'sh_tgl';
const TG_LOGIN_TTL = 600;

function tg_phone(?string $raw): ?string
{
    $d = preg_replace('/\D/', '', (string)$raw);
    if (preg_match('/^998\d{9}$/', $d)) return "+$d";
    return strlen($d) >= 10 && strlen($d) <= 15 ? "+$d" : null;
}

/**
 * Webhook holatini tekshiradi va kerak bo‘lsa qayta ulaydi (har 5 daqiqada ko‘pi bilan bir marta, $force — darhol).
 * Qayta ulanadi: manzil boshqa bo‘lsa yoki Telegram so‘nggi 15 daqiqada xato qayd etgan bo‘lsa
 * (masalan, maxfiy kalit o‘zgarib 403 qaytgan) — shunda bot o‘z-o‘zidan tiklanadi.
 */
function tg_webhook_sync(bool $force = false): ?array
{
    if (!env('TELEGRAM_BOT_TOKEN')) return null;
    $url = site_url() . '/api/telegram/webhook';
    $flag = storage_dir() . '/.tg_webhook_' . substr(sha1(env('TELEGRAM_BOT_TOKEN', '') . $url), 0, 12);
    if (!$force && is_file($flag) && time() - (int)@filemtime($flag) < 300) return null;
    $info = tg_api('getWebhookInfo', []);
    $broken = $info === null
        || ($info['url'] ?? '') !== $url
        || ((int)($info['last_error_date'] ?? 0) > time() - 900);
    if ($broken) {
        $set = tg_api('setWebhook', ['url' => $url, 'secret_token' => tg_webhook_secret(), 'allowed_updates' => ['message']]);
        if ($set !== null) $info = tg_api('getWebhookInfo', []) ?? $info;
        else error_log('[shohnoma] Telegram setWebhook bajarilmadi');
    }
    @touch($flag);
    return $info;
}
function tg_ensure_webhook(): void { tg_webhook_sync(); }

route('POST', '/auth/tg/start', function () {
    $bot = tg_bot_username() ?? fail('Telegram orqali kirish hozircha sozlanmagan', 503);
    tg_ensure_webhook();
    if (rate_limited('tgl:' . client_ip(), 20, 600)) fail('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429);
    $code = strtolower(substr(preg_replace('/[^a-zA-Z0-9]/', '', new_token(24)), 0, 24));
    $browser = new_token();
    $cur = current_user();
    q('INSERT INTO tg_logins (id, code_hash, browser_hash, link_user_id) VALUES (?, ?, ?, ?)', [new_id(), hash('sha256', $code), hash('sha256', $browser), $cur['id'] ?? null]);
    cookie_set(TG_LOGIN_COOKIE, $browser, time() + TG_LOGIN_TTL);
    json_out(['ok' => true, 'url' => "https://t.me/$bot?start=login_$code", 'expiresIn' => TG_LOGIN_TTL]);
});

route('GET', '/auth/tg/status', function () {
    tg_webhook_sync();
    $b = $_COOKIE[TG_LOGIN_COOKIE] ?? '';
    if (!$b) json_out(['ok' => true, 'status' => 'none']);
    $r = one('SELECT *, TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS age FROM tg_logins WHERE browser_hash = ? ORDER BY created_at DESC LIMIT 1', [hash('sha256', $b)]);
    if (!$r) json_out(['ok' => true, 'status' => 'none']);
    if ($r['status'] === 'approved' && $r['user_id']) {
        q("UPDATE tg_logins SET status = 'used' WHERE id = ?", [$r['id']]);
        cookie_set(TG_LOGIN_COOKIE, '', time() - 3600);
        if (!$r['link_user_id']) create_session($r['user_id']);
        json_out(['ok' => true, 'status' => 'done', 'linked' => (bool)$r['link_user_id']]);
    }
    if ((int)$r['age'] > TG_LOGIN_TTL) json_out(['ok' => true, 'status' => 'expired']);
    json_out(['ok' => true, 'status' => $r['tg_user_id'] ? 'opened' : 'waiting']);
});

/** Bot xabari kirishga tegishli bo‘lsa — qayta ishlaydi va true qaytaradi (webhook'dan chaqiriladi) */
function tg_login_handle(array $msg): bool
{
    if (($msg['chat']['type'] ?? '') !== 'private') return false;
    $from = $msg['from'] ?? [];
    $tgId = (string)($from['id'] ?? '');
    $chat = (string)($msg['chat']['id'] ?? '');
    if ($tgId === '') return false;
    $text = trim((string)($msg['text'] ?? ''));

    // 1) /start login_<kod>
    if (preg_match('/^\/start\s+login_([a-z0-9]{8,40})$/', $text, $m)) {
        $r = one('SELECT *, TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS age FROM tg_logins WHERE code_hash = ?', [hash('sha256', $m[1])]);
        if (!$r || $r['status'] !== 'pending' || (int)$r['age'] > TG_LOGIN_TTL) {
            tg_api('sendMessage', ['chat_id' => $chat, 'text' => "Bu havola eskirgan. Saytda «Telegram orqali kirish» tugmasini qayta bosing."]);
            return true;
        }
        q('UPDATE tg_logins SET tg_user_id = ? WHERE id = ?', [$tgId, $r['id']]);
        $name = trim((string)($from['first_name'] ?? ''));
        tg_api('sendMessage', [
            'chat_id' => $chat,
            'text' => "Assalomu alaykum" . ($name ? ", $name" : '') . "! 👋\n\nShohnoma.uz saytiga kirish uchun pastdagi «📱 Raqamni yuborish» tugmasini bosing — telefon raqamingiz hisobingizga bog‘lanadi.\n\nAgar siz saytda kirish tugmasini bosmagan bo‘lsangiz — hech narsa qilmang.",
            'reply_markup' => ['keyboard' => [[['text' => '📱 Raqamni yuborish', 'request_contact' => true]]], 'resize_keyboard' => true, 'one_time_keyboard' => true],
        ]);
        return true;
    }

    // 2) Kontakt (faqat o‘z raqami)
    if (isset($msg['contact'])) {
        try {
            return tg_login_contact($msg, $from, $tgId, $chat);
        } catch (Throwable $e) {
            error_log('[shohnoma] tg login contact: ' . $e->getMessage());
            tg_api('sendMessage', ['chat_id' => $chat, 'text' => 'Kechirasiz, kirishda xatolik bo‘ldi. Saytda «Telegram orqali kirish» tugmasini qayta bosing.', 'reply_markup' => ['remove_keyboard' => true]]);
            return true;
        }
    }
    // 3) Oddiy /start (havolasiz)
    if ($text === '/start') {
        tg_api('sendMessage', ['chat_id' => $chat, 'text' => "Assalomu alaykum! Bu Shohnoma.uz boti.\n\nSaytga kirish uchun shohnoma.uz/kirish/ sahifasida «Telegram orqali kirish» tugmasini bosing."]);
        return true;
    }
    return false;
}

/** Foydalanuvchi o‘z kontaktini yubordi — hisob topiladi/yaratiladi, kirish tasdiqlanadi */
function tg_login_contact(array $msg, array $from, string $tgId, string $chat): bool
{
    $c = $msg['contact'];
    $r = one("SELECT * FROM tg_logins WHERE tg_user_id = ? AND status = 'pending' AND created_at > ? ORDER BY created_at DESC LIMIT 1", [$tgId, gmdate('Y-m-d H:i:s', time() - TG_LOGIN_TTL)]);
    if (!$r) {
        tg_api('sendMessage', ['chat_id' => $chat, 'text' => "Kirish havolasi eskirgan. Saytda «Telegram orqali kirish» tugmasini qayta bosing.", 'reply_markup' => ['remove_keyboard' => true]]);
        return true;
    }
    $remove = ['remove_keyboard' => true];
    if ((string)($c['user_id'] ?? '') !== $tgId) {
        tg_api('sendMessage', ['chat_id' => $chat, 'text' => 'Iltimos, o‘zingizning raqamingizni «📱 Raqamni yuborish» tugmasi orqali yuboring.']);
        return true;
    }
    $phone = tg_phone($c['phone_number'] ?? '');
    $tgUser = !empty($from['username']) ? '@' . $from['username'] : null;
    $name = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: null;

    if ($r['link_user_id']) {
        // Kabinetdan "Telegramni ulash"
        q('UPDATE users SET telegram_id = NULL, telegram_user = NULL WHERE telegram_id = ? AND id <> ?', [$tgId, $r['link_user_id']]);
        q('UPDATE users SET telegram_id = ?, telegram_user = ? WHERE id = ?', [$tgId, $tgUser, $r['link_user_id']]);
        $uid = $r['link_user_id'];
        $done = "✅ Telegram hisobingiz Shohnoma kabinetiga ulandi. Saytga qaytishingiz mumkin.";
    } else {
        // Telegram bir hisobga, raqam boshqa hisobga bog‘langan bo‘lishi mumkin — raqamli hisob asosiy
        // (unda buyurtmalar, admin huquqi). Telegram o‘sha hisobga ko‘chiriladi; noyob kalit to‘qnashuvi bo‘lmaydi.
        $byTg = one('SELECT * FROM users WHERE telegram_id = ?', [$tgId]);
        $byPhone = $phone ? one('SELECT * FROM users WHERE phone = ?', [$phone]) : null;
        $u = $byPhone ?: $byTg;
        if ($u) {
            if ($byTg && $byTg['id'] !== $u['id']) q('UPDATE users SET telegram_id = NULL, telegram_user = NULL WHERE id = ?', [$byTg['id']]);
            $setPhone = !$u['phone'] && $phone && !one('SELECT id FROM users WHERE phone = ? AND id <> ?', [$phone, $u['id']]);
            q('UPDATE users SET telegram_id = ?, telegram_user = ?, phone = ' . ($setPhone ? '?' : 'phone') . ', name = COALESCE(name, ?) WHERE id = ?',
                $setPhone ? [$tgId, $tgUser, $phone, $name, $u['id']] : [$tgId, $tgUser, $name, $u['id']]);
            $uid = $u['id'];
        } else {
            $uid = new_id();
            q('INSERT INTO users (id, phone, name, telegram_id, telegram_user, is_admin) VALUES (?, ?, ?, ?, ?, ?)', [$uid, $phone, $name, $tgId, $tgUser, $phone && in_array($phone, admin_phones(), true) ? 1 : 0]);
        }
        $done = "✅ Tayyor! Saytga qayting — kabinetingiz ochildi.\n\nBuyurtma holati va mehmonlar javoblari haqida shu yerga xabar yuboramiz.";
    }
    q("UPDATE tg_logins SET status = 'approved', user_id = ? WHERE id = ?", [$uid, $r['id']]);
    tg_api('sendMessage', ['chat_id' => $chat, 'text' => $done, 'reply_markup' => $remove]);
    return true;
}
