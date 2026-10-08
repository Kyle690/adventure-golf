// Venues tab, venue detail (courses + games), course edit, score sheet and the finish-round
// confirmation, on a demo-data web build:
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// plus the empty Venues state on a fresh release build (node scripts/serve-web.mjs 8090).
// Saves screenshots/venues-*.png and game-finish-confirm.png. Needs playwright + Chrome.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/screenshots`;
const URL = process.env.APP_URL ?? 'http://127.0.0.1:8091/';
const FRESH_URL = process.env.FRESH_URL ?? 'http://127.0.0.1:8090/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1150 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
let failures = 0;
const check = (ok, msg) => { log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };
page.on('pageerror', (e) => log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text()); });
const settle = (ms = 800) => page.waitForTimeout(ms);
const shot = async (name, ms) => { await settle(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };
const scrollTo = (text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent === t);
    el?.scrollIntoView({ block: 'start' });
  }, text);
const visible = (text) => page.getByText(text, { exact: true }).last().isVisible();

// Home -> Venues tab.
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await settle(2500);
await page.getByRole('button', { name: 'Venues', exact: true }).last().click();
await page.waitForURL(/\/venues$/);
await settle(1000);
check(await visible('Sandton'), 'venues tab lists the demo venue');
check(await visible('COURSES'), 'venue card shows course count');

// Add a second venue through the new-venue form (no courses, never played).
await page.getByText('Add a venue', { exact: true }).last().click();
await page.waitForURL(/\/venue\/new$/);
await page.getByLabel('VENUE NAME').fill('Putt Putt Palace');
await page.getByLabel('ADDRESS').fill('Rosebank, Johannesburg');
await page.getByText('Save venue', { exact: true }).click();
await page.waitForURL(/\/venues$/);
await settle(800);
check(await visible('Putt Putt Palace'), 'new venue appears in the list');
await page.getByLabel('Sort by Most played').click();
await shot('venues-01-tab', 800);
const order = await page.evaluate(() => {
  const t = document.body.innerText;
  return t.indexOf('Sandton') < t.indexOf('Putt Putt Palace');
});
check(order, 'most played sort puts Sandton first');

// Venue detail: courses, then games (live first since it's newest).
await page.getByLabel('Sandton, open venue').click();
await page.waitForURL(/\/venue\/\d+$/);
await shot('venues-02-detail', 1200);
check(await visible('Courses'), 'detail shows Courses section');
check(await visible('Games played here'), 'detail shows games section');
check(await page.getByText(/^LIVE · HOLE 5 OF 9$/).isVisible(), 'live game shows LIVE · HOLE 5 OF 9 badge');
const liveFirst = await page.evaluate(() => {
  const t = document.body.innerText;
  return t.indexOf('LIVE · HOLE') < t.indexOf('FINISHED');
});
check(liveFirst, 'games are newest first (live round above finished one)');
await scrollTo('Games played here');
await shot('venues-06-live-indicator', 600);

// Finished game -> read-only score sheet.
await page.getByLabel('The Tropical Trail, finished round, open scorecard').click();
await page.waitForURL(/\/scorecard\/\d+$/);
await shot('venues-05-scoresheet', 1200);
check(await visible('You win!'), 'score sheet headline names the winner');
check(await visible('FINAL SCORECARD'), 'score sheet is in final mode');
check((await page.getByRole('button', { name: /Increase/ }).count()) === 0, 'score sheet has no score controls');
await page.getByLabel('Back', { exact: true }).last().click();
await page.waitForURL(/\/venue\/\d+$/);
await settle(800);

// Course card -> edit screen.
await page.getByLabel('Edit The Tropical Trail').click();
await page.waitForURL(/\/course\/\d+$/);
await shot('venues-04-course-edit', 1200);
check((await page.getByLabel('COURSE NAME').inputValue()) === 'The Tropical Trail', 'edit form is prefilled');
check(await page.getByText(/keep the holes and pars they were played with/).isVisible(), 'edit screen explains past games keep their layout');
// Edit: rename, 9 -> 8 holes, hole 1 par 3 -> 4 (course par 29 -> 26).
await page.getByLabel('Fewer holes').click();
await page.getByLabel('Increase hole 1 par').click();
await page.getByLabel('COURSE NAME').fill('The Tropical Trail Classic');
await page.getByText('Save course', { exact: true }).click();
await page.waitForURL(/\/venue\/\d+$/);
await settle(1000);
check(await visible('The Tropical Trail Classic'), 'saved course name shows on venue detail');
check(await visible('8 HOLE COURSE'), 'saved hole count shows on venue detail');
check((await page.getByText('2 games', { exact: true }).count()) > 0, 'games survive editing the course');
// Past game is unchanged: snapshot name, 9 holes, par 29, totals 24/31/32.
await page.getByLabel('The Tropical Trail, finished round, open scorecard').click();
await page.waitForURL(/\/scorecard\/\d+$/);
await settle(1000);
const sheet = await page.evaluate(() => document.body.innerText);
check(/9 holes · PAR 29/.test(sheet) && /TOTAL\s+29\s+24\s+31\s+32/.test(sheet), 'completed game keeps its 9-hole par-29 layout and totals after the edit');
await page.getByLabel('Back', { exact: true }).last().click();
await page.waitForURL(/\/venue\/\d+$/);
await settle(800);

// Live game -> continue, score the remaining holes, Finish round -> confirmation sheet.
// Add a course from the venue detail (shared course form in create mode).
await page.getByLabel('Add a course', { exact: true }).last().click();
await page.waitForURL(/\/course\/new\?venueId=\d+/);
await settle(800);
check(await visible('NEW COURSE · SANDTON'), 'create form is for the venue');
await page.getByLabel('COURSE NAME').fill('Jungle Run');
for (let i = 0; i < 3; i++) await page.getByLabel('Fewer holes').click();
await page.getByLabel('Increase hole 1 par').click();
await page.getByLabel('Decrease hole 5 par').click();
check(await visible('Par 18'), 'create form totals par for 6 holes');
await shot('venues-07-add-course', 600);
await page.getByText('Create course', { exact: true }).click();
await page.waitForURL(/\/venue\/\d+$/);
await settle(1200);
check(await visible('Jungle Run'), 'new course appears on the venue detail');
check(await visible('6 HOLE COURSE'), 'new course shows its hole count');
check(await visible('2 courses'), 'courses section counts the new course');
check(await page.getByText(/2 courses · 14 holes/).isVisible(), 'venue header totals courses and holes');
await scrollTo('Courses');
await shot('venues-08-course-added', 600);
await page.evaluate(() => window.scrollTo(0, 0));

// The live round was started before the edit, so it keeps its 9-hole snapshot too.
await page.getByLabel('The Tropical Trail, live round, continue').click();
await page.waitForURL(/\/game\/\d+$/);
await settle(1500);
for (let hole = 5; hole <= 9; hole++) {
  for (const [name, taps] of [['You', 2], ['Alex', 3], ['Jordan', 3]]) {
    for (let i = 0; i < taps; i++) await page.getByLabel(`Increase ${name} score on hole ${hole}`).click();
  }
}
await page.getByText('Finish round', { exact: true }).click();
await settle(600);
check(await page.getByText('Confirm result', { exact: true }).isVisible(), 'finish opens the result confirmation');
check(page.url().match(/\/game\/\d+$/) !== null, 'game is not completed before confirming');
await shot('game-finish-confirm', 600);
check(await visible('You win!'), 'confirmation shows the winner');

await page.getByText('Confirm result', { exact: true }).click();
await page.waitForURL((u) => new globalThis.URL(u).pathname === '/');
await settle(1500);
check(!(await page.getByText('Resume game').isVisible()), 'home no longer shows a live round');
check(await page.getByText('The Tropical Trail').first().isVisible(), 'home last-game card shows the finished course');
check(await page.getByText(/^22$/).first().isVisible(), 'home last-game best is the new round (22)');
await shot('game-finish-home', 600);
await page.goBack();
await settle(1200);
check(!/\/game\//.test(page.url()), `back does not return to the finished game (url ${page.url()})`);
await page.goto(URL, { waitUntil: 'networkidle' });
await settle(2000);
await page.getByLabel(/^Last game: .* Open scorecard$/).click();
await page.waitForURL(/\/scorecard\/\d+$/);
await settle(800);
check(await visible('FINAL SCORECARD'), 'last-game card opens the score sheet');

// New game: "Create a new course" uses the same create flow and selects the new course.
await page.goto(URL, { waitUntil: 'networkidle' });
await settle(2000);
await page.getByText('Start a new game', { exact: true }).click();
await page.waitForURL(/\/setup$/);
await settle(800);
await page.getByText('Create a new course', { exact: true }).click();
await page.waitForURL(/\/course\/new\?venueId=\d+&select=1/);
await settle(600);
await page.getByLabel('COURSE NAME').fill('Pirate Cove');
await page.getByText('Create course', { exact: true }).click();
await page.waitForURL(/\/setup$/);
await settle(1000);
check(await visible('Pirate Cove'), 'setup lists the course created from New game');
await page.getByText('Choose players', { exact: true }).click();
await page.waitForURL(/\/players$/);
await settle(800);
await page.getByText('Start the round', { exact: true }).click();
await page.waitForURL(/\/game\/\d+$/);
await settle(1200);
check(await page.getByText('Pirate Cove', { exact: true }).last().isVisible(), 'new course is selected: the round starts on Pirate Cove');

// Fresh install, Venues tab -> empty state.
await page.goto(FRESH_URL + 'venues', { waitUntil: 'networkidle' });
await settle(2500);
check(await visible('No venues yet'), 'fresh DB shows the venues empty state');
check(await page.getByText('Add venue', { exact: true }).isVisible(), 'empty state has Add venue action');
await shot('venues-03-empty', 500);

await browser.close();
log(failures ? `${failures} FAILURES` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
