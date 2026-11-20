-- Promokodlar va buyurtmadagi promokod chegirmasi
CREATE TABLE IF NOT EXISTS `promo_codes` (
	`id` varchar(32) NOT NULL,
	`code` varchar(40) NOT NULL,
	`kind` varchar(10) NOT NULL DEFAULT 'percent',
	`value` int NOT NULL,
	`max_uses` int,
	`used` int NOT NULL DEFAULT 0,
	`expires_at` datetime,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`note` varchar(190),
	`created_at` datetime NOT NULL,
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_codes_code` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `promo_code` varchar(40);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `promo_discount` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `price_locked` tinyint NOT NULL DEFAULT 0;
