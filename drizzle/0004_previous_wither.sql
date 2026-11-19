CREATE TABLE `cropCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotId` int NOT NULL,
	`crop` varchar(80) NOT NULL,
	`sowingDate` timestamp NOT NULL,
	`expectedHarvestDate` timestamp NOT NULL,
	`status` enum('planned','active','harvested') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cropCycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `farmExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotId` int,
	`category` varchar(80) NOT NULL,
	`label` varchar(160) NOT NULL,
	`amount` int NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `farmExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `farmSales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotId` int,
	`crop` varchar(80) NOT NULL,
	`quantityKg` int NOT NULL,
	`pricePerQuintal` int NOT NULL,
	`totalAmount` int NOT NULL,
	`soldAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `farmSales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `farmTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotId` int,
	`cycleId` int,
	`title` varchar(160) NOT NULL,
	`detail` text,
	`dueDate` timestamp NOT NULL,
	`completedAt` timestamp,
	`status` enum('pending','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `farmTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`crop` varchar(80) NOT NULL,
	`areaAcres` int NOT NULL DEFAULT 1,
	`soilType` varchar(80) NOT NULL DEFAULT 'Loamy',
	`growthStage` varchar(80) NOT NULL DEFAULT 'Seedling',
	`latitude` varchar(32),
	`longitude` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensorReadings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plotId` int NOT NULL,
	`moisture` int NOT NULL,
	`temperature` int NOT NULL,
	`humidity` int NOT NULL,
	`battery` int NOT NULL DEFAULT 100,
	`source` enum('sensor','simulated') NOT NULL DEFAULT 'simulated',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensorReadings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cropCycles` ADD CONSTRAINT `cropCycles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cropCycles` ADD CONSTRAINT `cropCycles_plotId_plots_id_fk` FOREIGN KEY (`plotId`) REFERENCES `plots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmExpenses` ADD CONSTRAINT `farmExpenses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmExpenses` ADD CONSTRAINT `farmExpenses_plotId_plots_id_fk` FOREIGN KEY (`plotId`) REFERENCES `plots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmSales` ADD CONSTRAINT `farmSales_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmSales` ADD CONSTRAINT `farmSales_plotId_plots_id_fk` FOREIGN KEY (`plotId`) REFERENCES `plots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmTasks` ADD CONSTRAINT `farmTasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmTasks` ADD CONSTRAINT `farmTasks_plotId_plots_id_fk` FOREIGN KEY (`plotId`) REFERENCES `plots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farmTasks` ADD CONSTRAINT `farmTasks_cycleId_cropCycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `cropCycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plots` ADD CONSTRAINT `plots_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensorReadings` ADD CONSTRAINT `sensorReadings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensorReadings` ADD CONSTRAINT `sensorReadings_plotId_plots_id_fk` FOREIGN KEY (`plotId`) REFERENCES `plots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `crop_cycles_user_idx` ON `cropCycles` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `farm_expenses_user_idx` ON `farmExpenses` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `farm_sales_user_idx` ON `farmSales` (`userId`,`soldAt`);--> statement-breakpoint
CREATE INDEX `farm_tasks_user_idx` ON `farmTasks` (`userId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `plots_user_idx` ON `plots` (`userId`);--> statement-breakpoint
CREATE INDEX `sensor_readings_plot_idx` ON `sensorReadings` (`plotId`,`recordedAt`);