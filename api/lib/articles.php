<?php
declare(strict_types=1);

/**
 * Maqolalar (blog): kategoriyalar, slug, HTML tozalash (allowlist), mundarija, chiqish formatlari.
 * Ommaviy sahifalar serverda yig‘iladi (php/article.php) — qidiruv tizimlari to‘liq matnni JS’siz ko‘radi.
 */

const ARTICLE_LANGS = ['uz', 'ru', 'en'];
const ARTICLE_PER_PAGE = 9;
/** Kategoriyalar — frontend src/lib/articles.ts bilan bir xil */
const ARTICLE_CATEGORIES = [
    'maslahatlar' => ['uz' => 'Maslahatlar', 'ru' => 'Советы', 'en' => 'Tips'],
    'matnlar' => ['uz' => 'Taklifnoma matnlari', 'ru' => 'Тексты приглашений', 'en' => 'Invitation wording'],
    'tashkilot' => ['uz' => 'To‘y tashkiloti', 'ru' => 'Организация торжества', 'en' => 'Event planning'],
    'yangiliklar' => ['uz' => 'Yangiliklar', 'ru' => 'Новости', 'en' => 'News'],
];

function article_category_name(?string $slug, string $lang): ?string
{
    return $slug && isset(ARTICLE_CATEGORIES[$slug]) ? ARTICLE_CATEGORIES[$slug][$lang] ?? ARTICLE_CATEGORIES[$slug]['uz'] : null;
}

/** /maqolalar/<slug>/ (uz) · /ru/maqolalar/<slug>/ */
function article_path(string $lang, ?string $slug = null): string
{
    return ($lang === 'uz' ? '' : "/$lang") . '/maqolalar/' . ($slug !== null && $slug !== '' ? "$slug/" : '');
}

/* ── Slug ── */

/** Kirill (rus + o‘zbek) → lotin; o‘zbek lotinidagi tutuq belgilari olib tashlanadi */
function article_translit(string $s): string
{
    static $map = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'yo', 'ж' => 'zh', 'з' => 'z', 'и' => 'i',
        'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
        'у' => 'u', 'ф' => 'f', 'х' => 'kh', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'shch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
        'э' => 'e', 'ю' => 'yu', 'я' => 'ya', 'ў' => 'o', 'қ' => 'q', 'ғ' => 'g', 'ҳ' => 'h',
    ];
    $s = mb_strtolower($s, 'UTF-8');
    $s = preg_replace("/[‘’'`ʻʼ]/u", '', $s);
    $s = strtr($s, $map);
    if (class_exists('Normalizer')) $s = Normalizer::normalize($s, Normalizer::FORM_KD) ?: $s;
    return (string)preg_replace('/\p{Mn}/u', '', $s);
}

function article_slugify(string $s, int $max = 90): string
{
    $s = preg_replace('/[^a-z0-9]+/', '-', article_translit($s));
    $s = trim((string)$s, '-');
    if (strlen($s) > $max) $s = rtrim(substr($s, 0, $max), '-');
    return $s;
}

function article_slug_valid(string $s): bool
{
    return (bool)preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $s) && strlen($s) >= 2 && strlen($s) <= 100;
}

function article_slug_taken(string $slug, ?string $exceptId = null): bool
{
    return (bool)scalar('SELECT 1 FROM articles WHERE slug = ? AND id <> ? LIMIT 1', [$slug, $exceptId ?? '']);
}

function article_unique_slug(string $base, ?string $exceptId = null): string
{
    $root = article_slugify($base) ?: 'maqola';
    if (strlen($root) < 2) $root .= '-maqola';
    if (!article_slug_taken($root, $exceptId)) return $root;
    for ($i = 2; ; $i++) if (!article_slug_taken("$root-$i", $exceptId)) return "$root-$i";
}

/* ── HTML tozalash (allowlist) ── */

const ART_ALLOWED = ['p', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'br', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'sub', 'sup'];
const ART_RENAME = ['b' => 'strong', 'i' => 'em', 'strike' => 's', 'del' => 's', 'h1' => 'h2', 'h5' => 'h4', 'h6' => 'h4'];
/** Ichidagisi bilan birga tashlanadi */
const ART_DROP = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'form', 'input', 'button', 'select', 'option',
    'textarea', 'svg', 'math', 'head', 'title', 'meta', 'link', 'base', 'frame', 'frameset', 'video', 'audio', 'canvas', 'dialog'];
const ART_BLOCK = ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote', 'figure', 'hr', 'table', 'pre'];
const ART_VOID = ['br', 'hr', 'img'];

function art_safe_href(string $href): ?string
{
    $href = trim(preg_replace('/[\x00-\x20]+/', ' ', $href));
    if ($href === '') return null;
    if (preg_match('#^https?://[^\s"<>]+$#i', $href)) return $href;
    if (preg_match('#^(mailto|tel):[^\s"<>]+$#i', $href)) return $href;
    if (preg_match('#^/(?!/)[^\s"<>]*$#', $href)) return $href;
    if (preg_match('#^\#[\w-]+$#u', $href)) return $href;
    return null;
}

function art_safe_src(string $src): ?string
{
    $src = trim($src);
    if (preg_match('#^https://[^\s"<>]+$#i', $src)) return $src;
    if (preg_match('#^/(files|images|templates|og)/[A-Za-z0-9._/\-]+(\?[\w=&.-]*)?$#', $src) && !str_contains($src, '..')) return $src;
    return null;
}

function art_is_external(string $href): bool
{
    if (!preg_match('#^https?://([^/]+)#i', $href, $m)) return false;
    $host = strtolower($m[1]);
    $own = strtolower((string)parse_url(site_url(), PHP_URL_HOST));
    return $host !== $own && $host !== "www.$own" && $host !== 'shohnoma.uz' && $host !== 'www.shohnoma.uz';
}

/** Sarlavha id: lotin, takrorlanmaydi */
function art_heading_id(string $text, array &$used): string
{
    $id = article_slugify($text, 60) ?: 'bolim';
    if (preg_match('/^\d/', $id)) $id = "b-$id";
    $base = $id;
    for ($i = 2; isset($used[$id]); $i++) $id = "$base-$i";
    $used[$id] = true;
    return $id;
}

/**
 * Admin yozgan HTML → xavfsiz HTML. $render = true: h2/h3 ga id, rasmlarga lazy; mundarija ($toc) to‘ldiriladi.
 * script/style/iframe, on* atributlar, style/class, javascript: havolalar — hammasi olib tashlanadi.
 */
function article_sanitize(string $html, bool $render = false, ?array &$toc = null): string
{
    $toc = [];
    $html = trim($html);
    if ($html === '') return '';
    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>' . $html . '</body></html>', LIBXML_NONET | LIBXML_COMPACT);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $body = $doc->getElementsByTagName('body')->item(0);
    if (!$body) return '';
    $ctx = ['render' => $render, 'used' => [], 'toc' => []];
    $parts = art_clean_children($body, $ctx, 0);
    // Yuqori darajadagi «yalang‘och» matn/inline elementlar — <p> ga o‘raladi
    $out = '';
    $inline = '';
    foreach ($parts as [$isBlock, $chunk]) {
        if ($isBlock) {
            if (trim(strip_tags($inline, '<img>')) !== '') $out .= '<p>' . trim($inline) . '</p>';
            $inline = '';
            $out .= $chunk;
        } else {
            $inline .= $chunk;
        }
    }
    if (trim(strip_tags($inline, '<img>')) !== '') $out .= '<p>' . trim(preg_replace('#^(<br>)+|(<br>)+$#', '', trim($inline))) . '</p>';
    $toc = $ctx['toc'];
    return $out;
}

/** @return array<array{0: bool, 1: string}> [blokmi, html] */
function art_clean_children(DOMNode $node, array &$ctx, int $depth): array
{
    $parts = [];
    foreach ($node->childNodes as $c) {
        if ($c instanceof DOMText) {
            $t = $c->nodeValue ?? '';
            if ($depth === 0 && trim($t) === '') continue;
            $parts[] = [false, htmlspecialchars(preg_replace('/\s+/u', ' ', $t), ENT_QUOTES | ENT_HTML5, 'UTF-8')];
            continue;
        }
        if (!$c instanceof DOMElement) continue;
        $tag = strtolower($c->nodeName);
        $tag = ART_RENAME[$tag] ?? $tag;
        if (in_array($tag, ART_DROP, true)) continue;
        if ($depth > 40) continue;

        if (!in_array($tag, ART_ALLOWED, true)) {
            // div/section — ichida blok bo‘lsa ochiladi, bo‘lmasa paragraf; span/font va boshqalar — faqat ichidagisi
            $inner = art_clean_children($c, $ctx, $depth);
            $hasBlock = false;
            foreach ($inner as [$b]) if ($b) $hasBlock = true;
            if (in_array($tag, ['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'center', 'address'], true) && !$hasBlock) {
                $html = trim(implode('', array_column($inner, 1)));
                $html = preg_replace('#^(<br>)+|(<br>)+$#', '', $html);
                if (trim(strip_tags($html, '<img>')) !== '') $parts[] = [true, "<p>$html</p>"];
                continue;
            }
            foreach ($inner as $p) $parts[] = $p;
            continue;
        }

        $attrs = '';
        if ($tag === 'a') {
            $href = art_safe_href($c->getAttribute('href'));
            $inner = implode('', array_column(art_clean_children($c, $ctx, $depth + 1), 1));
            if ($href === null) {
                $parts[] = [false, $inner];
                continue;
            }
            $attrs = ' href="' . htmlspecialchars($href, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            $title = trim($c->getAttribute('title'));
            if ($title !== '') $attrs .= ' title="' . htmlspecialchars(mb_substr($title, 0, 200), ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            if (art_is_external($href)) $attrs .= ' target="_blank" rel="noopener noreferrer"';
            $parts[] = [false, "<a$attrs>$inner</a>"];
            continue;
        }
        if ($tag === 'img') {
            $src = art_safe_src($c->getAttribute('src'));
            if ($src === null) continue;
            $attrs = ' src="' . htmlspecialchars($src, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '" alt="' . htmlspecialchars(mb_substr(trim($c->getAttribute('alt')), 0, 250), ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            foreach (['width', 'height'] as $a) {
                $v = (int)$c->getAttribute($a);
                if ($v > 0 && $v <= 5000) $attrs .= " $a=\"$v\"";
            }
            if ($ctx['render']) $attrs .= ' loading="lazy" decoding="async"';
            $parts[] = [false, "<img$attrs>"];
            continue;
        }
        if ($tag === 'br' || $tag === 'hr') {
            if ($tag === 'br' && $depth === 0) continue;
            $parts[] = [$tag === 'hr', "<$tag>"];
            continue;
        }
        if ($tag === 'th' || $tag === 'td') {
            foreach (['colspan', 'rowspan'] as $a) {
                $v = (int)$c->getAttribute($a);
                if ($v > 1 && $v <= 20) $attrs .= " $a=\"$v\"";
            }
        }

        $innerParts = art_clean_children($c, $ctx, $depth + 1);
        $inner = trim(implode('', array_column($innerParts, 1)));
        if (in_array($tag, ['p', 'h2', 'h3', 'h4', 'li', 'figcaption'], true)) $inner = preg_replace('#^(<br>)+|(<br>)+$#', '', $inner);
        $text = trim(html_entity_decode(strip_tags($inner), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $hasImg = str_contains($inner, '<img');
        // Bo‘sh bloklar (masalan, muharrirda qolgan <p><br></p>) tashlanadi
        if (in_array($tag, ['p', 'h2', 'h3', 'h4', 'li', 'blockquote', 'strong', 'em', 's', 'figcaption', 'ul', 'ol', 'figure', 'code', 'sub', 'sup'], true) && $text === '' && !$hasImg) continue;
        if (($tag === 'h2' || $tag === 'h3') && $ctx['render']) {
            $id = art_heading_id($text, $ctx['used']);
            $attrs .= ' id="' . $id . '"';
            if ($tag === 'h2') $ctx['toc'][] = ['id' => $id, 'text' => $text];
        }
        $html = "<$tag$attrs>$inner</$tag>";
        $parts[] = [in_array($tag, ART_BLOCK, true), $html];
    }
    return $parts;
}

function article_plain_text(string $html): string
{
    $t = html_entity_decode(strip_tags(preg_replace('#<(br|/p|/h[2-4]|/li|/blockquote)>#', ' $0', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim((string)preg_replace('/\s+/u', ' ', $t));
}

function article_word_count(string $html): int
{
    $t = article_plain_text($html);
    return $t === '' ? 0 : count(preg_split('/\s+/u', $t));
}

function article_reading_minutes(string $html): int { return max(1, (int)round(article_word_count($html) / 200)); }

/** Matnning boshidan qisqa tavsif (meta description zaxirasi) */
function article_snippet(string $text, int $max = 160): string
{
    $text = trim($text);
    if (mb_strlen($text) <= $max) return $text;
    $cut = mb_substr($text, 0, $max - 1);
    $sp = mb_strrpos($cut, ' ');
    if ($sp !== false && $sp > $max * 0.6) $cut = mb_substr($cut, 0, $sp);
    return rtrim($cut, " ,.;:—-") . '…';
}

/* ── Chiqish formatlari ── */

const ARTICLE_LIST_COLS = 'id, slug, lang, group_id, title, excerpt, category, cover, status, published_at, updated_at, created_at, CHAR_LENGTH(body) AS body_len, body';

function article_card(array $a): array
{
    return [
        'id' => $a['id'],
        'slug' => $a['slug'],
        'lang' => $a['lang'],
        'title' => $a['title'],
        'excerpt' => (string)($a['excerpt'] ?? ''),
        'category' => $a['category'] ?: null,
        'cover' => $a['cover'] ?: null,
        'publishedAt' => iso($a['published_at']),
        'updatedAt' => iso($a['updated_at']),
        'readingMinutes' => isset($a['body']) ? article_reading_minutes((string)$a['body']) : null,
        'url' => article_path($a['lang'], $a['slug']),
    ];
}

/** Bir guruhdagi (tarjimalar) nashr etilgan versiyalar: [{lang, slug, url}] — joriy maqola ham kiradi */
function article_translations(array $a, bool $publishedOnly = true): array
{
    $rows = all('SELECT id, slug, lang, title, status FROM articles WHERE group_id = ?' . ($publishedOnly ? " AND status = 'published'" : '') . ' ORDER BY FIELD(lang, \'uz\', \'ru\', \'en\')', [$a['group_id']]);
    return array_map(fn($r) => ['id' => $r['id'], 'lang' => $r['lang'], 'slug' => $r['slug'], 'title' => $r['title'], 'status' => $r['status'], 'url' => article_path($r['lang'], $r['slug'])], $rows);
}

/** To‘liq maqola (ommaviy sahifa va API uchun) */
function article_full(array $a): array
{
    $toc = [];
    $html = article_sanitize((string)$a['body'], true, $toc);
    $text = article_plain_text($html);
    $words = $text === '' ? 0 : count(preg_split('/\s+/u', $text));
    return [
        'html' => $html,
        'toc' => $toc,
        'wordCount' => $words,
        'readingMinutes' => max(1, (int)round($words / 200)),
        'seoTitle' => $a['seo_title'] ?: null,
        'seoDescription' => $a['seo_description'] ?: null,
        'description' => $a['seo_description'] ?: ($a['excerpt'] ?: article_snippet($text)),
        'status' => $a['status'],
        'translations' => article_translations($a, $a['status'] === 'published'),
    ] + article_card($a);
}

/** O‘xshash maqolalar: shu til, avval shu kategoriya, keyin eng yangilari */
function article_related(array $a, int $n = 3): array
{
    $rows = all("SELECT " . ARTICLE_LIST_COLS . " FROM articles WHERE status = 'published' AND lang = ? AND id <> ?
        ORDER BY (category <=> ?) DESC, published_at DESC LIMIT $n", [$a['lang'], $a['id'], $a['category']]);
    return array_map('article_card', $rows);
}

/** Ommaviy ro‘yxat: {items, total, page, pages, categories} */
function article_list(string $lang, ?string $category, int $page, int $per = ARTICLE_PER_PAGE): array
{
    $where = "status = 'published' AND lang = ?";
    $p = [$lang];
    if ($category) {
        $where .= ' AND category = ?';
        $p[] = $category;
    }
    $total = (int)scalar("SELECT COUNT(*) FROM articles WHERE $where", $p);
    $pages = max(1, (int)ceil($total / $per));
    $off = ($page - 1) * $per;
    $rows = all("SELECT " . ARTICLE_LIST_COLS . " FROM articles WHERE $where ORDER BY published_at DESC, created_at DESC LIMIT $per OFFSET $off", $p);
    $cats = [];
    foreach (all("SELECT category, COUNT(*) AS n FROM articles WHERE status = 'published' AND lang = ? AND category IS NOT NULL AND category <> '' GROUP BY category", [$lang]) as $r) {
        if (isset(ARTICLE_CATEGORIES[$r['category']])) $cats[$r['category']] = (int)$r['n'];
    }
    $catList = [];
    foreach (array_keys(ARTICLE_CATEGORIES) as $k) if (isset($cats[$k])) $catList[] = ['slug' => $k, 'count' => $cats[$k]];
    return [
        'items' => array_map('article_card', $rows),
        'total' => $total,
        'all' => (int)scalar("SELECT COUNT(*) FROM articles WHERE status = 'published' AND lang = ?", [$lang]),
        'page' => $page,
        'pages' => $pages,
        'per' => $per,
        'category' => $category,
        'categories' => $catList,
    ];
}

/** Admin ko‘rinishi */
function article_admin_out(array $a, bool $withBody = false): array
{
    $out = [
        'id' => $a['id'],
        'slug' => $a['slug'],
        'lang' => $a['lang'],
        'groupId' => $a['group_id'],
        'title' => $a['title'],
        'excerpt' => (string)($a['excerpt'] ?? ''),
        'category' => $a['category'] ?: null,
        'cover' => $a['cover'] ?: null,
        'seoTitle' => (string)($a['seo_title'] ?? ''),
        'seoDescription' => (string)($a['seo_description'] ?? ''),
        'status' => $a['status'],
        'publishedAt' => iso($a['published_at']),
        'createdAt' => iso($a['created_at']),
        'updatedAt' => iso($a['updated_at']),
        'wordCount' => article_word_count((string)($a['body'] ?? '')),
        'url' => article_path($a['lang'], $a['slug']),
    ];
    if ($withBody) $out['body'] = (string)$a['body'];
    return $out;
}

function article_get_by_slug(string $slug): ?array
{
    if (!article_slug_valid($slug)) return null;
    return one('SELECT * FROM articles WHERE slug = ?', [$slug]);
}
