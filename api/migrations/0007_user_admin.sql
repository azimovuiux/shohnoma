ALTER TABLE `users` ADD COLUMN `is_blocked` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `note` text NULL;
