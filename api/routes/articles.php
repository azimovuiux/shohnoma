<?php
declare(strict_types=1);

/* ── Maqolalar: ommaviy ── */

function article_lang_param(): string
{
    $l = (string)($_GET['lang'] ?? 'uz');
    return in_array($l, ARTICLE_LANGS, true) ? $l : 'uz';
}

/** Admin «oldindan ko‘rish» (?preview=1) — qoralamani ham ko‘rsatadi */
function article_preview_allowed(): bool
{
    if (($_GET['preview'] ?? '') !== '1') return false;
    $u = current_user();
    return (bool)($u['is_admin'] ?? false);
}

/** Ro‘yxat: ?lang=uz&category=&page=1 */
route('GET', '/articles', function () {
    $lang = article_lang_param();
    $cat = (string)($_GET['category'] ?? '');
    $cat = isset(ARTICLE_CATEGORIES[$cat]) ? $cat : null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    json_out(['ok' => true] + article_list($lang, $cat, $page));
});

/** Bitta maqola (nashr etilgan; admin uchun ?preview=1 — qoralama ham) */
route('GET', '/articles/:slug', function ($p) {
    $a = article_get_by_slug((string)$p['slug']);
    if (!$a || ($a['status'] !== 'published' && !article_preview_allowed())) fail('Maqola topilmadi', 404);
    json_out(['ok' => true, 'article' => article_full($a), 'related' => article_related($a)]);
});

/* ── Admin ── */

function article_input(array $b, ?array $cur): array
{
    $d = [];
    if (array_key_exists('title', $b) || !$cur) {
        $d['title'] = str_in($b['title'] ?? '', 200);
        if ($d['title'] === '') fail('Sarlavhani kiriting', 422);
    }
    if (array_key_exists('lang', $b) || !$cur) {
        $d['lang'] = (string)($b['lang'] ?? 'uz');
        if (!in_array($d['lang'], ARTICLE_LANGS, true)) fail('Til noto‘g‘ri', 422);
    }
    if (array_key_exists('excerpt', $b)) $d['excerpt'] = str_in($b['excerpt'], 400);
    if (array_key_exists('category', $b)) {
        $c = (string)($b['category'] ?? '');
        if ($c !== '' && !isset(ARTICLE_CATEGORIES[$c])) fail('Kategoriya noto‘g‘ri', 422);
        $d['category'] = $c ?: null;
    }
    if (array_key_exists('cover', $b)) {
        $c = trim((string)($b['cover'] ?? ''));
        if ($c !== '' && art_safe_src($c) === null) fail('Muqova rasmi manzili noto‘g‘ri', 422);
        $d['cover'] = $c ?: null;
    }
    if (array_key_exists('body', $b)) {
        $raw = (string)($b['body'] ?? '');
        if (strlen($raw) > 1_000_000) fail('Matn juda uzun', 422);
        $d['body'] = article_sanitize($raw);
    }
    if (array_key_exists('seoTitle', $b)) $d['seo_title'] = str_in($b['seoTitle'], 160) ?: null;
    if (array_key_exists('seoDescription', $b)) $d['seo_description'] = str_in($b['seoDescription'], 320) ?: null;
    if (array_key_exists('slug', $b)) {
        $raw = trim((string)($b['slug'] ?? ''));
        if ($raw !== '') {
            $s = article_slugify($raw, 100);
            if (!article_slug_valid($s)) fail('Manzil faqat lotin harflari, raqamlar va «-» dan iborat bo‘lsin (kamida 2 belgi)', 422);
            if (article_slug_taken($s, $cur['id'] ?? null)) fail('Bu manzil boshqa maqolada ishlatilgan — boshqasini yozing', 409);
            $d['slug'] = $s;
        } elseif (!$cur) {
            $d['slug'] = null; // sarlavhadan yasaladi
        }
    }
    if (array_key_exists('status', $b)) {
        $s = (string)$b['status'];
        if (!in_array($s, ['draft', 'published'], true)) fail('Holat noto‘g‘ri', 422);
        $d['status'] = $s;
    }
    return $d;
}

/** Tarjima guruhi: shu guruhda shu tilda boshqa maqola bo‘lmasin */
function article_group_check(string $groupId, string $lang, ?string $exceptId): void
{
    $other = one('SELECT title FROM articles WHERE group_id = ? AND lang = ? AND id <> ?', [$groupId, $lang, $exceptId ?? '']);
    if ($other) fail("Bu guruhda " . strtoupper($lang) . " tilidagi versiya allaqachon bor: «{$other['title']}»", 409);
}

function article_admin_payload(array $a): array
{
    return ['ok' => true, 'article' => article_admin_out($a, true), 'translations' => article_translations($a, false)];
}

route('GET', '/admin/articles', function () {
    require_admin();
    $rows = all('SELECT * FROM articles ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC');
    $groups = [];
    foreach ($rows as $r) $groups[$r['group_id']][] = ['id' => $r['id'], 'lang' => $r['lang'], 'status' => $r['status']];
    json_out(['ok' => true, 'items' => array_map(fn($r) => article_admin_out($r) + ['translations' => $groups[$r['group_id']] ?? []], $rows)]);
});

route('GET', '/admin/articles/:id', function ($p) {
    require_admin();
    $a = one('SELECT * FROM articles WHERE id = ?', [$p['id']]) ?? fail('Maqola topilmadi', 404);
    json_out(article_admin_payload($a));
});

/** Yangi maqola. translationOf — shu maqolaning tarjimasi (bitta guruh) */
route('POST', '/admin/articles', function () {
    require_admin();
    $b = body();
    $d = article_input($b, null);
    $group = new_id();
    if (!empty($b['translationOf'])) {
        $src = one('SELECT group_id FROM articles WHERE id = ?', [(string)$b['translationOf']]) ?? fail('Asl maqola topilmadi', 404);
        $group = $src['group_id'];
        article_group_check($group, $d['lang'], null);
    }
    if (empty($d['slug'])) $d['slug'] = article_unique_slug($d['title']);
    $status = $d['status'] ?? 'draft';
    if ($status === 'published' && article_plain_text($d['body'] ?? '') === '') fail('Nashr qilish uchun maqola matnini yozing', 422);
    $id = new_id();
    $now = now_utc();
    q('INSERT INTO articles (id, slug, lang, group_id, title, excerpt, category, cover, body, seo_title, seo_description, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        $id, $d['slug'], $d['lang'], $group, $d['title'], $d['excerpt'] ?? null, $d['category'] ?? null, $d['cover'] ?? null, $d['body'] ?? '',
        $d['seo_title'] ?? null, $d['seo_description'] ?? null, $status, $status === 'published' ? $now : null, $now, $now,
    ]);
    json_out(article_admin_payload(one('SELECT * FROM articles WHERE id = ?', [$id])));
});

/** Qisman yangilash. Qo‘shimcha: translationOf (guruhga qo‘shish), unlink: true (guruhdan ajratish) */
route('PATCH', '/admin/articles/:id', function ($p) {
    require_admin();
    $cur = one('SELECT * FROM articles WHERE id = ?', [$p['id']]) ?? fail('Maqola topilmadi', 404);
    $b = body();
    $d = article_input($b, $cur);
    if (array_key_exists('slug', $d) && $d['slug'] === null) unset($d['slug']);
    $lang = $d['lang'] ?? $cur['lang'];
    $group = $cur['group_id'];
    if (!empty($b['unlink'])) {
        $group = new_id();
    } elseif (!empty($b['translationOf'])) {
        $src = one('SELECT group_id FROM articles WHERE id = ?', [(string)$b['translationOf']]) ?? fail('Bog‘lanadigan maqola topilmadi', 404);
        $group = $src['group_id'];
    }
    if ($group !== $cur['group_id'] || $lang !== $cur['lang']) article_group_check($group, $lang, $cur['id']);
    if ($group !== $cur['group_id']) $d['group_id'] = $group;
    $status = $d['status'] ?? $cur['status'];
    $body = $d['body'] ?? (string)$cur['body'];
    if ($status === 'published' && article_plain_text($body) === '') fail('Nashr qilish uchun maqola matnini yozing', 422);
    if ($status === 'published' && !$cur['published_at']) $d['published_at'] = now_utc();
    if (!$d) json_out(article_admin_payload($cur));
    $d['updated_at'] = now_utc();
    $set = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($d)));
    q("UPDATE articles SET $set WHERE id = ?", [...array_values($d), $cur['id']]);
    json_out(article_admin_payload(one('SELECT * FROM articles WHERE id = ?', [$cur['id']])));
});

route('DELETE', '/admin/articles/:id', function ($p) {
    require_admin();
    $cur = one('SELECT id FROM articles WHERE id = ?', [$p['id']]) ?? fail('Maqola topilmadi', 404);
    q('DELETE FROM articles WHERE id = ?', [$cur['id']]);
    json_out(['ok' => true]);
});

/** Manzil (slug) bandligini tekshirish: ?slug=&id= → {slug (normallashgan), available} */
route('GET', '/admin/articles-slug', function () {
    require_admin();
    $raw = (string)($_GET['slug'] ?? '');
    $s = article_slugify($raw, 100);
    $id = (string)($_GET['id'] ?? '') ?: null;
    json_out(['ok' => true, 'slug' => $s, 'valid' => article_slug_valid($s), 'available' => article_slug_valid($s) && !article_slug_taken($s, $id), 'suggestion' => article_unique_slug($raw ?: 'maqola', $id)]);
});

/** Muqova yoki matn ichidagi rasm: multipart "file" → {url} */
route('POST', '/admin/articles-image', function () {
    require_admin();
    $f = $_FILES['file'] ?? null;
    if ($f && !empty($f['tmp_name']) && is_uploaded_file($f['tmp_name'])) {
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) fail('Faqat JPG, PNG yoki WEBP rasm yuklang', 422);
    }
    $url = save_upload($f, 'articles');
    $size = @getimagesize(upload_root() . substr($url, strlen('/files')));
    json_out(['ok' => true, 'url' => $url, 'width' => $size[0] ?? null, 'height' => $size[1] ?? null]);
});
