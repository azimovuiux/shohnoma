-- Maxsus mehmonlar: ism bilan shaxsiy havola (/<slug>/?g=<token>), ochganini va javobini kuzatish
CREATE TABLE IF NOT EXISTS `special_guests` (
	`id` varchar(32) NOT NULL,
	`invitation_id` varchar(32) NOT NULL,
	`name` varchar(80) NOT NULL,
	`token` varchar(16) NOT NULL,
	`note` varchar(200) NULL,
	`first_opened_at` datetime NULL,
	`last_opened_at` datetime NULL,
	`open_count` int NOT NULL DEFAULT 0,
	`pos` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `special_guests_id` PRIMARY KEY(`id`),
	CONSTRAINT `special_guests_token_unique` UNIQUE(`token`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `special_guests_inv_idx` ON `special_guests` (`invitation_id`);
--> statement-breakpoint
ALTER TABLE `guest_responses` ADD COLUMN `special_guest_id` varchar(32) NULL;
--> statement-breakpoint
CREATE INDEX `guest_special_idx` ON `guest_responses` (`special_guest_id`);
