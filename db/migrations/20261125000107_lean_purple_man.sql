CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`state` text NOT NULL,
	`items` text,
	`summary` text,
	`report` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_imports_user_created` ON `imports` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `favorite_media` ADD `import_id` text;--> statement-breakpoint
CREATE INDEX `idx_favorite_media_import` ON `favorite_media` (`import_id`);--> statement-breakpoint
ALTER TABLE `library_entries` ADD `import_id` text;--> statement-breakpoint
CREATE INDEX `idx_library_import` ON `library_entries` (`import_id`);--> statement-breakpoint
ALTER TABLE `watch_events` ADD `import_id` text;--> statement-breakpoint
CREATE INDEX `idx_watch_import` ON `watch_events` (`import_id`);