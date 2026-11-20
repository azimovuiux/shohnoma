CREATE TABLE IF NOT EXISTS `settings` (
	`k` varchar(64) NOT NULL,
	`v` text NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `settings_k` PRIMARY KEY(`k`)
);
