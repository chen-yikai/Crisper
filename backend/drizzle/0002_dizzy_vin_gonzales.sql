PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_post_replies`("id", "post_id", "user_id", "content", "created_at") SELECT "id", "post_id", "user_id", "content", "created_at" FROM `post_replies`;--> statement-breakpoint
DROP TABLE `post_replies`;--> statement-breakpoint
ALTER TABLE `__new_post_replies` RENAME TO `post_replies`;--> statement-breakpoint
PRAGMA foreign_keys=ON;