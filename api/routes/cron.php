<?php
declare(strict_types=1);

/**
 * Marosimga (to‘y, tug‘ilgan kun) 1 kun qolganda eslatma. Plesk "Planировщик задач" → har kuni:
 *   https://shohnoma.uz/api/cron/reminders?secret=CRON_SECRET
 */
route('GET', '/cron/reminders', function () {
    $secret = env('CRON_SECRET');
    if (!$secret || !hash_equals($secret, (string)($_GET['secret'] ?? ''))) fail('Ruxsat yo‘q', 403);
    $tomorrow = gmdate('Y-m-d', time() + 5 * 3600 + 86400);
    $rows = all("SELECT i.*, o.user_id FROM invitations i JOIN orders o ON o.id = i.order_id WHERE o.status = 'active' AND i.date LIKE ? AND i.day_before_sent_at IS NULL", [$tomorrow . '%']);
    $sent = 0;
    foreach ($rows as $inv) {
        $owner = $inv['user_id'] ? one('SELECT * FROM users WHERE id = ?', [$inv['user_id']]) : null;
        if ($owner && $owner['notify_day_before'] && $owner['telegram_id']) {
            $s = invitation_stats($inv['id']);
            $what = match ($inv['ceremony'] ?? '') {
                'tugilgan-kun' => 'tug‘ilgan kun bayrami',
                'korporativ' => 'tadbiringiz',
                default => 'to‘yingiz',
            };
            notify_user($owner['telegram_id'], "🎉 Ertaga {$what}! Javoblar: {$s['coming']} boraman · {$s['maybe']} aniq emas · {$s['notComing']} kela olmaydi");
            $sent++;
        }
        q('UPDATE invitations SET day_before_sent_at = UTC_TIMESTAMP() WHERE id = ?', [$inv['id']]);
    }
    json_out(['ok' => true, 'checked' => count($rows), 'sent' => $sent]);
});
