<?php
declare(strict_types=1);

/**
 * Shablonlar — `templates` jadvalida (admin boshqaradi). Jadval bo‘sh bo‘lsa,
 * build paytida eksport qilingan asl ro‘yxat (templates.json) bilan to‘ldiriladi.
 */
function templates_seed(): void
{
    if ((int)scalar('SELECT COUNT(*) FROM templates') > 0) return;
    $file = __DIR__ . '/templates.json';
    $list = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
    foreach ($list as $row) {
        q('INSERT IGNORE INTO templates (slug, data, sort, is_active) VALUES (?, ?, ?, 1)', [$row['slug'], json_encode($row, JSON_UNESCAPED_UNICODE), (int)($row['number'] ?? 0)]);
    }
}

/** slug => shablon (nofaol ham; `active` maydoni bilan) */
function templates(bool $fresh = false): array
{
    static $t = null;
    if ($t !== null && !$fresh) return $t;
    templates_seed();
    $t = [];
    foreach (all('SELECT * FROM templates ORDER BY sort, created_at') as $r) {
        $d = json_decode($r['data'], true) ?: [];
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
