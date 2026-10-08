# Adventure Golf (Expo / React Native)

Native port of the Figma Make prototype "Adventure Golf Mobile App", with all data stored
locally in SQLite through Drizzle ORM. Works fully offline.

## Run

```bash
npm install            # also applies patches/ via patch-package
npm test               # unit tests + SQLite data-layer tests (sql.js, real migrations)
npx expo start         # press i / a for a simulator, or scan with Expo Go / a dev build
```

A fresh install starts empty and opens the first-run onboarding. To get the old demo data
(Sandton, The Tropical Trail, Alex/Jordan, a finished and a live game) in a dev build instead,
run `npm run start:demo` (sets `EXPO_PUBLIC_DEMO_SEED=1`; it is ignored in release builds and
only seeds when no owner exists yet, so clear the app data first).

Web: `npm run export:web && npm run serve:web` then open http://localhost:8090.
expo-sqlite's web build needs `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers
on the HTML page; `scripts/serve-web.mjs` adds them. (`expo start --web` currently only adds them
to the JS bundles, not the HTML page, so the database can't open in the web dev server.)

## Structure

```
src/app/              Expo Router screens
  _layout.tsx         fonts, providers, stack
  index.tsx           Home (live round, start CTA, clubhouse, last game); redirects to
                      onboarding while no owner exists / onboarding is unfinished
  onboarding/index.tsx  first-run carousel: owner -> venue -> course -> crew (reanimated pager)
  onboarding/complete.tsx  celebration + recap of venue/course/crew (confetti, ball) -> Home
  venues.tsx          Venues tab: venue cards (photo, address, courses / games / last played,
                      your best), sort by name / most played / recent, empty state, add venue
  venue/new.tsx       Add a venue (name, address, photo)
  venue/[id].tsx      Venue detail: stats, courses (tap = edit, Play = start a round there),
                      "Add a course", and every game played there (all courses), newest first
  course/new.tsx      Add a course to a venue (?venueId=; select=1 from New game also selects
                      it for the round), same CourseForm in create mode
  course/[id].tsx     Course edit: name, photo, hole count, par per hole, length/difficulty
                      (shared CourseForm with onboarding); applies to future games only
  scorecard/[id].tsx  Read-only score sheet: hole x player grid, totals, vs par, winner column
  setup.tsx           New game: venue, course, per-hole par editor
  players.tsx         New game step 2, Who's playing: tap to select / add / remove players,
                      start the round (prototype behaviour)
  crew.tsx            Players tab: every player (owner first as "You") with games, calculated
                      handicap and best score; sort by name/handicap/games/best; owner-only
                      empty state; tapping a card opens the player screen
  player/[id].tsx     Player detail: calculated handicap, stats, edit (name, colour, photo,
                      starting handicap), recent
                      rounds, remove (non-owner, with confirmation)
  game/[id].tsx       Live scoring: hole carousel, steppers, scoreboard, round options.
                      "Finish round" opens FinishSheet (winner + totals); only "Confirm result"
                      completes the game, then the stack is reset to Home. Completed games
                      redirect to the score sheet
src/components/       Icon (prototype SVG paths), Logo, LeafDecoration, GolfBall, BottomNav,
                      RoundMenu (bottom sheet + quit confirm), PlayerAvatar, WideCta, Eyebrow, Text,
                      ParEditor (shared by Setup and onboarding), ConfirmDialog, CourseForm,
                      GameCard (Live badge -> continue / finished -> score sheet), FinishSheet
  onboarding/         StepPage, StepDots, Form fields, Confetti, BouncingBall, steps/*
src/lib/handicap.ts   calculated handicap (pure functions) + handicap.test.ts (npm test)
src/lib/stats.ts      per-player stats (rounds, wins, best, avg/hole, holes-in-one, recent)
src/lib/venue-stats.ts  venue/course summaries + sorting (pure, venue-stats.test.ts)
src/lib/results.ts    game ranking / winner headline (pure, results.test.ts)
src/lib/images.ts     image picker -> copy into documentDirectory/images (data: URI on web)
src/db/
  schema.ts           Drizzle schema + relations
  database.ts         the shared `db` handle (any sync Drizzle SQLite db; queries.ts uses this)
  client.ts           expo-sqlite + drizzle client; FKs OFF while migrating, ON afterwards
  provider.tsx        open -> useMigrations -> FKs on -> (dev-only demo seed) -> render
  demo-seed.ts        prototype demo data, only with EXPO_PUBLIC_DEMO_SEED=1 in __DEV__
  queries.ts          all reads/writes
  snapshots.test.ts   migration-upgrade + "course edits don't change past games" tests
  hooks.ts, events.ts useDbQuery: re-query on focus and after writes
drizzle/              generated SQL migrations (bundled via babel-plugin-inline-import)
patches/              expo-sqlite web fixes (see below)
scripts/              serve-web.mjs, screenshots.mjs (prototype vs app, needs a demo build),
                      onboarding-screenshots.mjs (fresh DB walkthrough + checks),
                      players-screenshots.mjs (player edit/delete on a demo build + checks),
                      venues-screenshots.mjs (venues, course edit, score sheet, finish confirm),
                      upgrade-check.mjs (previous build -> this build on the same web DB)
screenshots/          prototype-*.png vs app-*.png, onboarding-*.png, players-*.png, venues-*.png
```

## Database

Tables: `venues`, `courses`, `holes`, `players` (one `is_owner`, enforced by a partial unique
index; `avatar` = colour, optional `photo` URI), `games`, `game_holes`, `game_players` (turn
order), `scores`, `app_meta`. Change `src/db/schema.ts`, then `npm run db:generate`.

**Games are snapshots** (migration `0002_game_snapshots`). Editing a course never changes a game
that has already started:

- `games.course_name`, `games.venue_name`: names copied when the game starts.
- `game_holes` (`game_id` -> games ON DELETE CASCADE, `hole_id` -> holes nullable ON DELETE SET
  NULL, `number`, `par`, `length`, `difficulty`; unique per game/number): the course's holes
  copied by `startGame()`.
- `scores.game_hole_id` -> game_holes (replaces `scores.hole_id`); unique per
  (game, player, game hole).
- `games.course_id` is now nullable with ON DELETE SET NULL, so deleting a course (or venue)
  keeps its games' history; such games just stop appearing under a venue.

The game screen, score sheet, Home, player stats, handicap and venue bests all read holes/par
from `game_holes` and names from the game row, never from the live course. Course edits update
holes in place (deleted holes only null `game_holes.hole_id`). A round already in progress keeps
the layout it started with.

The migration backfills `game_holes` for existing games from the course's current holes, fills
the name snapshots from the current course/venue, and remaps each score via
(game, hole) -> game_hole. It rebuilds `games` and `scores` (SQLite can't alter FKs in place),
so it must run with foreign keys OFF, or `DROP TABLE games` would cascade-delete game players
and scores. SQLite ignores `PRAGMA foreign_keys` inside the migrator's transaction, so the app
opens the DB with FKs off and turns them on after migrations (`client.ts` / `provider.tsx`);
`snapshots.test.ts` checks both the upgrade and that running it with FKs on would lose data.
Other deletes cascade as before (removing a player deletes their scores, and any game left with
no players).

## Handicap

`src/lib/handicap.ts`, unit tested with `npm test` (node:test via tsx):

1. For each completed round the player has scores in, using only the holes they scored:
   differential per hole = (strokes - par of those holes) / holes scored.
2. Take the 20 most recent such rounds; if there are 8 or more, keep the best (lowest) 8,
   otherwise keep them all.
3. Handicap = mean of the kept differentials x 18 (strokes over par per 18 holes), rounded to
   1 decimal. No completed rounds -> "–". Can be negative (better than par).

The manual `players.handicap` column is kept and labelled "Starting handicap": it is only shown
(marked as starting) until the player has a completed round, then the calculated value is used
everywhere. Lists always show the calculated value.

## Venues, score sheet, finishing a round

- Courses: venue detail's "Add a course" card and New game's "Create a new course" open
  `/course/new` for that venue; `createCourse()` writes the course and holes in one transaction.
- Bottom nav: Home, Venues (`/venues`), Players (`/crew`); History still goes to Home and is never
  highlighted. New game (`/setup` -> `/players`) is a flow started from Home, not a tab, so no tab
  is highlighted there. Home's Venues / Players shortcuts open the same tab screens.
- Venue stats (`loadVenueSummaries`): course count and holes, games played = finished games,
  last played = most recent finished or live round, best = lowest FULL round (every hole of that
  round scored), vs par from the round's own snapshot. Abandoned rounds are hidden everywhere.
- Game cards: live rounds show a red "LIVE · HOLE x OF y" badge and open the game screen;
  finished rounds open the read-only score sheet (also from Home's Last game card and player
  recent rounds).
- Finishing: the last hole's "Finish round" shows the result (ranked totals, vs par, winner,
  missing-hole warning). "Confirm result" sets status=completed and completedAt=now (only for a
  live round), then resets the stack to Home, so back can't reopen the round.

Not done yet: editing/deleting venues, deleting courses.

## Onboarding

Shown when there is no owner player, or `app_meta.onboarding = 'in_progress'` (set when the
owner is saved). Each step's primary button writes through Drizzle and slides to the next step;
you can go back (button, swipe, Android back) but never swipe past the first unsaved step.
The venue/course created are remembered in `app_meta` (`onboarding_venue_id`,
`onboarding_course_id`), so going back and saving again updates them, and relaunching mid-way
reopens on the first unsaved step. The last step's "Create" button only marks onboarding
complete (no game is created) and shows a recap of the venue, course and crew; Home then has
no round in progress.

## expo-sqlite web patch

`patches/expo-sqlite+57.0.4.patch` fixes two bugs in expo-sqlite 57.0.4's web worker channel:
the result length was written with `Uint8Array.set(Uint32Array)` (truncating it to one byte, so
any result over 255 bytes failed to parse), and the sync-call timeout was a 1M-iteration
`Atomics.pause()` spin (a few ms), which timed out ordinary writes. iOS/Android are unaffected.
