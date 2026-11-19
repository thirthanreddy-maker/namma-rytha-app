ALTER TABLE `plots` ADD `ingestToken` varchar(96);--> statement-breakpoint
ALTER TABLE `plots` ADD CONSTRAINT `plots_ingestToken_unique` UNIQUE(`ingestToken`);