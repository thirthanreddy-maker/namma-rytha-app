CREATE TABLE `cropDiagnosisHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotName` varchar(120) NOT NULL,
	`crop` varchar(80) NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`likelyCondition` varchar(255) NOT NULL,
	`category` enum('disease','pest','nutrient_deficiency','healthy','unknown') NOT NULL,
	`confidence` int NOT NULL,
	`severity` enum('low','moderate','high','unknown') NOT NULL,
	`explanation` text NOT NULL,
	`needsAgronomist` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cropDiagnosisHistory_id` PRIMARY KEY(`id`)
);
