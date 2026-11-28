<?php
declare(strict_types=1);

/**
 * Oddiy migratsiya: api/migrations/*.sql fayllari tartib bilan bir marta bajariladi.
 * Drizzle fayllaridagi "--> statement-breakpoint" bo‘yicha bo‘linadi.
 * Tezlik uchun natija storage/.migrated faylida eslab qolinadi.
 */
function migrate(PDO $pdo): void
{
    $dir = __DIR__ . '/../migrations';
    $files = glob($dir . '/*.sql') ?: [];
    sort($files);
    $sig = md5(implode('|', array_map('basename', $files)));
    $flag = storage_dir() . '/.migrated';
    if (is_file($flag) && trim((string)file_get_contents($flag)) === $sig) return;

    $lock = fopen(storage_dir() . '/.migrate.lock', 'c');
    flock($lock, LOCK_EX);
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS `_migrations` (`name` varchar(190) NOT NULL PRIMARY KEY, `applied_at` datetime NOT NULL)');
        $done = $pdo->query('SELECT name FROM _migrations')->fetchAll(PDO::FETCH_COLUMN);
        foreach ($files as $f) {
            $name = basename($f);
            if (in_array($name, $done, true)) continue;
            $sql = (string)file_get_contents($f);
            foreach (preg_split('/-->\s*statement-breakpoint/', $sql) as $stmt) {
                $stmt = trim($stmt);
                if ($stmt === '') continue;
                try {
                    $pdo->exec($stmt);
                } catch (PDOException $e) {
                    // Jadval/indeks allaqachon bor bo‘lsa (oldingi Node versiyasidan) — o‘tkazib yuboramiz
                    if (!preg_match('/already exists|Duplicate key name|Duplicate column/i', $e->getMessage())) throw $e;
                }
            }
            $pdo->prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP())')->execute([$name]);
        }
        file_put_contents($flag, $sig);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function storage_dir(): string
{
    $dir = env('STORAGE_DIR') ?? (ROOT . '/../shohnoma-storage');
    if (!str_starts_with($dir, '/')) $dir = ROOT . '/' . $dir;
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    return $dir;
}
