-- Snapshot course/hole data onto games so editing a course never changes past games.
-- NOTE: runs with foreign_keys OFF (DatabaseProvider turns FKs on only after migrations), so
-- rebuilding `games` below does not cascade-delete game_players/scores. PRAGMA foreign_keys is a
-- no-op inside the migrator's transaction, which is why it is not set here.
CREATE TABLE `game_holes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`hole_id` integer,
	`number` integer NOT NULL,
	`par` integer NOT NULL,
	`length` integer,
	`difficulty` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hole_id`) REFERENCES `holes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "game_holes_par_positive" CHECK("game_holes"."par" > 0),
	CONSTRAINT "game_holes_number_positive" CHECK("game_holes"."number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_holes_game_number_uq` ON `game_holes` (`game_id`,`number`);--> statement-breakpoint
CREATE INDEX `game_holes_hole_id_idx` ON `game_holes` (`hole_id`);--> statement-breakpoint
-- Backfill: every existing game gets a copy of its course's current holes.
INSERT INTO `game_holes` (`game_id`, `hole_id`, `number`, `par`, `length`, `difficulty`)
SELECT g.`id`, h.`id`, h.`number`, h.`par`, h.`length`, h.`difficulty`
FROM `games` g
INNER JOIN `holes` h ON h.`course_id` = g.`course_id`
ORDER BY g.`id`, h.`number`;--> statement-breakpoint
CREATE TABLE `__new_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer,
	`course_name` text NOT NULL,
	`venue_name` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- Backfill the course/venue name snapshots from current data.
INSERT INTO `__new_games` (`id`, `course_id`, `course_name`, `venue_name`, `started_at`, `completed_at`, `status`)
SELECT g.`id`, g.`course_id`, coalesce(c.`name`, ''), coalesce(v.`name`, ''), g.`started_at`, g.`completed_at`, g.`status`
FROM `games` g
LEFT JOIN `courses` c ON c.`id` = g.`course_id`
LEFT JOIN `venues` v ON v.`id` = c.`venue_id`;--> statement-breakpoint
DROP TABLE `games`;--> statement-breakpoint
ALTER TABLE `__new_games` RENAME TO `games`;--> statement-breakpoint
CREATE INDEX `games_course_id_idx` ON `games` (`course_id`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_started_at_idx` ON `games` (`started_at`);--> statement-breakpoint
CREATE TABLE `__new_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`game_hole_id` integer NOT NULL,
	`strokes` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_hole_id`) REFERENCES `game_holes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "scores_strokes_positive" CHECK("__new_scores"."strokes" > 0)
);
--> statement-breakpoint
-- Remap scores from holes to the game's snapshot holes (same game, same source hole).
INSERT INTO `__new_scores` (`id`, `game_id`, `player_id`, `game_hole_id`, `strokes`, `updated_at`)
SELECT s.`id`, s.`game_id`, s.`player_id`, gh.`id`, s.`strokes`, s.`updated_at`
FROM `scores` s
INNER JOIN `game_holes` gh ON gh.`game_id` = s.`game_id` AND gh.`hole_id` = s.`hole_id`;--> statement-breakpoint
DROP TABLE `scores`;--> statement-breakpoint
ALTER TABLE `__new_scores` RENAME TO `scores`;--> statement-breakpoint
CREATE UNIQUE INDEX `scores_game_player_hole_uq` ON `scores` (`game_id`,`player_id`,`game_hole_id`);--> statement-breakpoint
CREATE INDEX `scores_player_id_idx` ON `scores` (`player_id`);--> statement-breakpoint
CREATE INDEX `scores_game_hole_id_idx` ON `scores` (`game_hole_id`);
