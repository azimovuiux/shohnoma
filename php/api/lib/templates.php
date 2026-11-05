<?php
declare(strict_types=1);

/** Shablonlar (build paytida src/lib/templates.ts dan eksport qilinadi) */
function templates(): array
{
    static $t = null;
    if ($t !== null) return $t;
    $file = __DIR__ . '/templates.json';
    $list = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
    $t = [];
    foreach ($list as $row) $t[$row['slug']] = $row;
    return $t;
}
function template_get(string $slug): ?array { return templates()[$slug] ?? null; }

const CEREMONY_LABEL = ['nikoh' => 'Nikoh to‘yi', 'fotiha' => 'Fotiha to‘yi', 'sunnat' => 'Sunnat to‘yi', 'tugilgan-kun' => 'Tug‘ilgan kun', 'boshqa' => 'Boshqa'];
function ceremony_label(?string $c): string { return CEREMONY_LABEL[$c ?? ''] ?? '—'; }

function format_price(int $n, bool $withCurrency = true): string
{
    $s = number_format($n, 0, '.', ' ');
    return $withCurrency ? "$s so‘m" : $s;
}
