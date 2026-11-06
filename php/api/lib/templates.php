<?php
declare(strict_types=1);

/**
 * Shablonlar — `templates` jadvalida (admin boshqaradi). Jadval bo‘sh bo‘lsa,
 * build paytida eksport qilingan asl ro‘yxat (templates.json) bilan to‘ldiriladi.
 */
function templates_seed(): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    $file = __DIR__ . '/templates.json';
    $list = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
    // Koddagi har bir shablon bazaga bir marta qo‘shiladi (admin o‘chirsa — qaytib kelmaydi)
    $raw = db_settings()['tpl_seeded'] ?? '';
    $seeded = $raw !== '' ? (json_decode($raw, true) ?: []) : array_column(all('SELECT slug FROM templates'), 'slug');
    $changed = $raw === '';
    foreach ($list as $row) {
        if (!isset($row['slug']) || in_array($row['slug'], $seeded, true)) continue;
        q('INSERT IGNORE INTO templates (slug, data, sort, is_active) VALUES (?, ?, ?, 1)', [$row['slug'], json_encode($row, JSON_UNESCAPED_UNICODE), (int)($row['number'] ?? 0)]);
        $seeded[] = $row['slug'];
        $changed = true;
    }
    if ($changed) setting_set('tpl_seeded', json_encode(array_values($seeded)));
}

/** slug => shablon (nofaol ham; `active` maydoni bilan) */
function templates(bool $fresh = false): array
{
    static $t = null;
    if ($t !== null && !$fresh) return $t;
    templates_seed();
    $t = [];
    // Kodda yozilgan shablonlar: maydonlar sxemasi (fields) har doim koddagi eng so‘nggi versiyadan olinadi
    $code = [];
    $file = __DIR__ . '/templates.json';
    foreach ((is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : []) as $row) if (isset($row['slug'])) $code[$row['slug']] = $row;
    foreach (all('SELECT * FROM templates ORDER BY sort, created_at') as $r) {
        $d = json_decode($r['data'], true) ?: [];
        if (($d['kind'] ?? '') !== 'html' && isset($code[$r['slug']])) {
            if (isset($code[$r['slug']]['fields'])) $d['fields'] = $code[$r['slug']]['fields'];
            // Koddagi rasmlar (masalan, kartadagi scroll preview) bazada bo‘lmasa — qo‘shiladi
            $d['images'] = ($d['images'] ?? []) + ($code[$r['slug']]['images'] ?? []);
        }
        $d['slug'] = $r['slug'];
        $d['number'] = (int)$r['sort'];
        $d['active'] = (bool)$r['is_active'];
        $t[$r['slug']] = $d;
    }
    return $t;
}
function template_get(string $slug): ?array { return templates()[$slug] ?? null; }
function template_active(string $slug): ?array { $t = template_get($slug); return $t && $t['active'] ? $t : null; }

const CEREMONY_LABEL = ['nikoh' => 'Nikoh to‘yi', 'fotiha' => 'Fotiha to‘yi', 'sunnat' => 'Sunnat to‘yi', 'tugilgan-kun' => 'Tug‘ilgan kun', 'boshqa' => 'Boshqa'];
function ceremony_label(?string $c): string { return CEREMONY_LABEL[$c ?? ''] ?? '—'; }

function format_price(int $n, bool $withCurrency = true): string
{
    $s = number_format($n, 0, '.', ' ');
    return $withCurrency ? "$s so‘m" : $s;
}
