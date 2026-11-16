<?php
/**
 * Maqolalar — server tomonda yig‘iladigan sahifalar (SEO):
 *   /maqolalar/            → ro‘yxat     (?kategoriya=&sahifa=)
 *   /maqolalar/<slug>/     → maqola
 *   /sitemap-maqolalar.xml → sitemap (hreflang bilan)
 * (+ /ru/..., /en/...). Statik Next qobig‘i (maqolalar/index.html, maqolalar/_/index.html) o‘qiladi va unga
 * <title>, meta description, canonical, hreflang, OG/Twitter, JSON-LD hamda to‘liq HTML (#sh-ssr ichiga) qo‘yiladi.
 * React keyin shu #sh-ssr ni tegmasdan hydratsiya qiladi va ichidagi JSON (#sh-ssr-data) dan xuddi shu ko‘rinishni chizadi.
 * Belgilash (klasslar) src/components/articles/* bilan bir xil bo‘lishi shart.
 */
declare(strict_types=1);
require __DIR__ . '/api/lib/bootstrap.php';
foreach (glob(__DIR__ . '/api/lib/*.php') as $f) require_once $f;

$lang = in_array($_GET['lang'] ?? '', ['ru', 'en'], true) ? (string)$_GET['lang'] : 'uz';

const ART_T = [
    'Bosh sahifa' => ['ru' => 'Главная', 'en' => 'Home'],
    'Maqolalar' => ['ru' => 'Статьи', 'en' => 'Articles'],
    'Foydali' => ['ru' => 'Полезные', 'en' => 'Useful'],
    'maqolalar' => ['ru' => 'статьи', 'en' => 'articles'],
    'To‘y tayyorgarligi, taklifnoma matnlari va mehmonlar bilan ishlash bo‘yicha foydali maslahatlar.' => [
        'ru' => 'Полезные советы о подготовке к торжеству, текстах приглашений и работе со списком гостей.',
        'en' => 'Practical tips on planning your celebration, invitation wording and managing your guest list.'],
    'Barchasi' => ['ru' => 'Все', 'en' => 'All'],
    '{n} daqiqa o‘qish' => ['ru' => '{n} мин чтения', 'en' => '{n} min read'],
    'Mundarija' => ['ru' => 'Содержание', 'en' => 'Contents'],
    'Maqolani ulashing' => ['ru' => 'Поделитесь статьёй', 'en' => 'Share this article'],
    'Havolani nusxalash' => ['ru' => 'Копировать ссылку', 'en' => 'Copy link'],
    'O‘xshash maqolalar' => ['ru' => 'Похожие статьи', 'en' => 'Related articles'],
    'Taklifnomangizni bugun tayyorlang' => ['ru' => 'Подготовьте приглашение уже сегодня', 'en' => 'Create your invitation today'],
    'Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting — havolani mehmonlarga yuborasiz.' => [
        'ru' => 'Выберите готовый дизайн, введите свои данные — и отправьте ссылку гостям.',
        'en' => 'Pick a ready-made design, add your details and send the link to your guests.'],
    'Shablonlarni ko‘rish' => ['ru' => 'Смотреть шаблоны', 'en' => 'Browse templates'],
    'Hozircha maqola yo‘q' => ['ru' => 'Статей пока нет', 'en' => 'No articles yet'],
    'Tez orada foydali maqolalar qo‘shamiz.' => ['ru' => 'Скоро здесь появятся полезные статьи.', 'en' => 'Useful articles are coming soon.'],
    'Oldingi' => ['ru' => 'Предыдущий', 'en' => 'Previous'],
    'Keyingi' => ['ru' => 'Следующий', 'en' => 'Next'],
    'Sahifalar' => ['ru' => 'Страницы', 'en' => 'Pages'],
    'Qoralama — buni faqat admin ko‘radi' => ['ru' => 'Черновик — видит только админ', 'en' => 'Draft — visible to admins only'],
    'Maqolalar — to‘y va taklifnoma bo‘yicha maslahatlar' => ['ru' => 'Статьи о свадьбе и приглашениях', 'en' => 'Articles on weddings and invitations'],
    '{c} — maqolalar' => ['ru' => '{c} — статьи', 'en' => '{c} — articles'],
    '{n}-sahifa' => ['ru' => 'страница {n}', 'en' => 'page {n}'],
];
const ART_MONTHS = [
    'uz' => ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    'ru' => ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
];
const ART_ICONS = [
    'calendar' => '<path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15.695 13.7h.009M15.695 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.294 13.7h.01M8.294 16.7h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
    'clock' => '<path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="m15.71 15.18-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>',
    'arrowRight' => '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M14.43 5.93L20.5 12l-6.07 6.07M3.5 12h16.83"></path>',
    'arrowLeft2' => '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"></path>',
    'arrowRight2' => '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08"></path>',
    'arrowDown2' => '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M19.92 8.95l-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"></path>',
    'copy' => '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 12.9v4.2c0 3.5-1.4 4.9-4.9 4.9H6.9C3.4 22 2 20.6 2 17.1v-4.2C2 9.4 3.4 8 6.9 8h4.2c3.5 0 4.9 1.4 4.9 4.9z"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M22 6.9v4.2c0 3.5-1.4 4.9-4.9 4.9H16v-3.1C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2h4.2C20.6 2 22 3.4 22 6.9z"></path>',
];

function T(string $s, array $vars = []): string
{
    global $lang;
    $out = $lang === 'uz' ? $s : (ART_T[$s][$lang] ?? $s);
    foreach ($vars as $k => $v) $out = str_replace('{' . $k . '}', (string)$v, $out);
    return $out;
}
function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); }
function lp(string $path): string { global $lang; return $lang === 'uz' ? $path : "/$lang" . ($path === '/' ? '/' : $path); }
function abs_url(string $path): string { return site_url() . $path; }
function icon(string $name, int $size, string $class = ''): string
{
    return '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none"' . ($class ? ' class="' . $class . '"' : '') . '>' . ART_ICONS[$name] . '</svg>';
}
function tg_icon(int $size): string
{
    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21.2 4.1 2.9 11.2c-.8.3-.8 1.4 0 1.7l4.5 1.6 1.7 5.4c.2.7 1.1.9 1.6.4l2.6-2.4 4.5 3.3c.6.4 1.4.1 1.6-.6l3.1-14.7c.2-.8-.6-1.4-1.3-1.1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path><path d="m9.4 14.3 7.4-6.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>';
}
/** ISO (UTC) → [«16 noyabr 2026», «2026-11-16»] — Toshkent vaqti */
function art_date(?string $iso): array
{
    global $lang;
    if (!$iso) return ['', ''];
    $ts = strtotime($iso) + 5 * 3600;
    $d = (int)gmdate('j', $ts);
    $m = ART_MONTHS[$lang][(int)gmdate('n', $ts) - 1];
    $y = gmdate('Y', $ts);
    return ["$d $m $y", gmdate('Y-m-d', $ts)];
}
function json_ld(array $data): string
{
    return '<script type="application/ld+json">' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . '</script>';
}

function send_not_found(): never
{
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    $f = __DIR__ . '/404.html';
    if (is_file($f)) readfile($f);
    else echo '<!DOCTYPE html><title>404</title><h1>404</h1>';
    exit;
}

/** Saytning umumiy OG rasmi (Next yaratgan opengraph-image-*) — muqova bo‘lmasa */
function default_og_image(): ?string
{
    $f = glob(__DIR__ . '/opengraph-image-*') ?: [];
    return $f ? abs_url('/' . basename($f[0])) : null;
}

/** Qobiqqa meta va tarkibni qo‘yish */
function send_page(string $shellFile, string $title, string $head, string $content, int $status = 200): never
{
    global $lang;
    $shell = is_file($shellFile) ? (string)file_get_contents($shellFile) : '';
    if ($shell === '') {
        error_log('[article] qobiq topilmadi: ' . $shellFile);
        send_not_found();
    }
    $html = preg_replace('#<html lang="[a-z]+"#', '<html lang="' . $lang . '"', $shell, 1);
    $html = preg_replace('#<title>.*?</title>#s', '<title>' . h($title) . '</title>', $html, 1);
    // Ehtiyot: qobiqda umumiy SEO teglari qolgan bo‘lsa — olib tashlanadi (sahifaniki qo‘yiladi)
    $html = preg_replace('#<meta (?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+|article:[^"]+)"[^>]*/?>#', '', $html);
    $html = preg_replace('#<link rel="(?:canonical|alternate)"[^>]*/?>#', '', $html);
    $html = str_replace('</head>', $head . '</head>', $html);
    $n = 0;
    $html = str_replace('<div id="sh-ssr"></div>', '<div id="sh-ssr">' . $content . '</div>', $html, $n);
    if ($n !== 1) error_log('[article] #sh-ssr joy ushlagichi topilmadi: ' . $shellFile);
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    echo $html;
    exit;
}

function head_tags(array $o): string
{
    $out = '<meta name="description" content="' . h($o['description']) . '">';
    $out .= '<meta name="robots" content="' . h($o['robots'] ?? 'index, follow, max-image-preview:large') . '">';
    $out .= '<link rel="canonical" href="' . h($o['canonical']) . '">';
    foreach ($o['alternates'] ?? [] as $hl => $href) $out .= '<link rel="alternate" hreflang="' . h($hl) . '" href="' . h($href) . '">';
    $locale = ['uz' => 'uz_UZ', 'ru' => 'ru_RU', 'en' => 'en_US'];
    global $lang;
    $og = [
        'og:type' => $o['ogType'] ?? 'website',
        'og:site_name' => 'Shohnoma',
        'og:locale' => $locale[$lang],
        'og:title' => $o['ogTitle'],
        'og:description' => $o['description'],
        'og:url' => $o['canonical'],
    ];
    foreach ($og as $k => $v) $out .= '<meta property="' . $k . '" content="' . h($v) . '">';
    if (!empty($o['image'])) $out .= '<meta property="og:image" content="' . h($o['image']) . '"><meta property="og:image:alt" content="' . h($o['ogTitle']) . '">';
    foreach ($o['article'] ?? [] as $k => $v) if ($v) $out .= '<meta property="article:' . $k . '" content="' . h($v) . '">';
    $out .= '<meta name="twitter:card" content="' . (!empty($o['image']) ? 'summary_large_image' : 'summary') . '">';
    $out .= '<meta name="twitter:title" content="' . h($o['ogTitle']) . '"><meta name="twitter:description" content="' . h($o['description']) . '">';
    if (!empty($o['image'])) $out .= '<meta name="twitter:image" content="' . h($o['image']) . '">';
    foreach ($o['jsonld'] ?? [] as $j) $out .= json_ld($j);
    return $out;
}

function img_abs(?string $src): ?string
{
    if (!$src) return null;
    return str_starts_with($src, '/') ? abs_url($src) : $src;
}

/* ── Belgilash (React komponentlari bilan bir xil) ── */

function breadcrumbs(array $items): string
{
    $out = '<nav aria-label="Breadcrumb" class="t-body-s text-ink-2"><ol class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">';
    $last = count($items) - 1;
    foreach ($items as $i => [$label, $href]) {
        if ($i === $last) $out .= '<li aria-current="page" class="min-w-0 max-w-full truncate text-ink">' . h($label) . '</li>';
        else $out .= '<li><a href="' . h($href) . '" class="transition-colors hover:text-maroon">' . h($label) . '</a></li><li aria-hidden="true">/</li>';
    }
    return $out . '</ol></nav>';
}

function card(array $c, string $tag): string
{
    global $lang;
    [$date, $dt] = art_date($c['publishedAt']);
    $cat = article_category_name($c['category'], $lang);
    $media = $c['cover']
        ? '<img src="' . h($c['cover']) . '" alt="' . h($c['title']) . '" loading="lazy" decoding="async" class="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]">'
        : '<div class="flex aspect-[16/10] w-full items-center justify-center bg-gold-soft"><span class="font-serif text-[44px] font-light italic text-maroon/35">Shohnoma</span></div>';
    $out = '<article class="group flex min-w-0 flex-col">';
    $out .= '<a href="' . h($c['url']) . '" tabindex="-1" aria-hidden="true" class="block overflow-hidden rounded-card bg-bg-soft">' . $media . '</a>';
    $out .= '<div class="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 t-body-s text-ink-2">';
    if ($cat) $out .= '<span class="t-annotation text-gold">' . h($cat) . '</span><span aria-hidden="true">·</span>';
    $out .= '<time datetime="' . $dt . '">' . h($date) . '</time></div>';
    $out .= "<$tag class=\"mt-2 font-serif text-[26px] font-normal leading-[1.15] text-ink\"><a href=\"" . h($c['url']) . '" class="transition-colors hover:text-maroon">' . h($c['title']) . "</a></$tag>";
    if ($c['excerpt'] !== '') $out .= '<p class="t-body-m mt-2 line-clamp-3 text-ink-2">' . h($c['excerpt']) . '</p>';
    return $out . '</article>';
}

function list_url(?string $cat, int $page): string
{
    $q = [];
    if ($cat) $q['kategoriya'] = $cat;
    if ($page > 1) $q['sahifa'] = $page;
    return lp('/maqolalar/') . ($q ? '?' . http_build_query($q) : '');
}

function chip(string $label, int $n, bool $active, string $href): string
{
    return '<a href="' . h($href) . '"' . ($active ? ' aria-current="page"' : '') . ' class="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors '
        . ($active ? 'bg-maroon text-ink-inverse' : 'bg-bg-soft text-ink hover:bg-[#efe9df]') . '">' . h($label)
        . '<span aria-hidden="true" class="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold leading-none tabular-nums transition-colors '
        . ($active ? 'bg-white/20 text-ink-inverse' : 'bg-maroon/10 text-maroon') . '">' . $n . '</span></a>';
}

function pagination(?string $cat, int $page, int $pages): string
{
    if ($pages < 2) return '';
    $btn = 'inline-flex size-11 items-center justify-center rounded-full border t-nav transition-colors';
    $out = '<nav aria-label="' . h(T('Sahifalar')) . '" class="mt-14 flex flex-wrap items-center justify-center gap-2">';
    if ($page > 1) $out .= '<a href="' . h(list_url($cat, $page - 1)) . '" rel="prev" aria-label="' . h(T('Oldingi')) . '" class="' . $btn . ' border-line text-ink hover:border-maroon hover:text-maroon">' . icon('arrowLeft2', 16) . '</a>';
    for ($i = 1; $i <= $pages; $i++) {
        $out .= $i === $page
            ? '<span aria-current="page" class="' . $btn . ' border-maroon bg-maroon text-ink-inverse">' . $i . '</span>'
            : '<a href="' . h(list_url($cat, $i)) . '" class="' . $btn . ' border-line text-ink hover:border-maroon hover:text-maroon">' . $i . '</a>';
    }
    if ($page < $pages) $out .= '<a href="' . h(list_url($cat, $page + 1)) . '" rel="next" aria-label="' . h(T('Keyingi')) . '" class="' . $btn . ' border-line text-ink hover:border-maroon hover:text-maroon">' . icon('arrowRight2', 16) . '</a>';
    return $out . '</nav>';
}

function island(array $data): string
{
    return '<script type="application/json" id="sh-ssr-data">' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . '</script>';
}

/* ── Sitemap ── */

if (isset($_GET['sitemap'])) {
    try {
        $rows = all("SELECT id, slug, lang, group_id, updated_at, published_at FROM articles WHERE status = 'published' ORDER BY published_at DESC");
    } catch (Throwable $e) {
        error_log('[article sitemap] ' . $e->getMessage());
        $rows = [];
    }
    $w3c = fn(?string $dt) => $dt ? gmdate('Y-m-d\TH:i:s\Z', strtotime($dt . ' UTC')) : null;
    $groups = [];
    $latest = [];
    foreach ($rows as $r) {
        $groups[$r['group_id']][$r['lang']] = $r;
        if (!isset($latest[$r['lang']]) || $r['updated_at'] > $latest[$r['lang']]) $latest[$r['lang']] = $r['updated_at'];
    }
    $alt = function (array $byLang): string {
        if (count($byLang) < 2) return '';
        $o = '';
        foreach (ARTICLE_LANGS as $l) if (isset($byLang[$l])) $o .= '<xhtml:link rel="alternate" hreflang="' . $l . '" href="' . h(abs_url(article_path($l, $byLang[$l]))) . '"/>';
        $def = $byLang['uz'] ?? reset($byLang);
        $defLang = isset($byLang['uz']) ? 'uz' : array_key_first($byLang);
        return $o . '<xhtml:link rel="alternate" hreflang="x-default" href="' . h(abs_url(article_path($defLang, $def))) . '"/>';
    };
    $x = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
    // Ro‘yxat sahifalari — maqolasi bor tillar uchun
    $listLangs = [];
    foreach (ARTICLE_LANGS as $l) if (isset($latest[$l])) $listLangs[$l] = '';
    foreach (array_keys($listLangs) as $l) {
        $x .= '<url><loc>' . h(abs_url(article_path($l))) . '</loc><lastmod>' . $w3c($latest[$l]) . '</lastmod><changefreq>weekly</changefreq><priority>0.7</priority>' . $alt($listLangs) . "</url>\n";
    }
    foreach ($rows as $r) {
        $byLang = array_map(fn($g) => $g['slug'], $groups[$r['group_id']]);
        $x .= '<url><loc>' . h(abs_url(article_path($r['lang'], $r['slug']))) . '</loc><lastmod>' . $w3c($r['updated_at']) . '</lastmod><changefreq>monthly</changefreq><priority>0.6</priority>' . $alt($byLang) . "</url>\n";
    }
    $x .= '</urlset>';
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    echo $x;
    exit;
}

/* ── Maqola ── */

$slug = isset($_GET['slug']) ? (string)$_GET['slug'] : null;
$preview = false;

if ($slug !== null) {
    try {
        $a = article_get_by_slug($slug);
        if ($a && $a['status'] !== 'published') {
            $preview = ($_GET['preview'] ?? '') === '1' && (bool)(current_user()['is_admin'] ?? false);
            if (!$preview) $a = null;
        }
    } catch (Throwable $e) {
        error_log('[article] ' . $e->getMessage());
        $a = null;
    }
    if (!$a) send_not_found();

    // Boshqa tildagi manzil (/ru/maqolalar/<uz-slug>/ — masalan, til almashtirgichdan): shu tildagi tarjimaga yoki ro‘yxatga
    if ($a['lang'] !== $lang && !$preview) {
        $tr = one("SELECT slug FROM articles WHERE group_id = ? AND lang = ? AND status = 'published'", [$a['group_id'], $lang]);
        header('Cache-Control: no-cache');
        header('Location: ' . ($tr ? article_path($lang, $tr['slug']) : article_path($lang)), true, $tr ? 301 : 302);
        exit;
    }

    $full = article_full($a);
    $related = $preview ? [] : article_related($a);
    $url = abs_url($full['url']);
    $cat = article_category_name($full['category'], $lang);
    [$date, $dt] = art_date($full['publishedAt'] ?? $full['updatedAt']);
    $title = $full['seoTitle'] ?: $full['title'] . ' · Shohnoma';
    $cover = img_abs($full['cover']);
    $image = $cover ?? default_og_image();

    $alternates = [];
    if (count($full['translations']) > 1) {
        foreach ($full['translations'] as $t) $alternates[$t['lang']] = abs_url($t['url']);
        $alternates['x-default'] = $alternates['uz'] ?? reset($alternates);
    }
    $listUrl = lp('/maqolalar/');
    $crumbs = [[T('Bosh sahifa'), lp('/')], [T('Maqolalar'), $listUrl], [$full['title'], $full['url']]];
    $jsonld = [
        [
            '@context' => 'https://schema.org',
            '@type' => 'BlogPosting',
            'headline' => mb_substr($full['title'], 0, 110),
            'description' => $full['description'],
            'image' => $image ? [$image] : null,
            'datePublished' => $full['publishedAt'],
            'dateModified' => $full['updatedAt'],
            'inLanguage' => $lang,
            'url' => $url,
            'mainEntityOfPage' => ['@type' => 'WebPage', '@id' => $url],
            'articleSection' => $cat,
            'wordCount' => $full['wordCount'],
            'author' => ['@type' => 'Organization', 'name' => 'Shohnoma', 'url' => abs_url(lp('/'))],
            'publisher' => ['@type' => 'Organization', 'name' => 'Shohnoma', 'url' => abs_url('/'), 'logo' => ['@type' => 'ImageObject', 'url' => abs_url('/icon-512.png')]],
        ],
        [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(fn($c, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => abs_url($c[1])], $crumbs, array_keys($crumbs)),
        ],
    ];
    $jsonld[0] = array_filter($jsonld[0], fn($v) => $v !== null);

    $head = head_tags([
        'description' => $full['description'],
        'robots' => $preview ? 'noindex, nofollow' : null,
        'canonical' => $url,
        'alternates' => $alternates,
        'ogType' => 'article',
        'ogTitle' => $full['seoTitle'] ?: $full['title'],
        'image' => $image,
        'article' => ['published_time' => $full['publishedAt'], 'modified_time' => $full['updatedAt'], 'section' => $cat],
        'jsonld' => $preview ? [] : $jsonld,
    ]);

    // Tarkib (src/components/articles/ArticleView.tsx bilan bir xil)
    $tg = 'https://t.me/share/url?url=' . rawurlencode($url) . '&text=' . rawurlencode($full['title']);
    $hasToc = count($full['toc']) > 0;
    $c = '<div class="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 lg:pt-12 xl:px-[120px]">';
    if ($preview) $c .= '<p class="mb-6 rounded-input bg-gold-soft px-4 py-3 t-body-m text-maroon">' . h(T('Qoralama — buni faqat admin ko‘radi')) . '</p>';
    $c .= breadcrumbs($crumbs);
    $c .= '<header class="mx-auto mt-8 max-w-[860px] text-center lg:mt-12">';
    if ($cat) $c .= '<a href="' . h(list_url($full['category'], 1)) . '" class="t-annotation text-gold transition-colors hover:text-maroon">' . h($cat) . '</a>';
    $c .= '<h1 class="mt-4 font-serif text-[38px] font-light leading-[1.06] text-ink sm:text-[48px] lg:text-[64px]">' . h($full['title']) . '</h1>';
    if ($full['excerpt'] !== '') $c .= '<p class="t-body-l mx-auto mt-5 max-w-[680px] text-ink-2">' . h($full['excerpt']) . '</p>';
    $c .= '<div class="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 t-body-s text-ink-2">';
    if ($date) $c .= '<span class="inline-flex items-center gap-1.5">' . icon('calendar', 16) . '<time datetime="' . $dt . '">' . h($date) . '</time></span>';
    $c .= '<span class="inline-flex items-center gap-1.5">' . icon('clock', 16) . h(T('{n} daqiqa o‘qish', ['n' => $full['readingMinutes']])) . '</span>';
    $c .= '</div></header>';
    if ($full['cover']) $c .= '<figure class="mx-auto mt-10 max-w-[1200px] overflow-hidden rounded-card bg-bg-soft lg:mt-14"><img src="' . h($full['cover']) . '" alt="' . h($full['title']) . '" fetchpriority="high" decoding="async" class="aspect-[16/9] w-full object-cover"></figure>';
    $c .= '<div class="mx-auto mt-10 grid max-w-[1200px] gap-8 lg:mt-16 lg:gap-16 ' . ($hasToc ? 'lg:grid-cols-[240px_minmax(0,780px)]' : 'lg:max-w-[760px]') . '">';
    if ($hasToc) {
        $c .= '<aside class="min-w-0"><div class="lg:sticky lg:top-28">';
        $c .= '<details class="group/toc rounded-panel border border-line bg-bg-soft lg:hidden"><summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 t-title text-ink [&amp;::-webkit-details-marker]:hidden">' . h(T('Mundarija')) . icon('arrowDown2', 16, 'transition-transform group-open/toc:rotate-180') . '</summary><ol class="flex flex-col gap-2.5 px-5 pb-5 t-body-m">';
        foreach ($full['toc'] as $t) $c .= '<li><a href="#' . h($t['id']) . '" class="text-ink-2 transition-colors hover:text-maroon">' . h($t['text']) . '</a></li>';
        $c .= '</ol></details>';
        $c .= '<nav aria-label="' . h(T('Mundarija')) . '" class="hidden lg:block"><p class="t-annotation text-ink-2">' . h(T('Mundarija')) . '</p><ol class="mt-4 flex flex-col border-l border-line">';
        foreach ($full['toc'] as $t) $c .= '<li><a href="#' . h($t['id']) . '" class="-ml-px block border-l-2 border-transparent py-1.5 pl-4 t-body-m text-ink-2 transition-colors hover:text-maroon">' . h($t['text']) . '</a></li>';
        $c .= '</ol></nav></div></aside>';
    }
    $c .= '<div class="min-w-0"><div class="sh-prose">' . $full['html'] . '</div>';
    $c .= '<div class="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between"><p class="t-title text-ink">' . h(T('Maqolani ulashing')) . '</p><div class="flex flex-wrap gap-2.5">';
    $c .= '<a href="' . h($tg) . '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">' . tg_icon(16) . 'Telegram</a>';
    $c .= '<button type="button" class="btn btn-secondary btn-sm">' . icon('copy', 16) . h(T('Havolani nusxalash')) . '</button>';
    $c .= '</div></div>';
    $c .= '<section class="mt-12 overflow-hidden rounded-card bg-maroon-deep px-6 py-10 text-ink-inverse sm:px-10 lg:py-12"><p class="t-annotation text-[#e2c48c]">Shohnoma</p><h2 class="mt-3 font-serif text-[32px] font-light leading-[1.08] lg:text-[44px]">' . h(T('Taklifnomangizni bugun tayyorlang')) . '</h2><p class="t-body-l mt-3 max-w-[520px] opacity-80">' . h(T('Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting — havolani mehmonlarga yuborasiz.')) . '</p><a href="' . h(lp('/shablonlar/')) . '" class="btn mt-7 bg-bg-base text-maroon hover:bg-white">' . h(T('Shablonlarni ko‘rish')) . icon('arrowRight', 16) . '</a></section>';
    $c .= '</div></div>';
    if ($related) {
        $c .= '<section class="mx-auto mt-20 max-w-[1200px] border-t border-line pt-12 lg:mt-28"><h2 class="font-serif text-[34px] font-light leading-none text-ink lg:text-[44px]">' . h(T('O‘xshash maqolalar')) . '</h2><div class="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">';
        foreach ($related as $r) $c .= card($r, 'h3');
        $c .= '</div></section>';
    }
    $c .= '</div>';
    $c .= island(['kind' => 'article', 'path' => $full['url'], 'data' => ['article' => $full, 'related' => $related]]);

    send_page(__DIR__ . lp('/maqolalar/') . '_/index.html', $title, $head, $c);
}

/* ── Ro‘yxat ── */

$cat = (string)($_GET['kategoriya'] ?? '');
$cat = isset(ARTICLE_CATEGORIES[$cat]) ? $cat : null;
$rawPage = (string)($_GET['sahifa'] ?? '1');
if (!preg_match('/^[1-9]\d{0,3}$/', $rawPage)) send_not_found();
$page = (int)$rawPage;
try {
    $L = article_list($lang, $cat, $page);
    $langsWith = array_column(all("SELECT DISTINCT lang FROM articles WHERE status = 'published'"), 'lang');
} catch (Throwable $e) {
    error_log('[article list] ' . $e->getMessage());
    $L = ['items' => [], 'total' => 0, 'all' => 0, 'page' => 1, 'pages' => 1, 'per' => ARTICLE_PER_PAGE, 'category' => null, 'categories' => []];
    $langsWith = [];
}
if ($page > $L['pages']) send_not_found();

$catName = article_category_name($cat, $lang);
$baseTitle = $catName ? T('{c} — maqolalar', ['c' => $catName]) : T('Maqolalar — to‘y va taklifnoma bo‘yicha maslahatlar');
if ($page > 1) $baseTitle .= ' — ' . T('{n}-sahifa', ['n' => $page]);
$desc = T('To‘y tayyorgarligi, taklifnoma matnlari va mehmonlar bilan ishlash bo‘yicha foydali maslahatlar.');
$canonical = abs_url(list_url($cat, $page));
$alternates = [];
if (!$cat && $page === 1 && count($langsWith) > 1) {
    foreach (ARTICLE_LANGS as $l) if (in_array($l, $langsWith, true)) $alternates[$l] = abs_url(article_path($l));
    $alternates['x-default'] = $alternates['uz'] ?? reset($alternates);
}
$crumbs = [[T('Bosh sahifa'), lp('/')], [T('Maqolalar'), lp('/maqolalar/')]];
$jsonld = [
    [
        '@context' => 'https://schema.org',
        '@type' => 'Blog',
        'name' => 'Shohnoma — ' . T('Maqolalar'),
        'description' => $desc,
        'url' => abs_url(lp('/maqolalar/')),
        'inLanguage' => $lang,
        'publisher' => ['@type' => 'Organization', 'name' => 'Shohnoma', 'url' => abs_url('/'), 'logo' => ['@type' => 'ImageObject', 'url' => abs_url('/icon-512.png')]],
        'blogPost' => array_map(fn($it) => array_filter([
            '@type' => 'BlogPosting',
            'headline' => mb_substr($it['title'], 0, 110),
            'url' => abs_url($it['url']),
            'datePublished' => $it['publishedAt'],
            'image' => img_abs($it['cover']),
        ]), $L['items']),
    ],
    [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => array_map(fn($c, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => abs_url($c[1])], $crumbs, array_keys($crumbs)),
    ],
];
$head = head_tags([
    'description' => $desc,
    'robots' => $L['all'] === 0 ? 'noindex, follow' : null,
    'canonical' => $canonical,
    'alternates' => $alternates,
    'ogTitle' => $baseTitle,
    'image' => default_og_image(),
    'jsonld' => $L['all'] === 0 ? [] : $jsonld,
]);

// Tarkib (src/components/articles/ArticleList.tsx bilan bir xil)
$c = '<div class="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 lg:pt-12 xl:px-[120px]">';
$c .= breadcrumbs($crumbs);
$c .= '<div class="mt-6 max-w-[760px]"><h1 class="font-serif text-[42px] font-light leading-[1.04] text-ink lg:text-[64px]">' . h(T('Foydali')) . ' <em class="italic text-maroon">' . h(T('maqolalar')) . '</em></h1><p class="t-body-l mt-3 text-ink-2">' . h($desc) . '</p></div>';
if ($L['categories']) {
    $c .= '<div class="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">';
    $c .= chip(T('Barchasi'), $L['all'], !$cat, list_url(null, 1));
    foreach ($L['categories'] as $k) $c .= chip(article_category_name($k['slug'], $lang), $k['count'], $cat === $k['slug'], list_url($k['slug'], 1));
    $c .= '</div>';
}
if (!$L['items']) {
    $c .= '<div class="mt-10 flex flex-col items-center gap-3 rounded-card bg-bg-soft px-6 py-16 text-center"><p class="font-serif text-[32px] font-light text-ink">' . h(T('Hozircha maqola yo‘q')) . '</p><p class="t-body-m text-ink-2">' . h(T('Tez orada foydali maqolalar qo‘shamiz.')) . '</p><a href="' . h(lp('/shablonlar/')) . '" class="btn btn-primary btn-sm mt-3">' . h(T('Shablonlarni ko‘rish')) . icon('arrowRight', 15) . '</a></div>';
} else {
    $c .= '<div class="mt-8 grid gap-x-6 gap-y-12 border-t border-line pt-10 md:grid-cols-2 lg:grid-cols-3">';
    foreach ($L['items'] as $it) $c .= card($it, 'h2');
    $c .= '</div>';
    $c .= pagination($cat, $page, $L['pages']);
}
$c .= '</div>';
$c .= island(['kind' => 'list', 'path' => lp('/maqolalar/'), 'query' => ['category' => $cat, 'page' => $page], 'data' => $L]);

send_page(__DIR__ . lp('/maqolalar/') . 'index.html', $baseTitle . ' · Shohnoma', $head, $c);
