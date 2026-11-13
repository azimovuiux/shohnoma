CREATE TABLE `briefs` (
	`id` varchar(32) NOT NULL,
	`ceremony` enum('nikoh','fotiha','sunnat','tugilgan-kun','boshqa') NOT NULL,
	`date` varchar(10),
	`guest_count` int,
	`styles` json,
	`colors` json,
	`ideas` text,
	`references` json,
	`budget` varchar(20) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(16) NOT NULL,
	`contact_via` varchar(16) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `briefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` varchar(32) NOT NULL,
	`template_slug` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `favorites_user_id_template_slug_pk` PRIMARY KEY(`user_id`,`template_slug`)
);
--> statement-breakpoint
CREATE TABLE `guest_responses` (
	`id` varchar(32) NOT NULL,
	`invitation_id` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`status` enum('coming','maybe','not_coming') NOT NULL,
	`count` int NOT NULL DEFAULT 1,
	`wish` text,
	`edit_token` varchar(48) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `guest_responses_id` PRIMARY KEY(`id`),
	CONSTRAINT `guest_responses_edit_token_unique` UNIQUE(`edit_token`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(32) NOT NULL,
	`order_id` varchar(32) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`ceremony` enum('nikoh','fotiha','sunnat','tugilgan-kun','boshqa') NOT NULL,
	`person_a` varchar(80) NOT NULL DEFAULT '',
	`person_b` varchar(80),
	`date` varchar(16) NOT NULL DEFAULT '',
	`venue_name` varchar(160) NOT NULL DEFAULT '',
	`address` varchar(200) NOT NULL DEFAULT '',
	`map_url` varchar(500),
	`message` text,
	`program` json,
	`photos` json,
	`rsvp_enabled` boolean NOT NULL DEFAULT true,
	`rsvp_deadline` varchar(10),
	`music_enabled` boolean NOT NULL DEFAULT true,
	`contact_phone` varchar(16),
	`contact_tg` varchar(64),
	`views` int NOT NULL DEFAULT 0,
	`day_before_sent_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_order_id_unique` UNIQUE(`order_id`),
	CONSTRAINT `invitations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(16) NOT NULL,
	`ceremony` varchar(20),
	`message` text,
	`reply_via` varchar(16) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(32) NOT NULL,
	`code` varchar(16) NOT NULL,
	`seq` int NOT NULL,
	`user_id` varchar(32),
	`template_slug` varchar(64) NOT NULL,
	`status` enum('draft','pending_payment','payment_processing','p2p_review','p2p_rejected','payment_failed','paid','active','archived') NOT NULL DEFAULT 'draft',
	`amount` int NOT NULL,
	`guest_token` varchar(64),
	`paid_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`code`),
	CONSTRAINT `orders_seq_unique` UNIQUE(`seq`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` varchar(32) NOT NULL,
	`phone` varchar(16) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(32) NOT NULL,
	`order_id` varchar(32) NOT NULL,
	`provider` enum('payme','click','google_pay','p2p') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('created','processing','paid','failed','cancelled','review','rejected') NOT NULL DEFAULT 'created',
	`external_id` varchar(64),
	`meta` json,
	`receipt_url` varchar(300),
	`review_note` varchar(300),
	`reviewed_by` varchar(32),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`paid_at` datetime,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `pay_ext_idx` UNIQUE(`provider`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(32) NOT NULL,
	`phone` varchar(16),
	`name` varchar(120),
	`telegram_id` varchar(32),
	`telegram_user` varchar(64),
	`locale` varchar(4) NOT NULL DEFAULT 'uz',
	`is_admin` boolean NOT NULL DEFAULT false,
	`notify_rsvp_telegram` boolean NOT NULL DEFAULT true,
	`notify_rsvp_sms` boolean NOT NULL DEFAULT false,
	`notify_day_before` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `users_telegram_id_unique` UNIQUE(`telegram_id`)
);
--> statement-breakpoint
CREATE INDEX `guest_inv_idx` ON `guest_responses` (`invitation_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otp_codes` (`phone`);--> statement-breakpoint
CREATE INDEX `pay_order_idx` ON `payments` (`order_id`);