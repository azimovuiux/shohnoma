ALTER TABLE `users` ADD COLUMN `login` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `password_hash` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_login_unique` UNIQUE(`login`);
--> statement-breakpoint
INSERT INTO `users` (`id`, `name`, `login`, `password_hash`, `is_admin`) VALUES ('superadmin00000000000000', 'Superadmin', 'admin', '$2y$10$2N6Vh6Oqv/xPjTU9oLJAUOCyXWpermRW/i6JigiFuWeSgxZF7gREy', 1);
