<?php
declare(strict_types=1);

route('GET', '/config', function () {
    json_out([
        'ok' => true,
        'providers' => enabled_providers(),
        'p2p' => ['card' => env('P2P_CARD', '8600 3104 7752 9018'), 'holder' => env('P2P_HOLDER', 'SHOHNOMA SERVIS'), 'bank' => env('P2P_BANK', 'UZCARD')],
        'telegramBot' => tg_bot_username(),
        'sandbox' => env('PAYMENTS_SANDBOX') === '1',
        'siteUrl' => site_url(),
    ]);
});
