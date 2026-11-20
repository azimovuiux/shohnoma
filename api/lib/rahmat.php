<?php
declare(strict_types=1);

/*
 * Rahmat (TayyorPay shlyuzi, https://pay.sunicode.uz/developers) — REST API v1.
 * To‘lov yaratish → mijoz checkout_url’da to‘laydi → imzolangan callback (/api/rahmat/callback) buyurtmani faollashtiradi.
 * Summalar tiyinda. Kalitlar faqat Admin → To‘lov sozlamalari’da (settings jadvali) yoki .env da.
 * Test rejimi (RAHMAT_SANDBOX=1): test kaliti (sk_test_…) bilan — haqiqiy pul yechilmaydi.
 */

function rahmat_api_url(): string { return rtrim(env('RAHMAT_API_URL') ?: 'https://pay.sunicode.uz/api/v1', '/'); }
function rahmat_test_mode(): bool { return env('RAHMAT_SANDBOX') === '1'; }
/** Joriy rejim kaliti (so‘rovlar uchun) */
function rahmat_key(): ?string { $k = rahmat_test_mode() ? env('RAHMAT_TEST_KEY') : env('RAHMAT_KASSA_KEY'); return $k ?: null; }
function rahmat_ready(): bool { return (bool)env('RAHMAT_KASSA_ID') && (bool)rahmat_key(); }
function rahmat_callback_url(): string { return site_url() . '/api/rahmat/callback'; }

/** API so‘rovi: [http_code, data|null, error|null] */
function rahmat_request(string $method, string $path, ?array $body = null): array
{
    $ch = curl_init(rahmat_api_url() . $path);
    $headers = ['X-Kassa-Id: ' . env('RAHMAT_KASSA_ID'), 'X-Kassa-Key: ' . rahmat_key(), 'Accept: application/json'];
    $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_CUSTOMREQUEST => $method];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) return [0, null, ['code' => 'NETWORK', 'message' => $err ?: 'Ulanib bo‘lmadi']];
    $d = json_decode((string)$raw, true);
    if (!is_array($d)) return [$code, null, ['code' => 'BAD_RESPONSE', 'message' => 'Javob o‘qilmadi (HTTP ' . $code . ')']];
    if (empty($d['success'])) return [$code, null, is_array($d['error'] ?? null) ? $d['error'] : ['code' => 'ERROR', 'message' => 'Xatolik']];
    return [$code, $d['data'] ?? [], null];
}

/** Buyurtma uchun to‘lov yaratadi (idempotent: bir xil order_id + amount — ochiq invoys qaytadi) va checkout_url ni qaytaradi */
function rahmat_start(array $order, string $returnUrl): string
{
    if (!rahmat_ready()) fail('Rahmat to‘lovi sozlanmagan', 422);
    $amount = (int)$order['amount'] * 100;
    $body = [
        'order_id' => $order['id'],
        'amount' => $amount,
        'description' => 'Shohnoma taklifnomasi №' . $order['code'],
        'return_url' => $returnUrl,
        'callback_url' => rahmat_callback_url(),
        'lang' => 'uz',
        'metadata' => ['code' => $order['code']],
    ];
    [$http, $data, $err] = rahmat_request('POST', '/payments', $body);
    if ($err || empty($data['id']) || empty($data['checkout_url'])) {
        error_log('[rahmat] create ' . $order['code'] . ': HTTP ' . $http . ' ' . json_encode($err, JSON_UNESCAPED_UNICODE));
        fail('Rahmat to‘lov sahifasi ochilmadi. Birozdan so‘ng qayta urinib ko‘ring yoki boshqa usulni tanlang.', 502);
    }
    $ext = (string)$data['id'];
    $meta = json_encode(['test' => rahmat_test_mode(), 'checkout_url' => $data['checkout_url']], JSON_UNESCAPED_SLASHES);
    $pay = one("SELECT id FROM payments WHERE provider = 'rahmat' AND external_id = ?", [$ext]);
    if ($pay) q("UPDATE payments SET amount = ?, meta = ? WHERE id = ?", [(int)$order['amount'], $meta, $pay['id']]);
    else q("INSERT INTO payments (id, order_id, provider, amount, status, external_id, meta) VALUES (?, ?, 'rahmat', ?, 'processing', ?, ?)",
        [new_id(), $order['id'], (int)$order['amount'], $ext, $meta]);
    return (string)$data['checkout_url'];
}

/**
 * Rahmat to‘lov obyektini bazaga qo‘llaydi (callback yoki GET /payments/{id} dan). Idempotent.
 * Qaytaradi: [ok, message] — ok=false faqat to‘lovni rad etish kerak bo‘lganda (buyurtma bekor/topilmadi).
 */
function rahmat_apply(array $p): array
{
    $pay = one("SELECT * FROM payments WHERE provider = 'rahmat' AND external_id = ?", [(string)($p['id'] ?? '')]);
    if (!$pay || $pay['order_id'] !== (string)($p['order_id'] ?? '')) return [false, 'Buyurtma topilmadi'];
    $o = one('SELECT * FROM orders WHERE id = ?', [$pay['order_id']]);
    if (!$o) return [false, 'Buyurtma topilmadi'];
    if ((int)($p['amount'] ?? -1) !== (int)$pay['amount'] * 100) return [false, 'Summa mos emas'];
    $status = (string)($p['status'] ?? '');
    $meta = json_decode((string)($pay['meta'] ?? ''), true) ?: [];
    foreach (['card_pan', 'ps', 'error_message'] as $k) if (!empty($p[$k])) $meta[$k] = $p[$k];
    $receipt = !empty($p['receipt_url']) && preg_match('#^https://#', (string)$p['receipt_url']) ? (string)$p['receipt_url'] : $pay['receipt_url'];
    q('UPDATE payments SET meta = ?, receipt_url = ? WHERE id = ?', [json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $receipt, $pay['id']]);

    if ($status === 'success' || $status === 'partially_refunded' || $status === 'refunded') {
        if ($pay['status'] !== 'paid') {
            if ($o['status'] === 'archived') return [false, 'Buyurtma arxivlangan'];
            mark_order_paid($o['id'], 'rahmat', $pay['id']);
            q("UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, UTC_TIMESTAMP()) WHERE id = ?", [$pay['id']]);
        }
        if ($status !== 'success') {
            try { notify_admin("↩️ Rahmat: №{$o['code']} bo‘yicha pul qaytarildi (" . number_format((int)($p['refunded_amount'] ?? 0) / 100, 0, '', ' ') . " so‘m). Buyurtma holatini admin panelda tekshiring."); } catch (Throwable) {}
        }
        return [true, ''];
    }
    if ($status === 'failed' || $status === 'cancelled') {
        if ($pay['status'] !== 'paid') {
            q('UPDATE payments SET status = ? WHERE id = ?', [$status === 'failed' ? 'failed' : 'cancelled', $pay['id']]);
            // faqat shu to‘lov kutilayotgan bo‘lsa — buyurtma qayta to‘lov holatiga
            $latest = latest_payment($o['id']);
            if ($o['status'] === 'payment_processing' && $latest && $latest['id'] === $pay['id'])
                q('UPDATE orders SET status = ? WHERE id = ?', [$status === 'failed' ? 'payment_failed' : 'pending_payment', $o['id']]);
        }
        return [true, ''];
    }
    return [true, '']; // new / pending — hech narsa
}

/** Callback kelmagan bo‘lsa — holatni API’dan so‘rab olish (holat sahifasi so‘raganda, 8 soniyada bir martadan ko‘p emas) */
function rahmat_sync(array $pay): void
{
    if ($pay['provider'] !== 'rahmat' || $pay['status'] !== 'processing' || !$pay['external_id'] || !rahmat_ready()) return;
    $meta = json_decode((string)($pay['meta'] ?? ''), true) ?: [];
    if (time() - (int)($meta['synced'] ?? 0) < 8) return;
    $meta['synced'] = time();
    q('UPDATE payments SET meta = ? WHERE id = ?', [json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $pay['id']]);
    [, $data, $err] = rahmat_request('GET', '/payments/' . rawurlencode($pay['external_id']));
    if (!$err && is_array($data)) rahmat_apply($data);
}
