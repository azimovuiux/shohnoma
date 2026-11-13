-- Saytdagi bildirishnomalar (taklifnoma egasi uchun): yangi/o‘zgargan mehmon javobi, maxsus mehmon birinchi ochishi, to‘lov holati.
-- id — o‘suvchi raqam: so‘rov (polling) «?after=<oxirgi id>» bilan faqat yangilarini oladi.
CREATE TABLE IF NOT EXISTS `notifications` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`user_id` varchar(32) NOT NULL,
	`invitation_id` varchar(32) NULL,
	`kind` varchar(24) NOT NULL,
	`ref_id` varchar(32) NULL,
	`payload` text NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`read_at` datetime NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`, `id`);
--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`user_id`, `read_at`);
--> statement-breakpoint
CREATE INDEX `notifications_ref_idx` ON `notifications` (`ref_id`);
