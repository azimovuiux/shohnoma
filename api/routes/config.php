<?php
declare(strict_types=1);

route('GET', '/config', function () {
    json_out([
        'ok' => true,
        'providers' => enabled_providers(),
        'providersSoon' => soon_providers(),
        'p2p' => ['mode' => p2p_mode(), 'card' => env('P2P_CARD', ''), 'holder' => env('P2P_HOLDER', ''), 'bank' => env('P2P_BANK', ''), 'supportTg' => env('P2P_SUPPORT_TG'), 'supportPhone' => env('P2P_SUPPORT_PHONE')],
        'telegramBot' => tg_bot_username(),
        'gaId' => env('GA_MEASUREMENT_ID'),
        'sandbox' => env('PAYMENTS_SANDBOX') === '1',
        'siteUrl' => site_url(),
    ]);
});
