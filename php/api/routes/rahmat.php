<?php
declare(strict_types=1);

/* ── Rahmat (TayyorPay) callback: imzolangan POST — HMAC_SHA256(key, timestamp + "." + xom_tana) ── */
route('POST', '/rahmat/callback', fn() => rahmat_callback_handle());
route('GET', '/rahmat/return', fn() => rahmat_return_redirect());

/** Mijoz to‘lovdan qaytdi (?payment_id=&order_id=&status=) — buyurtmaning to‘lov holati sahifasiga. Holat faqat callback/API bo‘yicha. */
function rahmat_return_redirect(): never
{
    $oid = (string)($_GET['order_id'] ?? $_POST['order_id'] ?? '');
    $o = $oid !== '' && preg_match('/^[a-z0-9]{8,40}$/', $oid) ? one('SELECT id FROM orders WHERE id = ?', [$oid]) : null;
    header('Location: ' . ($o ? "/buyurtma/{$o['id']}/tolov/jarayonda/?usul=rahmat" : '/kabinet/'), true, 302);
    exit;
}

function rahmat_callback_handle(): never
{
    header('Content-Type: application/json');
    $raw = (string)file_get_contents('php://input');
    $ts = (string)($_SERVER['HTTP_X_TAYYORPAY_TIMESTAMP'] ?? '');
    $sig = strtolower((string)($_SERVER['HTTP_X_TAYYORPAY_SIGNATURE'] ?? ''));
    $valid = false;
    // asosiy yoki test kaliti bilan imzolangan bo‘lishi mumkin (test rejimidagi to‘lovlar test kaliti bilan imzolanadi)
    foreach (array_filter([env('RAHMAT_KASSA_KEY'), env('RAHMAT_TEST_KEY')]) as $key) {
        if ($sig !== '' && hash_equals(hash_hmac('sha256', $ts . '.' . $raw, $key), $sig)) { $valid = true; break; }
    }
    if (!$valid || !ctype_digit($ts) || abs(time() - (int)$ts) > 300) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'invalid signature']);
        exit;
    }
    $event = json_decode($raw, true);
    if (!is_array($event)) { echo json_encode(['success' => true]); exit; }
    if (($event['event'] ?? '') === 'tayyorpay.test') { echo json_encode(['success' => true, 'signature_valid' => true]); exit; }
    if (($event['payment']['kassa_id'] ?? '') !== env('RAHMAT_KASSA_ID')) { echo json_encode(['success' => false, 'message' => 'Kassa mos emas']); exit; }
    try {
        [$ok, $msg] = rahmat_apply($event['payment'] ?? []);
    } catch (Throwable $e) {
        error_log('[rahmat callback] ' . $e->getMessage());
        http_response_code(500); // qayta yuboriladi
        echo json_encode(['success' => false, 'message' => 'internal']);
        exit;
    }
    echo json_encode($ok ? ['success' => true] : ['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Admin: kalitlar va kassa sozlamasini tekshirish (GET /kassa) */
route('GET', '/admin/rahmat/check', function () {
    require_admin();
    if (!rahmat_ready()) fail(rahmat_test_mode() ? 'Kassa ID yoki test kaliti kiritilmagan' : 'Kassa ID yoki kassa kaliti kiritilmagan', 422);
    [$http, $data, $err] = rahmat_request('GET', '/kassa');
    if ($err) fail('Rahmat javobi: ' . ($err['message'] ?? 'xato') . ' (' . ($err['code'] ?? $http) . ')', 422);
    json_out(['ok' => true, 'kassa' => [
        'name' => $data['name'] ?? null,
        'domains' => $data['domains'] ?? [],
        'active' => (bool)($data['is_active'] ?? false),
        'testMode' => (bool)($data['test_mode'] ?? rahmat_test_mode()),
        'callbackUrl' => $data['callback_url'] ?? null,
        'returnUrl' => $data['return_url'] ?? null,
    ], 'expectedCallback' => rahmat_callback_url()]);
});
