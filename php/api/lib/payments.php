<?php
declare(strict_types=1);

const PROVIDER_LABEL = ['payme' => 'Payme', 'click' => 'Click', 'rahmat' => 'Rahmat', 'google_pay' => 'Google Pay', 'p2p' => 'Boshqa usul'];


/** «Boshqa usul»: 'card' — karta raqami ko‘rsatiladi, 'support' — mijoz support bilan bog‘lanib to‘laydi */
function p2p_mode(): string
{
    return env('P2P_MODE') === 'support' ? 'support' : 'card';
}

/** To‘lov usulining holati: 'on' — ishlaydi, 'soon' — «Tez kunda» (ko‘rinadi, tanlab bo‘lmaydi), 'off' — ko‘rinmaydi */
function provider_state(string $p): string
{
    $sandbox = env('PAYMENTS_SANDBOX') === '1';
    if ($p === 'google_pay') return env('GOOGLE_PAY_ENABLED') === '1' ? 'on' : 'off';
    $key = strtoupper($p);
    // *_DISABLED = '1' — admin yashirgan (kalitlar saqlanib qoladi); *_SOON = '1' — «Tez kunda»
    if (env($key . '_DISABLED') === '1') return 'off';
    if (env($key . '_SOON') === '1') return 'soon';
    $ready = match ($p) {
        'payme' => (env('PAYME_MERCHANT_ID') && env('PAYME_KEY')) || $sandbox,
        'click' => (env('CLICK_SERVICE_ID') && env('CLICK_MERCHANT_ID') && env('CLICK_SECRET_KEY')) || $sandbox,
        'p2p' => p2p_mode() === 'support' || (bool)env('P2P_CARD'),
        'rahmat' => rahmat_ready(), // lib/rahmat.php — Kassa ID + joriy rejim kaliti
        default => false,
    };
    // sozlanmagan usul yashirilmagan bo‘lsa — «Tez kunda» bo‘lib ko‘rinadi
    return $ready ? 'on' : 'soon';
}

function enabled_providers(): array
{
    // Faqat Rahmat (uning sahifasida karta, Payme, Click, Uzum bilan to‘lash mumkin). Payme/Click/P2P to‘g‘ridan-to‘g‘ri ulanishi o‘chirilgan.
    return provider_state('rahmat') === 'on' ? ['rahmat'] : [];
}

function soon_providers(): array
{
    return provider_state('rahmat') === 'soon' ? ['rahmat'] : [];
}

function start_payment(array $order, string $provider): string
{
    $id = $order['id'];
    $returnUrl = site_url() . "/buyurtma/$id/tolov/jarayonda/?usul=$provider";
    if ($provider === 'rahmat') {
        $url = rahmat_start($order, $returnUrl); // xato bo‘lsa — buyurtma holati o‘zgarmaydi
        q("UPDATE orders SET status = 'payment_processing' WHERE id = ?", [$id]);
        return $url;
    }
    fail('Bu to‘lov usuli hozircha mavjud emas', 422);
}
