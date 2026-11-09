<?php
declare(strict_types=1);

/*
 * HTML shablon paketi (ZIP): ochish, tekshirish, tozalash, saqlash.
 * Fayllar: <storage>/tpl/<slug>/v<N>/{index.html, style.css, <asset>}
 * Brauzerga: /files/tpl/<slug>/<N>/<fayl>
 */

const TPL_ZIP_MAX = 15 * 1024 * 1024;
const TPL_ASSET_EXT = ['webp' => 1536000, 'png' => 1536000, 'jpg' => 1536000, 'jpeg' => 1536000, 'gif' => 1536000, 'svg' => 512000, 'woff2' => 307200, 'woff' => 307200, 'mp3' => 4194304];
const TPL_FIELD_TYPES = ['text', 'textarea', 'time', 'date', 'number', 'select', 'list'];
const TPL_SH_TAGS = ['sh-open', 'sh-countdown', 'sh-map', 'sh-gallery', 'sh-rsvp', 'sh-music', 'sh-calendar', 'sh-share'];
const TPL_ALLOWED_TAGS = ['a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br', 'button', 'caption', 'cite', 'code', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
    'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'picture',
    'pre', 'q', 's', 'section', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'video', 'audio',
    'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'defs', 'lineargradient', 'radialgradient', 'stop', 'use', 'symbol', 'text', 'tspan', 'clippath', 'mask', 'pattern', 'title', 'desc',
    ...TPL_SH_TAGS];

function tpl_dir(string $slug, int $ver): string { return storage_dir() . "/tpl/$slug/v$ver"; }
function tpl_url(string $slug, int $ver, string $file): string { return "/files/tpl/$slug/$ver/" . rawurlencode($file); }

/** Asset yo‘lini tekshirib, brauzer manziliga aylantiradi; ruxsat etilmasa null */
function tpl_asset_ref(string $ref, string $slug, int $ver, array $assets): ?string
{
    $ref = trim($ref);
    if (!preg_match('#^(?:\./)?assets/([a-z0-9][a-z0-9._-]*)$#i', $ref, $m)) return null;
    $name = strtolower($m[1]);
    return isset($assets[$name]) ? tpl_url($slug, $ver, $name) : null;
}

/** CSS ni tozalash: tashqi manbalar, @import, expression — olib tashlanadi; assets/ — qayta yoziladi */
function tpl_clean_css(string $css, string $slug, int $ver, array $assets, array &$warn): string
{
    $css = str_ireplace(['</style', '<script', '<!--', '-->'], '', $css);
    $css = preg_replace_callback('/@import[^;]*;/i', function () use (&$warn) { $warn[] = 'CSS: @import olib tashlandi'; return ''; }, $css);
    $css = preg_replace('/expression\s*\(|javascript:|behavior\s*:|-moz-binding/i', '/*x*/', $css);
    return preg_replace_callback('/url\(\s*([\'"]?)([^\'")]*)\1\s*\)/i', function ($m) use ($slug, $ver, $assets, &$warn) {
        $u = $m[2];
        if (str_starts_with($u, 'data:image/') && !str_contains(strtolower($u), 'svg')) return $m[0];
        if (str_starts_with($u, '#')) return $m[0];
        $r = tpl_asset_ref($u, $slug, $ver, $assets);
        if ($r) return 'url("' . $r . '")';
        $warn[] = "CSS: «{$u}» topilmadi yoki ruxsat etilmagan — olib tashlandi";
        return 'none';
    }, $css);
}

/** HTML ni ruxsat etilgan teglar/atributlarga tozalash; assets/ havolalarini qayta yozish */
function tpl_clean_html(string $html, string $slug, int $ver, array $assets, array &$warn, array &$err): string
{
    // {{…}} belgilarini DOM buzmasligi uchun vaqtincha almashtiramiz
    $marks = [];
    $html = preg_replace_callback('/\{\{.*?\}\}/s', function ($m) use (&$marks) {
        $k = 'SHMARK' . count($marks) . 'X';
        $marks[$k] = $m[0];
        return $k;
    }, $html);
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8"?><!DOCTYPE html><html><body><div id="shroot">' . $html . '</div></body></html>', LIBXML_NONET | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    $root = $dom->getElementById('shroot');
    if (!$root) { $err[] = 'index.html o‘qilmadi'; return ''; }

    $removed = [];
    $walk = function (DOMNode $node) use (&$walk, &$removed, $slug, $ver, $assets, &$warn) {
        for ($c = $node->firstChild; $c; $c = $next) {
            $next = $c->nextSibling;
            if ($c instanceof DOMComment) { $node->removeChild($c); continue; }
            if (!$c instanceof DOMElement) continue;
            $tag = strtolower($c->tagName);
            if (!in_array($tag, TPL_ALLOWED_TAGS, true)) {
                $removed[$tag] = true;
                $node->removeChild($c);
                continue;
            }
            foreach (iterator_to_array($c->attributes) as $a) {
                $n = strtolower($a->name);
                $v = $a->value;
                if (str_starts_with($n, 'on') || in_array($n, ['srcdoc', 'formaction', 'action', 'srcset', 'background', 'ping'], true)) { $c->removeAttribute($a->name); continue; }
                if ($n === 'style') {
                    $c->setAttribute('style', tpl_clean_css($v, $slug, $ver, $assets, $warn));
                    continue;
                }
                if (in_array($n, ['src', 'poster', 'xlink:href', 'href'], true)) {
                    if ($n === 'href' && $tag === 'a') {
                        if (preg_match('#^(https://|tel:|mailto:|\#|SHMARK)#i', $v)) {
                            if (str_starts_with(strtolower($v), 'https://')) { $c->setAttribute('target', '_blank'); $c->setAttribute('rel', 'noopener noreferrer'); }
                            continue;
                        }
                        $c->removeAttribute($a->name);
                        continue;
                    }
                    if (($n === 'href' || $n === 'xlink:href') && str_starts_with($v, '#')) continue;
                    $r = tpl_asset_ref($v, $slug, $ver, $assets);
                    if ($r) $c->setAttribute($a->name, $r);
                    else { $warn[] = "«{$v}» topilmadi yoki tashqi manba — olib tashlandi"; $c->removeAttribute($a->name); }
                }
            }
            if ($tag === 'img' && !$c->hasAttribute('loading')) $c->setAttribute('loading', 'lazy');
            $walk($c);
        }
    };
    $walk($root);
    foreach (array_keys($removed) as $t) $warn[] = "<$t> tegi taqiqlangan — olib tashlandi";

    $out = '';
    foreach ($root->childNodes as $c) $out .= $dom->saveHTML($c);
    return strtr($out, $marks);
}

/** template.json maydonlarini tekshirish → toza ro‘yxat */
function tpl_clean_fields(mixed $fields, array &$err): array
{
    if ($fields === null) return [];
    if (!is_array($fields)) { $err[] = 'template.json: "fields" ro‘yxat bo‘lsin'; return []; }
    $out = [];
    $seen = [];
    $sub = function (array $f, string $path) use (&$err): ?array {
        $type = (string)($f['type'] ?? 'text');
        if (!in_array($type, TPL_FIELD_TYPES, true) || $type === 'list') { $err[] = "$path: turi noto‘g‘ri ($type)"; return null; }
        $r = ['type' => $type, 'label' => mb_substr(trim((string)($f['label'] ?? '')), 0, 60), 'required' => !empty($f['required'])];
        if ($r['label'] === '') $err[] = "$path: label yo‘q";
        if (isset($f['max'])) $r['max'] = max(1, min(2000, (int)$f['max']));
        if (isset($f['placeholder'])) $r['placeholder'] = mb_substr((string)$f['placeholder'], 0, 80);
        if ($type === 'select') {
            $opts = array_values(array_filter(array_map(fn($o) => mb_substr(trim((string)$o), 0, 60), (array)($f['options'] ?? []))));
            if (!$opts) $err[] = "$path: select uchun options kerak";
            $r['options'] = $opts;
        }
        return $r;
    };
    foreach (array_values($fields) as $i => $f) {
        if (!is_array($f)) { $err[] = "fields[$i]: obyekt bo‘lsin"; continue; }
        $key = (string)($f['key'] ?? '');
        if (!preg_match('/^[a-z][A-Za-z0-9]{1,30}$/', $key)) { $err[] = "fields[$i]: key «{$key}» noto‘g‘ri (lotin, camelCase)"; continue; }
        if (isset($seen[$key])) { $err[] = "fields: «{$key}» ikki marta"; continue; }
        if (in_array($key, TPL_BASE_KEYS, true) && $key !== 'program') { $err[] = "fields: «{$key}» — majburiy maydon, qayta e’lon qilinmaydi"; continue; }
        $seen[$key] = true;
        $type = (string)($f['type'] ?? 'text');
        if ($type === 'list') {
            $items = is_array($f['item'] ?? null) ? $f['item'] : [];
            if (!$items) { $err[] = "fields.$key: list uchun item kerak"; continue; }
            $cols = [];
            foreach ($items as $ck => $cf) {
                if (!preg_match('/^[a-z][A-Za-z0-9]{0,30}$/', (string)$ck) || !is_array($cf)) { $err[] = "fields.$key.item: «{$ck}» noto‘g‘ri"; continue; }
                $c = $sub($cf, "fields.$key.item.$ck");
                if ($c) $cols[$ck] = $c;
            }
            $out[] = ['key' => $key, 'type' => 'list', 'label' => mb_substr(trim((string)($f['label'] ?? $key)), 0, 60),
                'min' => max(0, (int)($f['min'] ?? 0)), 'max' => max(1, min(30, (int)($f['max'] ?? 10))), 'item' => $cols];
        } else {
            $c = $sub($f, "fields.$key");
            if ($c) $out[] = ['key' => $key] + $c + (isset($f['hint']) ? ['hint' => mb_substr((string)$f['hint'], 0, 120)] : []);
        }
    }
    return $out;
}

/**
 * ZIP ni qayta ishlaydi. $replaceSlug — mavjud HTML shablonni yangilash.
 * Qaytaradi: ['template' => data, 'slug' => ..., 'warnings' => [...]] yoki fail(422) xatolar ro‘yxati bilan
 */
function tpl_import_zip(string $zipPath, ?string $replaceSlug): array
{
    $err = [];
    $warn = [];
    if (filesize($zipPath) > TPL_ZIP_MAX) fail('ZIP 15 MB dan oshmasin', 422);
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) fail('ZIP faylni ochib bo‘lmadi', 422);

    // Fayllar ro‘yxati; bitta umumiy papka bo‘lsa — olib tashlaymiz
    $names = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $n = (string)$zip->getNameIndex($i);
        if (str_ends_with($n, '/') || str_contains($n, '__MACOSX') || basename($n) === '.DS_Store' || basename($n) === 'Thumbs.db') continue;
        if (str_contains($n, '..') || str_starts_with($n, '/')) fail("Fayl yo‘li noto‘g‘ri: $n", 422);
        $names[$i] = $n;
    }
    $prefix = '';
    if ($names) {
        $firsts = array_unique(array_map(fn($n) => explode('/', $n)[0], $names));
        if (count($firsts) === 1 && !in_array('template.json', $names, true) && str_contains(reset($names), '/')) $prefix = $firsts[0] . '/';
    }
    $files = [];
    foreach ($names as $i => $n) {
        if ($prefix && !str_starts_with($n, $prefix)) continue;
        $files[substr($n, strlen($prefix))] = $i;
    }
    $read = fn(string $n) => isset($files[$n]) ? (string)$zip->getFromIndex($files[$n]) : null;

    $json = $read('template.json');
    $html = $read('index.html');
    $css = $read('style.css') ?? '';
    if ($json === null) $err[] = 'template.json topilmadi';
    if ($html === null) $err[] = 'index.html topilmadi';
    if ($err) fail(implode("\n", $err), 422);

    $meta = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', $json), true);
    if (!is_array($meta)) fail('template.json — JSON xato: ' . json_last_error_msg(), 422);

    // Asosiy maydonlar
    $slug = $replaceSlug ?? strtolower(trim((string)($meta['slug'] ?? '')));
    if (!preg_match('/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/', $slug)) $err[] = 'slug noto‘g‘ri (lotin kichik harf, raqam, «-»; 3–60 belgi)';
    $existing = template_get($slug);
    if (!$replaceSlug && $existing) $err[] = "«{$slug}» slug band. Mavjud shablonni yangilash uchun uning tahrir sahifasidan yuklang.";
    if ($replaceSlug && $existing && ($existing['kind'] ?? '') !== 'html') $err[] = 'Bu shablon HTML shablon emas';
    $name = mb_substr(trim((string)($meta['name'] ?? '')), 0, 80);
    if ($name === '') $err[] = 'name yo‘q';
    $ceremony = (string)($meta['ceremony'] ?? '');
    if (!in_array($ceremony, TPL_CEREMONIES, true)) $err[] = 'ceremony: ' . implode(' | ', TPL_CEREMONIES);
    $style = (string)($meta['style'] ?? '');
    if (!in_array($style, TPL_STYLES, true)) $err[] = 'style: ' . implode(' | ', TPL_STYLES);
    $color = (string)($meta['color'] ?? 'krem');
    if (!in_array($color, TPL_COLORS, true)) $err[] = 'color: ' . implode(' | ', TPL_COLORS);
    $palette = array_values(array_filter((array)($meta['palette'] ?? []), fn($c) => is_string($c) && preg_match('/^#[0-9a-fA-F]{6}$/', $c)));
    if (count($palette) < 2) $err[] = 'palette: kamida 2 ta #RRGGBB rang';
    $fields = tpl_clean_fields($meta['fields'] ?? [], $err);

    // Assetlar
    $assets = [];
    foreach ($files as $n => $idx) {
        if (!str_starts_with($n, 'assets/')) continue;
        $base = strtolower(substr($n, 7));
        if (str_contains($base, '/')) { $err[] = "assets ichida papka bo‘lmasin: $n"; continue; }
        if (!preg_match('/^[a-z0-9][a-z0-9._-]*\.([a-z0-9]+)$/', $base, $m) || !isset(TPL_ASSET_EXT[$m[1]])) { $err[] = "Ruxsat etilmagan fayl: $n"; continue; }
        $st = $zip->statIndex($idx);
        if (($st['size'] ?? 0) > TPL_ASSET_EXT[$m[1]]) { $err[] = "Fayl juda katta: $n (" . round($st['size'] / 1024) . ' KB)'; continue; }
        $data = (string)$zip->getFromIndex($idx);
        if ($m[1] === 'svg' && preg_match('/<script|\son\w+\s*=|javascript:|<foreignObject/i', $data)) { $err[] = "SVG ichida skript bor: $n"; continue; }
        $assets[$base] = $data;
    }
    foreach (['preview-phone', 'preview-laptop'] as $p) foreach (['webp', 'png', 'jpg'] as $e) if (isset($files["$p.$e"])) $assets["$p.$e"] = (string)$zip->getFromIndex($files["$p.$e"]);
    if ($err) fail(implode("\n", array_unique($err)), 422);

    // HTML: belgilar va teglar
    try {
        $used = tpl_used_keys($html);
    } catch (Throwable $e) {
        fail('index.html: ' . $e->getMessage(), 422);
    }
    $declared = array_column($fields, null, 'key');
    foreach ($used['vars'] as $k) {
        if (in_array($k, TPL_BASE_KEYS, true) || isset($declared[$k]) || $k === 'this') continue;
        $err[] = "index.html: {{{$k}}} fields da e’lon qilinmagan";
    }
    foreach ($used['each'] as $list => $cols) {
        if ($list === 'program' && !isset($declared['program'])) { $allowed = ['time', 'title']; }
        elseif (($declared[$list]['type'] ?? '') !== 'list') { $err[] = "index.html: {{#each $list}} — «{$list}» list turidagi maydon emas"; continue; }
        else $allowed = array_keys($declared[$list]['item']);
        foreach ($cols as $c) if (!in_array($c, $allowed, true) && !in_array($c, TPL_BASE_KEYS, true) && !isset($declared[$c])) $err[] = "index.html: {{#each $list}} ichida {{{$c}}} ustuni yo‘q";
    }
    if (!array_intersect(['personA', 'names'], $used['vars'])) $err[] = 'index.html: {{personA}} yoki {{names}} belgisi yo‘q';
    if (!array_intersect(['date', 'dateShort', 'day'], $used['vars'])) $err[] = 'index.html: sana belgisi ({{date}} yoki {{dateShort}}) yo‘q';
    if (!preg_match('/<sh-rsvp[\s>\/]/i', $html)) $err[] = 'index.html: <sh-rsvp> (mehmon javobi) tegi majburiy';
    if ($err) fail(implode("\n", array_unique($err)), 422);

    $ver = (int)($existing['version'] ?? 0) + 1;
    $cleanHtml = tpl_clean_html($html, $slug, $ver, $assets, $warn, $err);
    $cleanCss = tpl_clean_css($css, $slug, $ver, $assets, $warn);
    if ($err) fail(implode("\n", $err), 422);

    // Saqlash
    $dir = tpl_dir($slug, $ver);
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) fail('Papka yaratib bo‘lmadi', 500);
    file_put_contents("$dir/index.html", $cleanHtml);
    file_put_contents("$dir/style.css", $cleanCss);
    foreach ($assets as $n => $data) file_put_contents("$dir/$n", $data);
    $zip->close();

    // Namuna ma’lumotlari
    $s = is_array($meta['sample'] ?? null) ? $meta['sample'] : [];
    $sDate = preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/', (string)($s['date'] ?? '')) ? (string)$s['date'] : '2026-09-12T18:00';
    $sExtra = [];
    foreach ($fields as $f) if (array_key_exists($f['key'], $s)) $sExtra[$f['key']] = $s[$f['key']];
    if (!isset($declared['program']) && isset($s['program']) && is_array($s['program'])) $sExtra['program'] = $s['program'];
    $sampleData = [
        'personA' => mb_substr((string)($s['personA'] ?? 'Jasur'), 0, 40),
        'personB' => mb_substr((string)($s['personB'] ?? ($ceremony === 'nikoh' || $ceremony === 'fotiha' ? 'Madina' : '')), 0, 40),
        'date' => $sDate,
        'venueName' => mb_substr((string)($s['venueName'] ?? 'Oqsaroy to‘yxonasi'), 0, 80),
        'address' => mb_substr((string)($s['address'] ?? 'Toshkent sh.'), 0, 160),
        'message' => mb_substr((string)($s['message'] ?? 'Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.'), 0, 600),
        'extra' => $sExtra,
    ];
    $fonts = is_array($meta['fonts'] ?? null) ? $meta['fonts'] : [];
    $title = strtolower((string)($fonts['title'] ?? ''));
    $script = str_contains($title, 'cinzel') ? 'cinzel' : (str_contains($title, 'pinyon') ? 'pinyon' : 'cormorant');
    $images = [];
    foreach (['phone', 'laptop'] as $k) foreach (['webp', 'png', 'jpg'] as $e) if (isset($assets["preview-$k.$e"])) $images[$k] = tpl_url($slug, $ver, "preview-$k.$e");
    if (!$images && $existing) $images = array_filter((array)($existing['images'] ?? []), fn($u) => is_string($u) && !str_starts_with($u, "/files/tpl/$slug/"));

    [$m1, $m2] = explode('T', $sDate . 'T');
    $price = (int)($meta['price'] ?? ($existing['price'] ?? 149000));
    $data = [
        'slug' => $slug,
        'kind' => 'html',
        'version' => $ver,
        'name' => $name,
        'ceremony' => $ceremony,
        'style' => $style,
        'price' => $existing['price'] ?? max(1000, $price),
        'priceOld' => $existing['priceOld'] ?? max($price, (int)($meta['priceOld'] ?? $price)),
        'featured' => $existing['featured'] ?? false,
        'description' => mb_substr(trim((string)($meta['description'] ?? '')), 0, 400),
        'palette' => array_slice($palette, 0, 4),
        'fields' => $fields,
        'sampleData' => $sampleData,
        'sample' => ['a' => $sampleData['personA'], 'b' => $sampleData['personB'] ?: null, 'date' => implode(' · ', array_reverse(explode('-', $m1))), 'venue' => $sampleData['venueName'], 'time' => $m2 ?: '18:00'],
        'theme' => ['bg' => [$palette[0], $palette[0]], 'accent' => $palette[1], 'ink' => $palette[2] ?? '#2b2620', 'soft' => $palette[2] ?? '#7a7265', 'script' => $script, 'color' => $color],
        'images' => $images,
        'hasMusic' => (bool)array_filter(array_keys($assets), fn($n) => str_ends_with($n, '.mp3')),
    ];
    if (empty($data['sample']['b'])) unset($data['sample']['b']);
    return ['data' => $data, 'slug' => $slug, 'existing' => (bool)$existing, 'warnings' => array_values(array_unique($warn))];
}

/** Taklifnoma ma’lumotini (invitation qatori) shablon uchun formatga */
function tpl_invitation_data(array $inv): array
{
    $extra = jdec($inv['extra'] ?? null);
    return [
        'personA' => $inv['person_a'], 'personB' => (string)$inv['person_b'], 'date' => $inv['date'], 'venueName' => $inv['venue_name'],
        'address' => $inv['address'], 'message' => (string)$inv['message'], 'mapUrl' => (string)$inv['map_url'], 'ceremony' => $inv['ceremony'],
        'program' => $extra['program'] ?? jdec($inv['program']), 'extra' => is_array($extra) ? $extra : [],
        'photos' => jdec($inv['photos']), 'rsvpEnabled' => (bool)$inv['rsvp_enabled'], 'musicEnabled' => (bool)$inv['music_enabled'],
    ];
}

/**
 * To‘liq HTML sahifa. $mode: live (mehmon), preview (namuna/admin/buyurtma — javob saqlanmaydi)
 */
function tpl_page(array $t, array $d, string $mode, ?string $slug = null): string
{
    $ver = (int)($t['version'] ?? 1);
    $dir = tpl_dir($t['slug'], $ver);
    $html = is_file("$dir/index.html") ? (string)file_get_contents("$dir/index.html") : '<p>Shablon fayllari topilmadi</p>';
    $ctx = tpl_context($d);
    try {
        $body = tpl_render($html, $ctx);
    } catch (Throwable $e) {
        $body = '<p style="padding:24px">Shablon xatosi: ' . htmlspecialchars($e->getMessage()) . '</p>';
    }
    $music = '';
    if (preg_match('#<sh-music[^>]*\ssrc="([^"]+)"#', $body, $mm)) $music = $mm[1];
    $data = [
        'mode' => $mode,
        'slug' => $slug,
        'names' => $ctx['names'],
        'date' => preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', (string)$d['date']) ? $d['date'] . ':00+05:00' : null,
        'venueName' => $ctx['venueName'],
        'address' => $ctx['address'],
        'mapUrl' => $d['mapUrl'] ?? '',
        'photos' => array_values(array_filter((array)($d['photos'] ?? []), 'is_string')),
        'rsvpEnabled' => $d['rsvpEnabled'] ?? true,
        'musicEnabled' => ($d['musicEnabled'] ?? true) && $music !== '',
    ];
    $h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $title = $ctx['names'] . ' — taklifnoma';
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
    $css = tpl_url($t['slug'], $ver, 'style.css');
    // runtime fayllari uzoq keshlanadi — versiya sifatida o‘zgarish vaqti
    $rv = fn(string $f) => '/sh/' . $f . '?v=' . (is_file(ROOT . "/sh/$f") ? filemtime(ROOT . "/sh/$f") : '1');
    return "<!DOCTYPE html>\n<html lang=\"uz\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
        . '<title>' . $h($title) . '</title><meta name="robots" content="noindex">'
        . '<link rel="stylesheet" href="' . $rv('runtime.css') . '"><link rel="stylesheet" href="' . $h($css) . '">'
        . '</head><body class="sh-body sh-mode-' . $h($mode) . '">' . $body
        . '<script type="application/json" id="sh-data">' . $json . '</script><script src="' . $rv('runtime.js') . '" defer></script></body></html>';
}

/** Shablon sahifasi uchun xavfsizlik sarlavhalari (skriptlar faqat o‘zimizniki) */
function tpl_headers(): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self' data:; connect-src 'self'; frame-src https://www.google.com https://maps.google.com https://yandex.uz https://yandex.ru; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
}

/** Mijoz kiritgan qo‘shimcha maydonlarni shablon `fields` sxemasi bo‘yicha tekshirish */
function tpl_clean_extra(mixed $in, array $fields): array
{
    if (!is_array($in)) fail('Qo‘shimcha ma’lumot noto‘g‘ri', 422);
    $one = function (mixed $v, array $f, string $label) {
        $v = is_scalar($v) ? trim((string)$v) : '';
        $max = (int)($f['max'] ?? ($f['type'] === 'textarea' ? 1000 : 160));
        if ($v === '') return '';
        if (mb_strlen($v) > $max) fail("«{$label}»: ko‘pi bilan $max belgi", 422);
        if ($f['type'] === 'time' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) fail("«{$label}»: vaqt noto‘g‘ri", 422);
        if ($f['type'] === 'date' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) fail("«{$label}»: sana noto‘g‘ri", 422);
        if ($f['type'] === 'number' && !is_numeric($v)) fail("«{$label}»: son kiriting", 422);
        if ($f['type'] === 'select' && !in_array($v, $f['options'] ?? [], true)) fail("«{$label}»: ro‘yxatdan tanlang", 422);
        return $v;
    };
    $out = [];
    foreach ($fields as $f) {
        $k = $f['key'];
        if (!array_key_exists($k, $in)) continue;
        if ($f['type'] === 'list') {
            $rows = is_array($in[$k]) ? array_values($in[$k]) : [];
            if (count($rows) > (int)$f['max']) fail("«{$f['label']}»: ko‘pi bilan {$f['max']} ta qator", 422);
            $clean = [];
            foreach ($rows as $row) {
                if (!is_array($row)) continue;
                $r = [];
                foreach ($f['item'] as $ck => $cf) {
                    $r[$ck] = $one($row[$ck] ?? '', $cf, $cf['label']);
                    if (!empty($cf['required']) && $r[$ck] === '') fail("«{$f['label']}»: «{$cf['label']}» ni to‘ldiring", 422);
                }
                if (array_filter($r, fn($x) => $x !== '')) $clean[] = $r;
            }
            $out[$k] = $clean;
        } else {
            $out[$k] = $one($in[$k], $f, $f['label']);
        }
    }
    // Taklifnoma tili (sxemadan tashqari, barcha shablonlar uchun)
    if (isset($in['lang']) && in_array($in['lang'], ['uz', 'ru'], true)) $out['lang'] = $in['lang'];
    return $out;
}
