ALTER TABLE `users` ADD `phoneNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `notificationChannel` enum('in_app','sms','whatsapp') DEFAULT 'in_app' NOT NULL;