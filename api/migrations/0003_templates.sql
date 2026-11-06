CREATE TABLE IF NOT EXISTS `templates` (
	`slug` varchar(80) NOT NULL,
	`data` longtext NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `templates_slug` PRIMARY KEY(`slug`)
);
