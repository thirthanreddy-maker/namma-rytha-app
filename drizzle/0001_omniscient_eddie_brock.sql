CREATE TABLE `agronomistReviewRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`crop` varchar(80) NOT NULL,
	`aiCondition` varchar(255),
	`aiConfidence` int,
	`farmerNote` text,
	`status` enum('requested','assigned','resolved') NOT NULL DEFAULT 'requested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agronomistReviewRequests_id` PRIMARY KEY(`id`)
);
