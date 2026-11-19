ALTER TABLE `users` ADD `farmLocation` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLanguage` varchar(16) DEFAULT 'English' NOT NULL;