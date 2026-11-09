<?php
declare(strict_types=1);

const PROVIDER_LABEL = ['payme' => 'Payme', 'click' => 'Click', 'google_pay' => 'Google Pay', 'p2p' => 'P2P o‘tkazma'];

function enabled_providers(): array
{
    $sandbox = env('PAYMENTS_SANDBOX') === '1';
    $list = [];
    // *_DISABLED = '1' — admin to‘lov usulini vaqtincha o‘chirib qo‘ygan (kalitlar saqlanib qoladi)
    if (((env('PAYME_MERCHANT_ID') && env('PAYME_KEY')) || $sandbox) && env('PAYME_DISABLED') !== '1') $list[] = 'payme';
    if (((env('CLICK_SERVICE_ID') && env('CLICK_MERCHANT_ID') && env('CLICK_SECRET_KEY')) || $sandbox) && env('CLICK_DISABLED') !== '1') $list[] = 'click';
    if (env('GOOGLE_PAY_ENABLED') === '1') $list[] = 'google_pay';
    if (env('P2P_DISABLED') !== '1') $list[] = 'p2p';
    return $list;
}

function start_payment(array $order, string $provider): string
{
    $id = $order['id'];
    $returnUrl = site_url() . "/buyurtma/$id/tolov/jarayonda/?usul=$provider";
    if ($provider === 'p2p') {
        q("UPDATE orders SET status = 'pending_payment' WHERE id = ?", [$id]);
        return "/buyurtma/$id/tolov/p2p/";
    }
    q("UPDATE orders SET status = 'payment_processing' WHERE id = ?", [$id]);
    $configured = $provider === 'payme' ? env('PAYME_MERCHANT_ID') : env('CLICK_SERVICE_ID');
    if (env('PAYMENTS_SANDBOX') === '1' && !$configured) return "/buyurtma/$id/tolov/sandbox/?usul=$provider";
    if ($provider === 'payme') {
        $params = sprintf('m=%s;ac.order_id=%s;a=%d;c=%s;l=uz', env('PAYME_MERCHANT_ID'), $order['code'], (int)$order['amount'] * 100, $returnUrl);
        $host = env('PAYME_TEST') === '1' ? 'https://checkout.test.paycom.uz' : 'https://checkout.paycom.uz';
        return $host . '/' . base64_encode($params);
    }
    if ($provider === 'click') {
        $q = ['service_id' => env('CLICK_SERVICE_ID'), 'merchant_id' => env('CLICK_MERCHANT_ID'), 'amount' => (string)(int)$order['amount'], 'transaction_param' => $order['code'], 'return_url' => $returnUrl];
        if (env('CLICK_MERCHANT_USER_ID')) $q['merchant_user_id'] = env('CLICK_MERCHANT_USER_ID');
        return 'https://my.click.uz/services/pay?' . http_build_query($q);
    }
    fail('Bu to‘lov usuli hozircha mavjud emas', 422);
}

/* ───────── Payme Merchant API (JSON-RPC 2.0) ───────── */

const PAYME_TIMEOUT = 43200000; // 12 soat, ms

function payme_msg(string $uz, string $ru, string $en): array { return ['uz' => $uz, 'ru' => $ru, 'en' => $en]; }
function payme_err($id, int $code, array $message, ?string $data = null): array
{
    $e = ['code' => $code, 'message' => $message];
    if ($data !== null) $e['data'] = $data;
    return ['jsonrpc' => '2.0', 'id' => $id, 'error' => $e];
}
function payme_ok($id, array $result): array { return ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result]; }
function ms(): int { return (int)floor(microtime(true) * 1000); }

function payme_authorized(?string $header): bool
{
    $key = env('PAYME_KEY');
    if (!$key || !$header || !str_starts_with($header, 'Basic ')) return false;
    $decoded = base64_decode(substr($header, 6), true) ?: '';
    [$login, $pass] = array_pad(explode(':', $decoded, 2), 2, '');
    return $login === 'Paycom' && hash_equals($key, $pass);
}

function payme_meta(array $p): array
{
    $m = jdec($p['meta'], []);
    return $m + ['state' => 0, 'create_time' => 0, 'perform_time' => 0, 'cancel_time' => 0, 'reason' => null];
}

function payme_find_order($account): ?array
{
    $code = is_array($account) ? ($account['order_id'] ?? null) : null;
    return $code ? one('SELECT * FROM orders WHERE code = ?', [(string)$code]) : null;
}
function payme_find_tx($paymeId): ?array
{
    return one("SELECT * FROM payments WHERE provider = 'payme' AND external_id = ?", [(string)$paymeId]);
}
function payme_check_order($id, ?array $o, $amount): ?array
{
    if (!$o) return payme_err($id, -31050, payme_msg('Buyurtma topilmadi', 'Заказ не найден', 'Order not found'), 'order_id');
    if (is_paid_status($o['status']) || $o['status'] === 'archived') return payme_err($id, -31051, payme_msg('Buyurtma allaqachon to‘langan', 'Заказ уже оплачен', 'Order already paid'), 'order_id');
    if ((int)$o['amount'] * 100 !== (int)$amount) return payme_err($id, -31001, payme_msg('Summa noto‘g‘ri', 'Неверная сумма', 'Wrong amount'));
    return null;
}
function payme_set_meta(string $pid, array $meta, ?string $status = null): void
{
    if ($status) q('UPDATE payments SET meta = ?, status = ? WHERE id = ?', [json_encode($meta), $status, $pid]);
    else q('UPDATE payments SET meta = ? WHERE id = ?', [json_encode($meta), $pid]);
}
function payme_expired_err($id): array { return payme_err($id, -31008, payme_msg('Tranzaksiya muddati o‘tgan', 'Истёк срок', 'Expired')); }
function payme_cannot($id): array { return payme_err($id, -31008, payme_msg('Tranzaksiyani bajarib bo‘lmaydi', 'Невозможно выполнить операцию', 'Unable to perform')); }
function payme_notfound($id): array { return payme_err($id, -31003, payme_msg('Tranzaksiya topilmadi', 'Транзакция не найдена', 'Transaction not found')); }

function handle_payme(array $body): array
{
    $id = $body['id'] ?? 0;
    $method = $body['method'] ?? '';
    $p = is_array($body['params'] ?? null) ? $body['params'] : [];
    switch ($method) {
        case 'CheckPerformTransaction':
            $o = payme_find_order($p['account'] ?? null);
            return payme_check_order($id, $o, $p['amount'] ?? 0) ?? payme_ok($id, ['allow' => true]);

        case 'CreateTransaction':
            $tx = payme_find_tx($p['id'] ?? '');
            if ($tx) {
                $m = payme_meta($tx);
                if ($m['state'] !== 1) return payme_cannot($id);
                if (ms() - $m['create_time'] > PAYME_TIMEOUT) {
                    payme_set_meta($tx['id'], ['state' => -1, 'cancel_time' => ms(), 'reason' => 4] + $m, 'cancelled');
                    return payme_expired_err($id);
                }
                return payme_ok($id, ['create_time' => $m['create_time'], 'transaction' => $tx['id'], 'state' => 1]);
            }
            $o = payme_find_order($p['account'] ?? null);
            if ($e = payme_check_order($id, $o, $p['amount'] ?? 0)) return $e;
            foreach (all("SELECT * FROM payments WHERE order_id = ? AND provider = 'payme' AND status = 'processing'", [$o['id']]) as $act) {
                if (payme_meta($act)['state'] === 1) return payme_err($id, -31050, payme_msg('Buyurtma uchun boshqa to‘lov kutilmoqda', 'Ожидается другая оплата', 'Another payment pending'), 'order_id');
            }
            $pid = new_id();
            $meta = ['state' => 1, 'create_time' => (int)($p['time'] ?? 0) ?: ms(), 'perform_time' => 0, 'cancel_time' => 0, 'reason' => null];
            q("INSERT INTO payments (id, order_id, provider, amount, status, external_id, meta) VALUES (?, ?, 'payme', ?, 'processing', ?, ?)", [$pid, $o['id'], (int)$o['amount'], (string)$p['id'], json_encode($meta)]);
            q("UPDATE orders SET status = 'payment_processing' WHERE id = ?", [$o['id']]);
            return payme_ok($id, ['create_time' => $meta['create_time'], 'transaction' => $pid, 'state' => 1]);

        case 'PerformTransaction':
            $tx = payme_find_tx($p['id'] ?? '') ?? null;
            if (!$tx) return payme_notfound($id);
            $m = payme_meta($tx);
            if ($m['state'] === 2) return payme_ok($id, ['transaction' => $tx['id'], 'perform_time' => $m['perform_time'], 'state' => 2]);
            if ($m['state'] !== 1) return payme_cannot($id);
            if (ms() - $m['create_time'] > PAYME_TIMEOUT) {
                payme_set_meta($tx['id'], ['state' => -1, 'cancel_time' => ms(), 'reason' => 4] + $m, 'cancelled');
                return payme_expired_err($id);
            }
            $pt = ms();
            payme_set_meta($tx['id'], ['state' => 2, 'perform_time' => $pt] + $m);
            mark_order_paid($tx['order_id'], 'payme', $tx['id']);
            return payme_ok($id, ['transaction' => $tx['id'], 'perform_time' => $pt, 'state' => 2]);

        case 'CancelTransaction':
            $tx = payme_find_tx($p['id'] ?? '');
            if (!$tx) return payme_notfound($id);
            $m = payme_meta($tx);
            if ($m['state'] === 1) {
                $ct = ms();
                payme_set_meta($tx['id'], ['state' => -1, 'cancel_time' => $ct, 'reason' => $p['reason'] ?? null] + $m, 'cancelled');
                q("UPDATE orders SET status = 'payment_failed' WHERE id = ?", [$tx['order_id']]);
                return payme_ok($id, ['transaction' => $tx['id'], 'cancel_time' => $ct, 'state' => -1]);
            }
            if ($m['state'] === 2) return payme_err($id, -31007, payme_msg('Buyurtma bajarilgan, bekor qilib bo‘lmaydi', 'Заказ выполнен', 'Order completed'));
            return payme_ok($id, ['transaction' => $tx['id'], 'cancel_time' => $m['cancel_time'], 'state' => $m['state']]);

        case 'CheckTransaction':
            $tx = payme_find_tx($p['id'] ?? '');
            if (!$tx) return payme_notfound($id);
            $m = payme_meta($tx);
            return payme_ok($id, ['create_time' => $m['create_time'], 'perform_time' => $m['perform_time'], 'cancel_time' => $m['cancel_time'], 'transaction' => $tx['id'], 'state' => $m['state'], 'reason' => $m['reason']]);

        case 'GetStatement':
            $from = (int)($p['from'] ?? 0);
            $to = (int)($p['to'] ?? 0);
            $rows = all("SELECT p.*, o.code FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.provider = 'payme'");
            $out = [];
            foreach ($rows as $r) {
                $m = payme_meta($r);
                if ($m['create_time'] < $from || $m['create_time'] > $to) continue;
                $out[] = ['id' => $r['external_id'], 'time' => $m['create_time'], 'amount' => (int)$r['amount'] * 100, 'account' => ['order_id' => $r['code']],
                    'create_time' => $m['create_time'], 'perform_time' => $m['perform_time'], 'cancel_time' => $m['cancel_time'], 'transaction' => $r['id'], 'state' => $m['state'], 'reason' => $m['reason']];
            }
            return payme_ok($id, ['transactions' => $out]);

        default:
            return payme_err($id, -32601, payme_msg('Metod topilmadi', 'Метод не найден', 'Method not found'));
    }
}

/* ───────── Click SHOP API ───────── */

function click_reply(array $p, int $error, string $note, array $extra = []): array
{
    return ['click_trans_id' => isset($p['click_trans_id']) && ctype_digit((string)$p['click_trans_id']) ? (int)$p['click_trans_id'] : ($p['click_trans_id'] ?? null), 'merchant_trans_id' => $p['merchant_trans_id'] ?? null, 'error' => $error, 'error_note' => $note] + $extra;
}

/** Click so‘rovidagi majburiy maydonlar va service_id tekshiruvi; xato bo‘lsa — javob, aks holda null */
function click_check(array $p, array $need): ?array
{
    foreach ($need as $k) if (!isset($p[$k]) || $p[$k] === '') return click_reply($p, -8, 'Error in request from click');
    if ((string)$p['service_id'] !== (string)env('CLICK_SERVICE_ID')) return click_reply($p, -8, 'Error in request from click');
    return null;
}

/**
 * Prepare (action=0). merchant_prepare_id sifatida Click’ning o‘z click_trans_id’si (butun son) qaytariladi —
 * Click bu maydonni raqam sifatida kutadi.
 */
function click_prepare(array $p): array
{
    if ($e = click_check($p, ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'])) return $e;
    $sign = md5($p['click_trans_id'] . $p['service_id'] . env('CLICK_SECRET_KEY', '') . $p['merchant_trans_id'] . $p['amount'] . $p['action'] . $p['sign_time']);
    if (!env('CLICK_SECRET_KEY') || !hash_equals($sign, (string)$p['sign_string'])) return click_reply($p, -1, 'SIGN CHECK FAILED!');
    if ((string)$p['action'] !== '0') return click_reply($p, -3, 'Action not found');
    $o = one('SELECT * FROM orders WHERE code = ?', [(string)$p['merchant_trans_id']]);
    if (!$o) return click_reply($p, -5, 'User does not exist');
    if (is_paid_status($o['status'])) return click_reply($p, -4, 'Already paid');
    if ($o['status'] === 'archived') return click_reply($p, -5, 'User does not exist');
    if (abs((float)$p['amount'] - (int)$o['amount']) > 0.01) return click_reply($p, -2, 'Incorrect parameter amount');
    $tid = (string)$p['click_trans_id'];
    $existing = one("SELECT * FROM payments WHERE provider = 'click' AND external_id = ?", [$tid]);
    if ($existing) {
        if ($existing['status'] === 'cancelled') return click_reply($p, -9, 'Transaction cancelled');
        if ($existing['status'] === 'paid') return click_reply($p, -4, 'Already paid');
        return click_reply($p, 0, 'Success', ['merchant_prepare_id' => (int)$tid]);
    }
    q("INSERT INTO payments (id, order_id, provider, amount, status, external_id, meta) VALUES (?, ?, 'click', ?, 'processing', ?, ?)",
        [new_id(), $o['id'], (int)$o['amount'], $tid, json_encode(['click_paydoc_id' => $p['click_paydoc_id'] ?? null])]);
    q("UPDATE orders SET status = 'payment_processing' WHERE id = ?", [$o['id']]);
    return click_reply($p, 0, 'Success', ['merchant_prepare_id' => (int)$tid]);
}

/** Complete (action=1): to‘lov yakuni (error < 0 — Click tomonda bekor qilingan) */
function click_complete(array $p): array
{
    if ($e = click_check($p, ['click_trans_id', 'service_id', 'merchant_trans_id', 'merchant_prepare_id', 'amount', 'action', 'sign_time', 'sign_string'])) return $e;
    $sign = md5($p['click_trans_id'] . $p['service_id'] . env('CLICK_SECRET_KEY', '') . $p['merchant_trans_id'] . $p['merchant_prepare_id'] . $p['amount'] . $p['action'] . $p['sign_time']);
    if (!env('CLICK_SECRET_KEY') || !hash_equals($sign, (string)$p['sign_string'])) return click_reply($p, -1, 'SIGN CHECK FAILED!');
    if ((string)$p['action'] !== '1') return click_reply($p, -3, 'Action not found');
    // merchant_prepare_id = click_trans_id (yangi), eski to‘lovlar uchun — payments.id
    $pay = one("SELECT * FROM payments WHERE provider = 'click' AND (external_id = ? OR id = ?)", [(string)$p['merchant_prepare_id'], (string)$p['merchant_prepare_id']]);
    if (!$pay) return click_reply($p, -6, 'Transaction does not exist');
    $o = one('SELECT * FROM orders WHERE id = ?', [$pay['order_id']]);
    if (!$o || $o['code'] !== (string)$p['merchant_trans_id']) return click_reply($p, -5, 'User does not exist');
    $confirm = ['merchant_confirm_id' => (int)$p['merchant_prepare_id']];
    if ($pay['status'] === 'paid') return click_reply($p, -4, 'Already paid', $confirm);
    if ($pay['status'] === 'cancelled') return click_reply($p, -9, 'Transaction cancelled');
    if ((int)($p['error'] ?? 0) < 0) {
        q("UPDATE payments SET status = 'cancelled' WHERE id = ?", [$pay['id']]);
        if (!is_paid_status($o['status'])) q("UPDATE orders SET status = 'payment_failed' WHERE id = ?", [$o['id']]);
        return click_reply($p, -9, 'Transaction cancelled');
    }
    if (abs((float)$p['amount'] - (int)$pay['amount']) > 0.01) return click_reply($p, -2, 'Incorrect parameter amount');
    if (is_paid_status($o['status'])) {
        // buyurtma boshqa yo‘l bilan allaqachon to‘langan — ikki marta yechilmasin (Click pulni qaytaradi)
        q("UPDATE payments SET status = 'cancelled' WHERE id = ?", [$pay['id']]);
        return click_reply($p, -4, 'Already paid');
    }
    mark_order_paid($o['id'], 'click', $pay['id']);
    return click_reply($p, 0, 'Success', $confirm);
}
