<?php
declare(strict_types=1);

/*
 * Ijtimoiy tarmoqlar va aloqa ma’lumotlari (sarlavha, footer, «Aloqa» bo‘limi, huquqiy sahifalar).
 * Admin → Sozlamalar → «Ijtimoiy tarmoqlar»da boshqariladi; settings.social (JSON).
 * Support Telegram bot (/api/support-tg) bu ro‘yxatdan tashqari — u doim bor.
 */
const SOCIAL_TYPES = ['telegram', 'instagram', 'whatsapp', 'facebook', 'youtube', 'tiktok', 'x', 'linkedin', 'email', 'website'];
const SOCIAL_MAX = 12;
const SOCIAL_DEFAULT_HOURS = 'Har kuni 9:00 – 21:00';

/** Joriy sozlama (saytga beriladigan ko‘rinish) */
function social_settings(): array
{
    $raw = db_settings()['social'] ?? '';
    $d = $raw !== '' ? (json_decode($raw, true) ?: []) : [];
    $links = [];
    foreach (($d['links'] ?? []) as $l) {
        if (!is_array($l) || !in_array($l['type'] ?? '', SOCIAL_TYPES, true) || empty($l['url'])) continue;
        $links[] = ['type' => $l['type'], 'url' => (string)$l['url'], 'label' => (string)($l['label'] ?? '')];
    }
    return [
        'links' => $links,
        'phone' => ($d['phone'] ?? '') !== '' ? (string)$d['phone'] : null,
        'workHours' => ($d['workHours'] ?? '') !== '' ? (string)$d['workHours'] : SOCIAL_DEFAULT_HOURS,
        'workHoursRu' => (string)($d['workHoursRu'] ?? ''),
        'workHoursEn' => (string)($d['workHoursEn'] ?? ''),
        'hideTelegramBot' => !empty($d['hideTelegramBot']),
    ];
}

/** Kiritilgan qiymatni to‘liq havolaga aylantirish: «@shohnoma» → https://instagram.com/shohnoma va h.k. Noto‘g‘ri bo‘lsa — null */
function social_normalize(string $type, string $v): ?string
{
    $v = trim($v);
    if ($v === '') return null;
    $handle = ltrim($v, '@');
    $plainHandle = preg_match('/^[A-Za-z0-9._-]{2,64}$/', $handle) === 1;
    switch ($type) {
        case 'email':
            $e = preg_replace('/^mailto:/i', '', $v);
            return filter_var($e, FILTER_VALIDATE_EMAIL) ? 'mailto:' . $e : null;
        case 'whatsapp':
            if (preg_match('#^https://(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/\S+$#i', $v)) return $v;
            $d = preg_replace('/\D/', '', $v);
            if (strlen($d) === 9) $d = '998' . $d;
            return preg_match('/^\d{11,15}$/', $d) ? 'https://wa.me/' . $d : null;
        case 'telegram':
            if ($plainHandle && !str_contains($handle, '.')) return 'https://t.me/' . $handle;
            break;
        case 'instagram':
            if ($plainHandle) return 'https://instagram.com/' . $handle;
            break;
        case 'tiktok':
            if ($plainHandle) return 'https://www.tiktok.com/@' . $handle;
            break;
        case 'x':
            if ($plainHandle && !str_contains($handle, '.')) return 'https://x.com/' . $handle;
            break;
        case 'youtube':
            if ($plainHandle && str_starts_with($v, '@')) return 'https://www.youtube.com/@' . $handle;
            break;
    }
    if (preg_match('#^https?://#i', $v) === 0 && preg_match('#^[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$#i', $v)) $v = 'https://' . $v;
    if (!preg_match('#^https://[^\s"<>]+$#i', $v) || strlen($v) > 300) return null;
    return $v;
}
