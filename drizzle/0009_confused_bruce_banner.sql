CREATE TABLE `notificationDeliveryLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('sms','whatsapp') NOT NULL,
	`status` enum('delivered','failed') NOT NULL,
	`recipient` varchar(32) NOT NULL,
	`message` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationDeliveryLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `notificationDeliveryLogs` ADD CONSTRAINT `notificationDeliveryLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_logs_user_idx` ON `notificationDeliveryLogs` (`userId`,`createdAt`);