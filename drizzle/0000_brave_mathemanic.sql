CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`password` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'unverified' NOT NULL,
	`expires_at` text,
	`team_id` text,
	`profile_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `installs` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_token_hash` text NOT NULL,
	`file_key` text NOT NULL,
	`bundle_id` text NOT NULL,
	`title` text NOT NULL,
	`version` text NOT NULL,
	`size` integer NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`client_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_installs_expiry` ON `installs` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_installs_client_created` ON `installs` (`client_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
