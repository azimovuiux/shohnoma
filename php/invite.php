<?php
/**
 * Mehmon taklifnomasi: /<slug>/ — statik qobiq (/_/index.html) ga Telegram/WhatsApp uchun
 * OG meta (sarlavha, tavsif, rasm) qo‘shib beradi. Ma’lumotni brauzer /api/i/<slug> dan oladi.
 */
declare(strict_types=1);
require __DIR__ . '/api/lib/bootstrap.php';
foreach (glob(__DIR__ . '/api/lib/*.php') as $f) require_once $f;

$slug = (string)($_GET['slug'] ?? '');
$shell = __DIR__ . '/_/index.html';
$notFound = __DIR__ . '/404.html';

$inv = null;
try {
    if (preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/', $slug)) {
        $inv = one("SELECT i.*, o.status, o.template_slug FROM invitations i JOIN orders o ON o.id = i.order_id WHERE i.slug = ? AND o.status IN ('paid','active','archived')", [$slug]);
    }
} catch (Throwable $e) {
    error_log('[invite] ' . $e->getMessage());
}

if (!$inv || !is_file($shell)) {
    http_response_code(404);
    readfile(is_file($notFound) ? $notFound : $shell);
    exit;
}

// HTML shablon (admin ZIP orqali yuklagan) — sahifa to‘liq serverda yig‘iladi
try {
    $tpl = template_get((string)$inv['template_slug']);
    if ($tpl && ($tpl['kind'] ?? '') === 'html') {
        if ($inv['status'] !== 'archived') q('UPDATE invitations SET views = views + 1 WHERE id = ?', [$inv['id']]);
        $page = tpl_page($tpl, tpl_invitation_data($inv), $inv['status'] === 'archived' ? 'archived' : 'live', $slug);
        $og = sprintf('<meta property="og:type" content="website"><meta property="og:title" content="%s"><meta property="og:url" content="%s">',
            htmlspecialchars(trim($inv['person_a'] . ($inv['person_b'] ? ' & ' . $inv['person_b'] : '')) . ' — taklifnoma', ENT_QUOTES), htmlspecialchars(site_url() . "/$slug/", ENT_QUOTES));
        if (!empty($tpl['images']['phone'])) $og .= '<meta property="og:image" content="' . htmlspecialchars(site_url() . $tpl['images']['phone'], ENT_QUOTES) . '">';
        tpl_headers();
        echo str_replace('</head>', $og . '</head>', $page);
        exit;
    }
} catch (Throwable $e) {
    error_log('[invite html] ' . $e->getMessage());
}

$months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
$names = trim($inv['person_a'] . ($inv['person_b'] ? ' & ' . $inv['person_b'] : ''));
$date = '';
if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', (string)$inv['date'], $m)) $date = (int)$m[3] . ' ' . $months[(int)$m[2] - 1] . ' ' . $m[1];
$title = "$names — taklifnoma";
$desc = trim($date . ($inv['venue_name'] ? ', ' . $inv['venue_name'] : ''), ', ');
$url = site_url() . '/' . $slug . '/';
$image = site_url() . '/og/' . $inv['template_slug'] . '.png';

$h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$meta = sprintf(
    '<meta property="og:type" content="website"><meta property="og:title" content="%1$s"><meta property="og:description" content="%2$s"><meta property="og:url" content="%3$s"><meta property="og:image" content="%4$s"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="noindex">',
    $h($title), $h($desc), $h($url), $h($image)
);

$html = (string)file_get_contents($shell);
$html = preg_replace('#<title>.*?</title>#s', '<title>' . $h($title) . '</title>', $html, 1);
$html = preg_replace('#<meta (property|name)="(og:[^"]+|twitter:[^"]+)"[^>]*>#', '', $html);
$html = str_replace('</head>', $meta . '</head>', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
echo $html;
