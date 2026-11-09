<?php
/**
 * Shohnoma API — umumiy ishga tushirish: .env, PDO, JSON javoblar, xatolar.
 * Hosting: Plesk, PHP 8.2+, MariaDB. Node.js kerak emas.
 */
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Tashkent');

const ROOT = __DIR__ . '/../..';            // sayt ildizi (deploy papkasi)

/* ── .env ── */
function load_env(): void
{
    $candidates = [ROOT . '/.env', ROOT . '/../shohnoma-private/.env', ROOT . '/../.shohnoma.env'];
    foreach ($candidates as $file) {
        if (!is_file($file)) continue;
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) $v = substr($v, 1, -1);
            if (getenv($k) === false) putenv("$k=$v");
            $_ENV[$k] = $_ENV[$k] ?? $v;
        }
        return;
    }
}
load_env();

/** Admin paneldan o‘zgartiriladigan sozlamalar (settings jadvali .env dan ustun) */
const SETTING_KEYS = [
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID',
    'P2P_CARD', 'P2P_HOLDER', 'P2P_BANK',
    'PAYME_MERCHANT_ID', 'PAYME_KEY',
    'CLICK_SERVICE_ID', 'CLICK_MERCHANT_ID', 'CLICK_SECRET_KEY', 'CLICK_MERCHANT_USER_ID',
    'GA_MEASUREMENT_ID',
    'PAYME_DISABLED', 'CLICK_DISABLED', 'P2P_DISABLED',
];

function db_settings(bool $fresh = false): array
{
    static $cache = null;
    if ($cache !== null && !$fresh) return $cache;
    $cache = [];
    try {
        foreach (db()->query('SELECT k, v FROM settings')->fetchAll() as $r) $cache[$r['k']] = (string)$r['v'];
    } catch (Throwable) {
        // jadval hali yo‘q (migratsiyadan oldin) — .env bilan ishlaymiz
    }
    return $cache;
}

function env(string $key, ?string $default = null): ?string
{
    if (in_array($key, SETTING_KEYS, true)) {
        $s = db_settings()[$key] ?? '';
        if ($s !== '') return $s;
    }
    $v = $_ENV[$key] ?? getenv($key);
    return ($v === false || $v === '') ? $default : (string)$v;
}

function setting_set(string $key, ?string $value): void
{
    if ($value === null || $value === '') q('DELETE FROM settings WHERE k = ?', [$key]);
    else q('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = UTC_TIMESTAMP()', [$key, $value]);
    db_settings(true);
}

function site_url(): string { return rtrim(env('SITE_URL', 'https://shohnoma.uz'), '/'); }
function is_https(): bool { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'; }

/* ── DB ── */
function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $url = env('DATABASE_URL');
    if (!$url) throw new RuntimeException('DATABASE_URL sozlanmagan (.env)');
    $p = parse_url($url);
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $p['host'] ?? 'localhost', $p['port'] ?? 3306, ltrim($p['path'] ?? '', '/'));
    $pdo = new PDO($dsn, urldecode($p['user'] ?? ''), urldecode($p['pass'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    require_once __DIR__ . '/migrate.php';
    migrate($pdo);
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}
function one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r ?: null; }
function all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function scalar(string $sql, array $params = []): mixed { return q($sql, $params)->fetchColumn(); }

/* ── ID / token ── */
function new_id(int $len = 24): string
{
    $a = '0123456789abcdefghijklmnopqrstuvwxyz';
    $b = random_bytes($len);
    $s = '';
    for ($i = 0; $i < $len; $i++) $s .= $a[ord($b[$i]) % 36];
    return $s;
}
function new_token(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }
function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
/** DB'dagi UTC datetime → ISO (frontend uchun) */
function iso(?string $dt): ?string { return $dt ? str_replace(' ', 'T', $dt) . 'Z' : null; }

/* ── HTTP ── */
class HttpError extends Exception
{
    public function __construct(string $message, public int $status = 400) { parent::__construct($message); }
}
function fail(string $error, int $status = 400): never { throw new HttpError($error, $status); }

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array
{
    static $b = null;
    if ($b !== null) return $b;
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'application/json')) {
        $b = json_decode(file_get_contents('php://input') ?: '[]', true) ?? [];
    } else {
        $b = $_POST;
    }
    return is_array($b) ? $b : [];
}

function client_ip(): string
{
    $f = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    return $f ? trim(explode(',', $f)[0]) : ($_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'local');
}

/** DB asosidagi rate-limit (PHP so‘rovlar orasida xotira saqlanmaydi) */
function rate_limited(string $key, int $max = 5, int $windowSec = 600): bool
{
    $since = gmdate('Y-m-d H:i:s', time() - $windowSec);
    q('DELETE FROM rate_hits WHERE created_at < ?', [gmdate('Y-m-d H:i:s', time() - 86400)]);
    $n = (int)scalar('SELECT COUNT(*) FROM rate_hits WHERE k = ? AND created_at >= ?', [$key, $since]);
    q('INSERT INTO rate_hits (k, created_at) VALUES (?, ?)', [$key, now_utc()]);
    return $n >= $max;
}

function str_in(mixed $v, int $max = 1000): string { return mb_substr(trim((string)($v ?? '')), 0, $max); }
