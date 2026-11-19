CREATE TABLE `announcementEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('view','cta_click') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcementEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcementTranslations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`language` enum('Kannada','Hindi') NOT NULL,
	`title` varchar(120) NOT NULL,
	`message` text NOT NULL,
	`ctaLabel` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcementTranslations_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcement_translation_unique` UNIQUE(`announcementId`,`language`)
);
--> statement-breakpoint
ALTER TABLE `announcementEvents` ADD CONSTRAINT `announcementEvents_announcementId_announcements_id_fk` FOREIGN KEY (`announcementId`) REFERENCES `announcements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcementEvents` ADD CONSTRAINT `announcementEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcementTranslations` ADD CONSTRAINT `announcementTranslations_announcementId_announcements_id_fk` FOREIGN KEY (`announcementId`) REFERENCES `announcements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcement_events_announcement_idx` ON `announcementEvents` (`announcementId`,`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `announcement_events_user_idx` ON `announcementEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `announcement_translation_announcement_idx` ON `announcementTranslations` (`announcementId`);