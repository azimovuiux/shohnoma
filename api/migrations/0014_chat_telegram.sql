-- Telegram bot orqali support: botga yozgan mijoz ham sayt chati kabi suhbat (chat_sessions) bo‘ladi
ALTER TABLE `chat_sessions` ADD COLUMN `tg_chat_id` varchar(32) NULL;
--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD COLUMN `tg_username` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `chat_sessions` MODIFY `phone` varchar(16) NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_sessions_tg_chat` ON `chat_sessions` (`tg_chat_id`);
