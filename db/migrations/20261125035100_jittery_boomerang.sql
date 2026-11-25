CREATE TABLE `password_reset_links` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL
);
