-- Maqolalar (blog). group_id — bitta maqolaning uz/ru/en tarjimalarini bog‘laydi (hreflang). body — tozalangan HTML.
CREATE TABLE IF NOT EXISTS `articles` (
	`id` varchar(32) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`lang` varchar(2) NOT NULL DEFAULT 'uz',
	`group_id` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` text NULL,
	`category` varchar(32) NULL,
	`cover` varchar(255) NULL,
	`body` mediumtext NOT NULL,
	`seo_title` varchar(255) NULL,
	`seo_description` varchar(400) NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`published_at` datetime NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `articles_group_lang_unique` UNIQUE(`group_id`, `lang`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `articles_list_idx` ON `articles` (`status`, `lang`, `published_at`);
