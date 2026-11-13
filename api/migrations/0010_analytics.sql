-- Sayt statistikasi: tashriflar (sessiya) va sahifa ko‘rishlar. IP xom holda saqlanmaydi (faqat xesh).
CREATE TABLE IF NOT EXISTS `visits` (
	`id` varchar(32) NOT NULL,
	`visitor_id` varchar(40) NOT NULL,
	`is_new` tinyint NOT NULL DEFAULT 0,
	`started_at` datetime NOT NULL,
	`last_seen` datetime NOT NULL,
	`pages` int NOT NULL DEFAULT 0,
	`entry_path` varchar(255) NOT NULL DEFAULT '/',
	`current_path` varchar(255) NOT NULL DEFAULT '/',
	`referrer` varchar(500),
	`ref_host` varchar(190),
	`source` varchar(60) NOT NULL DEFAULT 'To‘g‘ridan-to‘g‘ri',
	`channel` varchar(20) NOT NULL DEFAULT 'direct',
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(150),
	`country` char(2),
	`device` varchar(10),
	`browser` varchar(30),
	`os` varchar(30),
	`lang` varchar(16),
	`ip_hash` char(64),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `visits_started` ON `visits` (`started_at`);
--> statement-breakpoint
CREATE INDEX `visits_seen` ON `visits` (`last_seen`);
--> statement-breakpoint
CREATE INDEX `visits_visitor` ON `visits` (`visitor_id`, `last_seen`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pageviews` (
	`id` bigint NOT NULL AUTO_INCREMENT,
	`visit_id` varchar(32) NOT NULL,
	`path` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pageviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pageviews_created` ON `pageviews` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geo_cache` (
	`ip_hash` char(64) NOT NULL,
	`country` char(2),
	`created_at` datetime NOT NULL,
	CONSTRAINT `geo_cache_ip` PRIMARY KEY(`ip_hash`)
);
