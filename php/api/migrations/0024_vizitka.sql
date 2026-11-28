-- «Vizitka» (raqamli vizitka) — alohida mahsulot. Buyurtma `orders` da (product='vizitka'), ma’lumot `cards` da.
-- Vizitka buyurtmasida invitations qatori bo‘lmaydi — taklifnoma kodlari uni ko‘rmaydi.
ALTER TABLE `orders` ADD `product` enum('taklifnoma','vizitka') NOT NULL DEFAULT 'taklifnoma';
--> statement-breakpoint
CREATE INDEX `orders_product_status_idx` ON `orders` (`product`, `status`);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` varchar(32) NOT NULL,
	`order_id` varchar(32) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`full_name` varchar(120) NOT NULL DEFAULT '',
	`phone` varchar(20),
	`email` varchar(160),
	`telegram` varchar(80),
	`photos` text,
	`logo` varchar(200),
	`data` mediumtext,
	`lead_form` tinyint NOT NULL DEFAULT 1,
	`views` int NOT NULL DEFAULT 0,
	`vcf_downloads` int NOT NULL DEFAULT 0,
	`share_image` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `cards_order_unique` UNIQUE(`order_id`),
	CONSTRAINT `cards_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `card_leads` (
	`id` varchar(32) NOT NULL,
	`card_id` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`company` varchar(160),
	`contact` varchar(160) NOT NULL,
	`purpose` varchar(60),
	`message` text,
	`status` enum('new','seen','done') NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `card_leads_id` PRIMARY KEY(`id`),
	KEY `card_leads_card_idx` (`card_id`, `created_at`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
