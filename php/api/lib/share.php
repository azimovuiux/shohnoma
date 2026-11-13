<?php
declare(strict_types=1);

/**
 * Ulashish kartasi rasmi (brauzerda canvas bilan chiziladi, src/lib/shareCard) — serverda og:image uchun saqlanadi.
 * Fayl: uploads/share/<invitation_id><kalit>.jpg; kalit: "m" — umumiy havola, "g" + sha1(ism)[0..12] — shaxsiy (?m=Ism).
 * Ro‘yxat invitations.share_image ustunida: {"m": {"h": "<xesh>", "t": <unix>}, ...}
 */
const SHARE_MAX = 2 * 1024 * 1024;
const SHARE_W = 1080;
const SHARE_H = 1440;
const SHARE_GUESTS_MAX = 100;

function share_key(?string $guest): string
{
    $g = mb_strtolower(trim((string)$guest));
    return $g === '' ? 'm' : 'g' . substr(sha1($g), 0, 12);
}

function share_path(string $invId, string $key): string { return upload_root() . "/share/$invId$key.jpg"; }

/** og:image uchun: [url, w, h] yoki null (rasm yo‘q — eski umumiy rasm) */
function share_og(array $inv, ?string $guest = null): ?array
{
    $map = jdec($inv['share_image'] ?? null) ?: [];
    foreach (array_unique([share_key($guest), 'm']) as $key) {
        $h = $map[$key]['h'] ?? null;
        if ($h && is_file(share_path($inv['id'], $key))) return [site_url() . "/files/share/{$inv['id']}$key.jpg?v=$h", SHARE_W, SHARE_H];
    }
    return null;
}

/** Faqat asosiy (umumiy) rasm xeshi — mijoz qayta yuklash kerakmi, shuni biladi */
function share_main_hash(array $inv): ?string
{
    $map = jdec($inv['share_image'] ?? null) ?: [];
    return $map['m']['h'] ?? null;
}
