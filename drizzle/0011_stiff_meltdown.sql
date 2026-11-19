CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`message` text NOT NULL,
	`ctaLabel` varchar(40) NOT NULL DEFAULT 'Learn more',
	`targetView` varchar(80) NOT NULL DEFAULT 'Community',
	`tone` enum('green','amber','blue') NOT NULL DEFAULT 'green',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`targetCrop` varchar(80),
	`targetLocation` varchar(160),
	`publishAt` timestamp NOT NULL,
	`expireAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcements_status_idx` ON `announcements` (`status`,`publishAt`,`expireAt`);--> statement-breakpoint
CREATE INDEX `announcements_target_idx` ON `announcements` (`targetCrop`,`targetLocation`);