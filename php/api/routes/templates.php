<?php
declare(strict_types=1);

/* ── Ommaviy: shablonlar ro‘yxati JS sifatida (<head> da, React'dan oldin yuklanadi) ── */
route('GET', '/templates.js', function () {
    try {
        $list = array_values(templates());
    } catch (Throwable $e) {
        error_log('[shohnoma] templates.js: ' . $e->getMessage());
        $list = [];
    }
    $js = 'window.__SHOHNOMA_TEMPLATES__=' . json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . ';';
    // Har safar tekshiriladi (o‘zgarmagan bo‘lsa — 304), admin o‘zgarishi darhol ko‘rinadi
    $etag = '"' . substr(sha1($js), 0, 20) . '"';
    header('Content-Type: application/javascript; charset=utf-8');
    header('Cache-Control: no-cache');
    header('ETag: ' . $etag);
    header('X-Content-Type-Options: nosniff');
    if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
    echo $js;
    exit;
});

route('GET', '/templates', function () {
    json_out(['ok' => true, 'templates' => array_values(array_filter(templates(), fn($t) => $t['active']))]);
});

/* ── Admin: shablonlarni boshqarish ── */
const TPL_CEREMONIES = ['nikoh', 'fotiha', 'sunnat', 'tugilgan-kun'];
const TPL_STYLES = ['klassik', 'minimal', 'romantik', 'zamonaviy', 'milliy'];
const TPL_SCRIPTS = ['pinyon', 'cinzel', 'cormorant'];
const TPL_COLORS = ['bordo', 'yashil', 'oltin', 'krem', 'moviy', 'qizil', 'pushti'];

function tpl_hex(mixed $v, string $field): string
{
    $v = trim((string)$v);
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $v)) fail("$field: rang #RRGGBB ko‘rinishida bo‘lsin", 422);
    return strtolower($v);
}

function tpl_image(mixed $v): ?string
{
    $v = trim((string)($v ?? ''));
    if ($v === '') return null;
    if (!preg_match('#^/(files/templates/[a-z0-9]+\.(webp|png|jpg)|templates/[a-z0-9-]+\.webp)$#', $v)) fail('Rasm manzili noto‘g‘ri', 422);
    return $v;
}

/** Admin formasidan kelgan shablonni tekshirib, saqlanadigan ko‘rinishga keltiradi */
function tpl_clean(array $b, string $slug): array
{
    $name = str_in($b['name'] ?? '', 80);
    if ($name === '') fail('Nomini kiriting', 422);
    $ceremony = (string)($b['ceremony'] ?? '');
    if (!in_array($ceremony, TPL_CEREMONIES, true)) fail('Marosim turini tanlang', 422);
    $style = (string)($b['style'] ?? '');
    if (!in_array($style, TPL_STYLES, true)) fail('Uslubni tanlang', 422);
    $price = (int)($b['price'] ?? 0);
    $priceOld = (int)($b['priceOld'] ?? 0);
    if ($price < 1000 || $price > 100000000) fail('Narx noto‘g‘ri', 422);
    if ($priceOld && $priceOld < $price) fail('Eski narx hozirgi narxdan kichik bo‘lmasin', 422);
    $th = is_array($b['theme'] ?? null) ? $b['theme'] : [];
    $bg = is_array($th['bg'] ?? null) ? $th['bg'] : [];
    $script = (string)($th['script'] ?? 'pinyon');
    $color = (string)($th['color'] ?? 'krem');
    if (!in_array($script, TPL_SCRIPTS, true)) fail('Shrift noto‘g‘ri', 422);
    if (!in_array($color, TPL_COLORS, true)) fail('Rang guruhi noto‘g‘ri', 422);
    $theme = [
        'bg' => [tpl_hex($bg[0] ?? '', 'Fon 1'), tpl_hex($bg[1] ?? '', 'Fon 2')],
        'ink' => tpl_hex($th['ink'] ?? '', 'Matn'),
        'accent' => tpl_hex($th['accent'] ?? '', 'Urg‘u'),
        'soft' => tpl_hex($th['soft'] ?? '', 'Ikkilamchi matn'),
        'script' => $script,
        'color' => $color,
    ];
    $palette = [];
    foreach (array_slice(is_array($b['palette'] ?? null) ? $b['palette'] : [], 0, 4) as $i => $c) $palette[] = tpl_hex($c, 'Palitra ' . ($i + 1));
    if (!$palette) $palette = [$theme['bg'][0], $theme['accent'], $theme['ink']];
    $sm = is_array($b['sample'] ?? null) ? $b['sample'] : [];
    $sample = [
        'a' => str_in($sm['a'] ?? '', 40) ?: 'Jasur',
        'date' => str_in($sm['date'] ?? '', 30) ?: '12 · 09 · 2026',
        'venue' => str_in($sm['venue'] ?? '', 80) ?: 'To‘yxona',
        'time' => str_in($sm['time'] ?? '', 10) ?: '18:00',
    ];
    $sb = str_in($sm['b'] ?? '', 40);
    if ($sb !== '') $sample['b'] = $sb;
    $base = (string)($b['base'] ?? '');
    $img = is_array($b['images'] ?? null) ? $b['images'] : [];
    return [
        'slug' => $slug,
        'name' => $name,
        'ceremony' => $ceremony,
        'style' => $style,
        'price' => $price,
        'priceOld' => $priceOld ?: $price,
        'featured' => !empty($b['featured']),
        'description' => str_in($b['description'] ?? '', 400),
        'descriptionRu' => str_in($b['descriptionRu'] ?? '', 400),
        'palette' => $palette,
        'sample' => $sample,
        'theme' => $theme,
        'base' => preg_match('/^[a-z0-9-]{2,80}$/', $base) ? $base : null,
        'images' => array_filter(['phone' => tpl_image($img['phone'] ?? null), 'laptop' => tpl_image($img['laptop'] ?? null), 'phoneScroll' => tpl_image($img['phoneScroll'] ?? null), 'laptopScroll' => tpl_image($img['laptopScroll'] ?? null)]),
        'musicId' => tpl_music($b['musicId'] ?? null),
    ];
}

/** Standart musiqa — kutubxonadagi trek ID si (yoki null) */
function tpl_music(mixed $v): ?string
{
    if (!is_string($v) || $v === '') return null;
    return one('SELECT id FROM music_tracks WHERE id = ?', [$v]) ? $v : fail('Musiqa topilmadi', 422);
}

function tpl_save(array $data, int $sort, bool $active, bool $insert): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($insert) q('INSERT INTO templates (slug, data, sort, is_active) VALUES (?, ?, ?, ?)', [$data['slug'], $json, $sort, $active ? 1 : 0]);
    else q('UPDATE templates SET data = ?, sort = ?, is_active = ?, updated_at = UTC_TIMESTAMP() WHERE slug = ?', [$json, $sort, $active ? 1 : 0, $data['slug']]);
}

function tpl_usage(string $slug): int { return (int)scalar('SELECT COUNT(*) FROM orders WHERE template_slug = ?', [$slug]); }

route('GET', '/admin/templates', function () {
    require_admin();
    $rows = [];
    foreach (templates() as $t) $rows[] = $t + ['orders' => tpl_usage($t['slug'])];
    json_out(['ok' => true, 'templates' => $rows]);
});

route('POST', '/admin/templates', function () {
    require_admin();
    $b = body();
    $slug = strtolower(trim((string)($b['slug'] ?? '')));
    if (!preg_match('/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/', $slug) || $slug === '_') fail('Slug faqat lotin kichik harf, raqam va "-" dan iborat bo‘lsin (3–62 belgi)', 422);
    if (template_get($slug)) fail('Bu slug band', 409);
    $sort = isset($b['number']) ? (int)$b['number'] : ((int)scalar('SELECT COALESCE(MAX(sort), 0) FROM templates') + 1);
    tpl_save(tpl_clean($b, $slug), $sort, !array_key_exists('active', $b) || !empty($b['active']), true);
    json_out(['ok' => true, 'template' => templates(true)[$slug]]);
});

route('PUT', '/admin/templates/:slug', function ($p) {
    require_admin();
    $cur = template_get($p['slug']) ?? fail('Shablon topilmadi', 404);
    $b = body();
    $clean = tpl_clean($b, $cur['slug']);
    // Kodda yozilgan shablonning maydonlari (fields) admin formasida tahrirlanmaydi — saqlanadi
    if (isset($cur['fields']) && ($cur['kind'] ?? '') !== 'html') $clean['fields'] = $cur['fields'];
    if (($cur['kind'] ?? '') === 'html') {
        foreach (['kind', 'version', 'fields', 'sampleData', 'hasMusic', 'theme'] as $k) if (isset($cur[$k])) $clean[$k] = $cur[$k];
        $clean['theme']['color'] = $clean['theme']['color'] ?? 'krem';
        if (isset($b['theme']['color']) && in_array($b['theme']['color'], TPL_COLORS, true)) $clean['theme']['color'] = $b['theme']['color'];
        $clean['base'] = null;
    }
    tpl_save($clean, isset($b['number']) ? (int)$b['number'] : (int)$cur['number'], array_key_exists('active', $b) ? !empty($b['active']) : $cur['active'], false);
    json_out(['ok' => true, 'template' => templates(true)[$cur['slug']]]);
});

/** Faqat yoqish/o‘chirish yoki tartib raqami */
route('PATCH', '/admin/templates/:slug', function ($p) {
    require_admin();
    $cur = template_get($p['slug']) ?? fail('Shablon topilmadi', 404);
    $b = body();
    if (array_key_exists('active', $b)) q('UPDATE templates SET is_active = ?, updated_at = UTC_TIMESTAMP() WHERE slug = ?', [!empty($b['active']) ? 1 : 0, $cur['slug']]);
    if (isset($b['number'])) q('UPDATE templates SET sort = ?, updated_at = UTC_TIMESTAMP() WHERE slug = ?', [(int)$b['number'], $cur['slug']]);
    if (array_key_exists('featured', $b)) {
        $d = $cur;
        unset($d['active'], $d['number']);
        $d['featured'] = !empty($b['featured']);
        q('UPDATE templates SET data = ?, updated_at = UTC_TIMESTAMP() WHERE slug = ?', [json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $cur['slug']]);
    }
    json_out(['ok' => true, 'template' => templates(true)[$cur['slug']]]);
});

route('DELETE', '/admin/templates/:slug', function ($p) {
    require_admin();
    $cur = template_get($p['slug']) ?? fail('Shablon topilmadi', 404);
    if ($n = tpl_usage($cur['slug'])) fail("Bu shablon bilan $n ta buyurtma bor — o‘chirib bo‘lmaydi. Uni nofaol qiling.", 409);
    foreach (($cur['images'] ?? []) as $url) if (is_string($url)) delete_upload($url);
    q('DELETE FROM templates WHERE slug = ?', [$cur['slug']]);
    json_out(['ok' => true]);
});

/** Mokap rasmi yuklash: multipart "file", ?kind=phone|laptop → URL (shablonga saqlash formadagi "Saqlash" bilan) */
route('POST', '/admin/templates-image', function () {
    require_admin();
    $kind = $_GET['kind'] ?? '';
    if (!in_array($kind, ['phone', 'laptop'], true)) fail('Rasm turi noto‘g‘ri', 422);
    $f = $_FILES['file'] ?? null;
    if ($f && !empty($f['tmp_name']) && is_uploaded_file($f['tmp_name'])) {
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) fail('Faqat JPG, PNG yoki WEBP rasm yuklang', 422);
    }
    json_out(['ok' => true, 'url' => save_upload($f, 'templates')]);
});

/* ── HTML shablon (ZIP) ── */

/** ZIP yuklash: yangi shablon yoki ?replace=<slug> — mavjud HTML shablonni yangilash */
route('POST', '/admin/templates-zip', function () {
    require_admin();
    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        $e = (int)($f['error'] ?? UPLOAD_ERR_NO_FILE);
        fail($e === UPLOAD_ERR_INI_SIZE || $e === UPLOAD_ERR_FORM_SIZE ? 'Fayl serverning yuklash chegarasidan katta (php upload_max_filesize)' : 'ZIP fayl tanlanmagan', 422);
    }
    $replace = isset($_GET['replace']) && $_GET['replace'] !== '' ? (string)$_GET['replace'] : null;
    if ($replace !== null) template_get($replace) ?? fail('Yangilanadigan shablon topilmadi', 404);
    $r = tpl_import_zip($f['tmp_name'], $replace);
    $cur = template_get($r['slug']);
    if ($cur) tpl_save($r['data'], (int)$cur['number'], (bool)$cur['active'], false);
    else tpl_save($r['data'], (int)scalar('SELECT COALESCE(MAX(sort), 0) FROM templates') + 1, false, true);
    json_out(['ok' => true, 'template' => templates(true)[$r['slug']], 'warnings' => $r['warnings'], 'updated' => (bool)$cur]);
});

/** Namuna sahifasi (sample ma’lumotlar bilan) — katalog, namuna va admin ko‘rinishi uchun */
route('GET', '/tpl/:slug/preview', function ($p) {
    $t = template_get($p['slug']);
    if (!$t || ($t['kind'] ?? '') !== 'html') { http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit; }
    $d = ($t['sampleData'] ?? []) + ['ceremony' => $t['ceremony'], 'photos' => [], 'rsvpEnabled' => true, 'musicEnabled' => true, 'mapUrl' => ''];
    $d['program'] = $d['extra']['program'] ?? [];
    tpl_headers();
    echo tpl_page($t, $d, 'preview');
    exit;
});

/** Buyurtma ko‘rinishi (egasi uchun, to‘lovdan oldin ham) */
route('GET', '/orders/:id/preview', function ($p) {
    $b = owned_order($p['id']) ?? (current_user()['is_admin'] ?? false ? load_order($p['id']) : null);
    if (!$b) { http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit; }
    $t = template_get($b['order']['template_slug']);
    if (!$t || ($t['kind'] ?? '') !== 'html') { http_response_code(404); header('Content-Type: text/plain'); echo 'Not found'; exit; }
    $d = tpl_invitation_data($b['invitation']);
    $s = $t['sampleData'] ?? [];
    foreach (['personA', 'date', 'venueName', 'address'] as $k) if (($d[$k] ?? '') === '') $d[$k] = $s[$k] ?? '';
    tpl_headers();
    echo tpl_page($t, $d, 'preview');
    exit;
});

/** Shablon fayllari: /files/tpl/<slug>/<ver>/<fayl> */
route('GET', '/files/tpl/:slug/:ver/:name', function ($p) {
    $mime = ['webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
        'woff2' => 'font/woff2', 'woff' => 'font/woff', 'mp3' => 'audio/mpeg', 'css' => 'text/css; charset=utf-8'];
    $name = rawurldecode($p['name']);
    if (!preg_match('/^[a-z0-9-]+$/', $p['slug']) || !ctype_digit($p['ver']) || !preg_match('/^[a-z0-9][a-z0-9._-]*\.([a-z0-9]+)$/', $name, $m) || !isset($mime[$m[1]])) {
        http_response_code(404); exit;
    }
    $path = tpl_dir($p['slug'], (int)$p['ver']) . '/' . $name;
    if (!is_file($path)) { http_response_code(404); exit; }
    header('Content-Type: ' . $mime[$m[1]]);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    if ($m[1] === 'svg') header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
    readfile($path);
    exit;
});
