<?php
declare(strict_types=1);

/*
 * To‘lov faqat Rahmat (TayyorPay) orqali — routes/rahmat.php.
 * Rahmat kassasida avval yozilgan eski manzillar ham ishlaydi:
 *   /api/click/complete — Rahmat callback’i (imzo bilan tekshiriladi),
 *   /api/click/prepare  — to‘lovdan keyin mijozni buyurtma sahifasiga qaytarish.
 */
route('POST', '/click/complete', fn() => rahmat_callback_handle());
route('POST', '/click/prepare', fn() => rahmat_return_redirect());
route('GET', '/click/prepare', fn() => rahmat_return_redirect());
