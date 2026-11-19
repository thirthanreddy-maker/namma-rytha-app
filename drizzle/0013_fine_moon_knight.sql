CREATE TABLE `signInHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`method` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signInHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `signInHistory` ADD CONSTRAINT `signInHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sign_in_history_user_idx` ON `signInHistory` (`userId`,`createdAt`);