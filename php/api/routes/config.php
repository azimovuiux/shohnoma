<?php
declare(strict_types=1);

route('GET', '/config', function () {
    json_out([
        'ok' => true,
        'providers' => enabled_providers(),
        'p2p' => ['card' => env('P2P_CARD', '8600 3104 7752 9018'), 'holder' => env('P2P_HOLDER', 'SHOHNOMA SERVIS'), 'bank' => env('P2P_BANK', 'UZCARD')],
        'telegramBot' => env('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME') ?? env('TELEGRAM_BOT_USERNAME'),
        'sandbox' => env('PAYMENTS_SANDBOX') === '1',
        'siteUrl' => site_url(),
    ]);
});
