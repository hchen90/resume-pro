CREATE TABLE `resume_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`template_id` text DEFAULT 'classic' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
