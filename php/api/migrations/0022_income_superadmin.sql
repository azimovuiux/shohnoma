-- Haqiqiy tushum: buyurtma narxi (amount) emas, kelib tushgan pul. NULL — eski yozuv (narx hisoblanadi)
ALTER TABLE `orders` ADD COLUMN `income` int(11) NULL AFTER `amount`;
--> statement-breakpoint
-- Super admin: tushumni tuzatish va super admin rolini berish faqat unda
ALTER TABLE `users` ADD COLUMN `is_superadmin` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_admin`;
--> statement-breakpoint
UPDATE `users` SET `is_superadmin` = 1, `is_admin` = 1 WHERE `id` = 'superadmin00000000000000';
--> statement-breakpoint
UPDATE `users` SET `is_superadmin` = 1 WHERE `is_admin` = 1 AND (SELECT c FROM (SELECT COUNT(*) AS c FROM `users` WHERE `is_superadmin` = 1) t) = 0;
--> statement-breakpoint
-- 2026-11-20 (Toshkent) dan to‘langanlar: tushum = haqiqiy to‘lov summasi; qo‘lda faollashtirilgan, test/sandbox → 0
UPDATE `orders` o SET o.`income` = COALESCE((
  SELECT SUM(p.`amount`) FROM `payments` p
  WHERE p.`order_id` = o.`id` AND p.`status` = 'paid'
    AND (p.`external_id` IS NULL OR p.`external_id` NOT LIKE 'sandbox-%')
    AND COALESCE(JSON_VALUE(p.`meta`, '$.test'), 'false') NOT IN ('true', '1')
), 0)
WHERE o.`income` IS NULL AND o.`status` IN ('paid', 'active', 'archived') AND o.`paid_at` >= '2026-11-19 19:00:00';
