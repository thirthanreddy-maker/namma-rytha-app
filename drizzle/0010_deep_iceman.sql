CREATE TABLE `communityComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`body` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communityPostLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityPostLikes_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_post_like_unique` UNIQUE(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `communityPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('post','reel') NOT NULL DEFAULT 'post',
	`mediaType` enum('image','video') NOT NULL,
	`mediaUrl` varchar(512) NOT NULL,
	`mediaKey` varchar(512) NOT NULL,
	`caption` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communityComments` ADD CONSTRAINT `communityComments_postId_communityPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityComments` ADD CONSTRAINT `communityComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityPostLikes` ADD CONSTRAINT `communityPostLikes_postId_communityPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityPostLikes` ADD CONSTRAINT `communityPostLikes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityPosts` ADD CONSTRAINT `communityPosts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_comments_post_idx` ON `communityComments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_post_likes_post_idx` ON `communityPostLikes` (`postId`);--> statement-breakpoint
CREATE INDEX `community_posts_feed_idx` ON `communityPosts` (`kind`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_posts_user_idx` ON `communityPosts` (`userId`,`createdAt`);