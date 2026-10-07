CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courses_venue_id_idx` ON `courses` (`venue_id`);--> statement-breakpoint
CREATE TABLE `game_players` (
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_players_game_position_uq` ON `game_players` (`game_id`,`position`);--> statement-breakpoint
CREATE INDEX `game_players_player_id_idx` ON `game_players` (`player_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `games_course_id_idx` ON `games` (`course_id`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_started_at_idx` ON `games` (`started_at`);--> statement-breakpoint
CREATE TABLE `holes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`number` integer NOT NULL,
	`par` integer NOT NULL,
	`length` integer,
	`difficulty` text,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "holes_par_positive" CHECK("holes"."par" > 0),
	CONSTRAINT "holes_number_positive" CHECK("holes"."number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holes_course_number_uq` ON `holes` (`course_id`,`number`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`handicap` integer,
	`is_owner` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_single_owner_uq` ON `players` (`is_owner`) WHERE "players"."is_owner" = 1;--> statement-breakpoint
CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`hole_id` integer NOT NULL,
	`strokes` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hole_id`) REFERENCES `holes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "scores_strokes_positive" CHECK("scores"."strokes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_game_player_hole_uq` ON `scores` (`game_id`,`player_id`,`hole_id`);--> statement-breakpoint
CREATE INDEX `scores_player_id_idx` ON `scores` (`player_id`);--> statement-breakpoint
CREATE INDEX `scores_hole_id_idx` ON `scores` (`hole_id`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
