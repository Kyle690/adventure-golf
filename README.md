# Adventure Golf (Expo / React Native)

Native port of the Figma Make prototype "Adventure Golf Mobile App", with all data stored
locally in SQLite through Drizzle ORM. Works fully offline.

## Run

```bash
npm install            # also applies patches/ via patch-package
npx expo start         # press i / a for a simulator, or scan with Expo Go / a dev build
```

Web: `npm run export:web && npm run serve:web` then open http://localhost:8090.
expo-sqlite's web build needs `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers
on the HTML page; `scripts/serve-web.mjs` adds them. (`expo start --web` currently only adds them
to the JS bundles, not the HTML page, so the database can't open in the web dev server.)

## Structure

```
src/app/              Expo Router screens
  _layout.tsx         fonts, providers, stack
  index.tsx           Home (live round, start CTA, clubhouse, last game)
  setup.tsx           New game: venue, course, per-hole par editor
  players.tsx         Who's playing: select / add / remove players, start the round
  game/[id].tsx       Live scoring: hole carousel, steppers, scoreboard, round options
src/components/       Icon (prototype SVG paths), Logo, LeafDecoration, GolfBall, BottomNav,
                      RoundMenu (bottom sheet + quit confirm), PlayerAvatar, WideCta, Eyebrow, Text
src/db/
  schema.ts           Drizzle schema + relations
  client.ts           expo-sqlite + drizzle client (FKs on)
  provider.tsx        open -> useMigrations -> first-run seed -> render
  seed.ts             prototype data
  queries.ts          all reads/writes
  hooks.ts, events.ts useDbQuery: re-query on focus and after writes
drizzle/              generated SQL migrations (bundled via babel-plugin-inline-import)
patches/              expo-sqlite web fixes (see below)
screenshots/          prototype-*.png vs app-*.png
```

## Database

Tables: `venues`, `courses`, `holes`, `players` (one `is_owner`, enforced by a partial unique
index), `games`, `game_players` (turn order), `scores` (unique per game/player/hole), `app_meta`.
All FKs cascade on delete. Change `src/db/schema.ts`, then `npm run db:generate`.

## expo-sqlite web patch

`patches/expo-sqlite+57.0.4.patch` fixes two bugs in expo-sqlite 57.0.4's web worker channel:
the result length was written with `Uint8Array.set(Uint32Array)` (truncating it to one byte, so
any result over 255 bytes failed to parse), and the sync-call timeout was a 1M-iteration
`Atomics.pause()` spin (a few ms), which timed out ordinary writes. iOS/Android are unaffected.
