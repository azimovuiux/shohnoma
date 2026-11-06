CREATE TABLE IF NOT EXISTS `tg_logins` (
	`id` varchar(32) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`browser_hash` char(64) NOT NULL,
	`link_user_id` varchar(32),
	`tg_user_id` varchar(32),
	`user_id` varchar(32),
	`status` varchar(12) NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tg_logins_id` PRIMARY KEY(`id`),
	CONSTRAINT `tg_logins_code` UNIQUE(`code_hash`)
);
