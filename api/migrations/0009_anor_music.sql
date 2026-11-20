-- Eski test shablonlar butunlay o‘chiriladi; jadval bo‘sh qolgach templates.json (Anor) bilan qayta to‘ldiriladi
DELETE FROM `templates`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `music_tracks` (
	`id` varchar(32) NOT NULL,
	`title` varchar(120) NOT NULL,
	`artist` varchar(120) NULL,
	`duration` int NULL,
	`size` int NOT NULL DEFAULT 0,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `music_tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invitations` ADD COLUMN `music_track` varchar(32) NULL;
