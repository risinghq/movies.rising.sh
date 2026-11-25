-- void:allow-destructive
-- Rebuilds watch_events to make the watch date nullable. Every row is copied.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_watch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`media_type` text NOT NULL,
	`season_number` integer,
	`episode_number` integer,
	`watched_at` integer,
	`watched_on` text,
	`utc_offset_minutes` integer,
	`import_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_watch_events`("id", "user_id", "media_id", "media_type", "season_number", "episode_number", "watched_at", "watched_on", "utc_offset_minutes", "import_id", "created_at") SELECT "id", "user_id", "media_id", "media_type", "season_number", "episode_number", "watched_at", "watched_on", "utc_offset_minutes", "import_id", "created_at" FROM `watch_events`;--> statement-breakpoint
DROP TABLE `watch_events`;--> statement-breakpoint
ALTER TABLE `__new_watch_events` RENAME TO `watch_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_at` ON `watch_events` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_on` ON `watch_events` (`user_id`,`watched_on`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_media_episode` ON `watch_events` (`user_id`,`media_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE INDEX `idx_watch_import` ON `watch_events` (`import_id`);