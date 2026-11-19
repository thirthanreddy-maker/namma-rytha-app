ALTER TABLE `cropCycles` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
CREATE INDEX `crop_cycles_schedule_idx` ON `cropCycles` (`scheduleCronTaskUid`);