CREATE TABLE IF NOT EXISTS `chat_sessions` (
	`id` varchar(32) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(16) NOT NULL,
	`page` varchar(255),
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`unread_admin` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` bigint NOT NULL AUTO_INCREMENT,
	`session_id` varchar(32) NOT NULL,
	`sender` varchar(8) NOT NULL,
	`text` text NOT NULL,
	`tg_message_id` bigint,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chat_messages_session` ON `chat_messages` (`session_id`, `id`);
--> statement-breakpoint
CREATE INDEX `chat_messages_tg` ON `chat_messages` (`tg_message_id`);
