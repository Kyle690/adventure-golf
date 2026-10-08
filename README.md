# Adventure Golf (Expo / React Native)

Native port of the Figma Make prototype "Adventure Golf Mobile App", with all data stored
locally in SQLite through Drizzle ORM. Works fully offline.

## Run

```bash
npm install            # also applies patches/ via patch-package
npm test               # handicap unit tests
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
  setup.tsx           New game: venue, course, per-hole par editor
  players.tsx         New game step 2, Who's playing: tap to select / add / remove players,
                      start the round (prototype behaviour)
  crew.tsx            Players tab: every player (owner first as "You") with games, calculated
                      handicap and best score; sort by name/handicap/games/best; owner-only
                      empty state; tapping a card opens the player screen
  player/[id].tsx     Player detail: calculated handicap, stats, edit (name, colour, photo,
                      starting handicap), recent
                      rounds, remove (non-owner, with confirmation)
  game/[id].tsx       Live scoring: hole carousel, steppers, scoreboard, round options
src/components/       Icon (prototype SVG paths), Logo, LeafDecoration, GolfBall, BottomNav,
                      RoundMenu (bottom sheet + quit confirm), PlayerAvatar, WideCta, Eyebrow, Text,
                      ParEditor (shared by Setup and onboarding), ConfirmDialog
  onboarding/         StepPage, StepDots, Form fields, Confetti, BouncingBall, steps/*
src/lib/handicap.ts   calculated handicap (pure functions) + handicap.test.ts (npm test)
src/lib/stats.ts      per-player stats (rounds, wins, best, avg/hole, holes-in-one, recent)
src/lib/images.ts     image picker -> copy into documentDirectory/images (data: URI on web)
src/db/
  schema.ts           Drizzle schema + relations
  client.ts           expo-sqlite + drizzle client (FKs on)
  provider.tsx        open -> useMigrations -> (dev-only demo seed) -> render
  demo-seed.ts        prototype demo data, only with EXPO_PUBLIC_DEMO_SEED=1 in __DEV__
  queries.ts          all reads/writes
  hooks.ts, events.ts useDbQuery: re-query on focus and after writes
drizzle/              generated SQL migrations (bundled via babel-plugin-inline-import)
patches/              expo-sqlite web fixes (see below)
scripts/              serve-web.mjs, screenshots.mjs (prototype vs app, needs a demo build),
                      onboarding-screenshots.mjs (fresh DB walkthrough + checks),
                      players-screenshots.mjs (player edit/delete on a demo build + checks)
screenshots/          prototype-*.png vs app-*.png, onboarding-*.png, players-*.png
```

## Database

Tables: `venues`, `courses`, `holes`, `players` (one `is_owner`, enforced by a partial unique
index; `avatar` = colour, optional `photo` URI), `games`, `game_players` (turn order), `scores` (unique per game/player/hole), `app_meta`.
All FKs cascade on delete (removing a player deletes their scores, and any game left with no
players). Change `src/db/schema.ts`, then `npm run db:generate`.

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
