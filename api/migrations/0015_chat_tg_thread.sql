-- Bot support: xabarning mijoz chatidagi id si — kim qaysi xabarga reply qilsa, ikkinchi tomonda ham o‘sha xabarga reply bo‘ladi
ALTER TABLE `chat_messages` ADD COLUMN `tg_user_msg_id` bigint NULL;
--> statement-breakpoint
CREATE INDEX `chat_messages_tg_user` ON `chat_messages` (`session_id`, `tg_user_msg_id`);
