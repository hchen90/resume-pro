CREATE TABLE `job_descriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `job_descriptions_updated_idx` ON `job_descriptions` (`updated_at`);
