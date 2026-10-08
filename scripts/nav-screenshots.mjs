// Navigation structure check on a demo-data web build:
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// Walks the tabs (Home, Venues, Players, History), the game stack (select venue & course, pick
// players, game, game complete confirm/review), Play-from-venue, exits/resets and deep links.
// Saves screenshots/nav-*.png. Needs playwright + Chrome.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/screenshots`;
const URL = process.env.APP_URL ?? 'http://127.0.0.1:8091/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1150 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
let failures = 0;
const check = (ok, msg) => { log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };
page.on('pageerror', (e) => log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('WebSocket')) log('CONSOLE', m.text()); });
const settle = (ms = 800) => page.waitForTimeout(ms);
const shot = async (name, ms) => { await settle(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };
const visible = (text) => page.getByText(text, { exact: true }).last().isVisible();
const pathname = () => new globalThis.URL(page.url()).pathname;
const at = (re) => page.waitForURL((u) => re.test(new globalThis.URL(u).pathname), { timeout: 10000 });
const tab = (name) => page.getByRole('tab', { name, exact: true });
/** Visible tab bar buttons and which one is selected. */
const tabBar = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.checkVisibility())
      .map((el) => ({ label: el.getAttribute('aria-label'), selected: el.getAttribute('aria-selected') === 'true' })),
  );
const selectedTab = async () => (await tabBar()).find((t) => t.selected)?.label;
const back = () => page.getByLabel(/^Back/).last().click();

// --- Tabs ---
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await settle(2500);
let bar = await tabBar();
check(bar.map((t) => t.label).join(',') === 'Home,Venues,Players,History', `tab bar has Home, Venues, Players, History (${bar.map((t) => t.label)})`);
check((await selectedTab()) === 'Home', 'Home tab is selected on launch');
await shot('nav-01-home', 600);

await tab('Venues').click();
await at(/^\/venues$/);
check((await selectedTab()) === 'Venues', 'Venues tab selected');
check(await visible('Your venues'), 'Venues tab shows the venues list');
await shot('nav-02-venues', 800);

await tab('Players').click();
await at(/^\/players$/);
check((await selectedTab()) === 'Players', 'Players tab selected');
check(await visible('Alex'), 'Players tab lists the crew');
check(await page.getByLabel('Player name').last().isVisible(), 'Players tab can add a player inline');
await shot('nav-03-players', 800);

await tab('History').click();
await at(/^\/history$/);
check((await selectedTab()) === 'History', 'History tab selected');
check(await visible('Game history'), 'History screen title');
check(await page.getByText('The Tropical Trail', { exact: true }).last().isVisible(), 'history lists the finished demo round (course snapshot name)');
check(await page.getByText(/^Sandton · 9 holes$/).last().isVisible(), 'history card shows the venue snapshot name');
check(await page.getByText(/^You win · 24 \([−-]5\)$/).last().isVisible(), 'history card shows the winner and score');
await shot('nav-04-history', 800);

// Tab stacks keep their place; re-pressing the focused tab pops to its list.
await tab('Players').click();
await at(/^\/players$/);
await page.getByLabel(/^Alex/).last().click();
await at(/^\/players\/\d+$/);
check((await selectedTab()) === 'Players', 'player detail keeps the tab bar (Players selected)');
await tab('Venues').click();
await at(/^\/venues$/);
await tab('Players').click();
await at(/^\/players\/\d+$/);
check(true, 'switching back to Players returns to the open player detail');
await tab('Players').click();
await at(/^\/players$/);
check(true, 're-pressing the Players tab pops back to the crew list');

// A second venue with a course, so the picker has a choice.
await tab('Venues').click();
await at(/^\/venues$/);
await page.getByText('Add a venue', { exact: true }).last().click();
await at(/^\/venues\/new$/);
check((await selectedTab()) === 'Venues', 'new venue form is inside the Venues tab');
await page.getByLabel('VENUE NAME').fill('Putt Putt Palace');
await page.getByLabel('ADDRESS').fill('Rosebank, Johannesburg');
await page.getByText('Save venue', { exact: true }).click();
await at(/^\/venues\/\d+$/);
await settle(800);
check(await visible('Putt Putt Palace'), 'saving a venue opens its detail page');
await page.getByLabel('Add a course', { exact: true }).last().click();
await at(/^\/venues\/\d+\/courses\/new$/);
await page.getByLabel('COURSE NAME').fill('Jungle Run');
await page.getByText('Create course', { exact: true }).click();
await at(/^\/venues\/\d+$/);
await settle(800);
check(await visible('Jungle Run'), 'course created from the venue page');
await page.getByLabel('Back to venues').last().click();
await at(/^\/venues$/);
check(await visible('Putt Putt Palace'), 'back from a new venue goes to the venues list (form is gone)');

// --- Game stack: Home "Start a new game" -> select venue & course -> players -> game ---
await tab('Home').click();
await at(/^\/$/);
await page.getByText('Start a new game', { exact: true }).last().click();
await at(/^\/game\/new$/);
await settle(800);
check((await tabBar()).length === 0, 'game stack has no tab bar');
check(await visible('Choose your course'), 'select venue & course screen');
check((await page.getByText(/Create a new course/).count()) === 0, 'no create-course entry in the picker');
check((await page.getByLabel(/hole \d+ par/).count()) === 0, 'no par editor in the picker');
check((await page.getByLabel(/^Edit /).count()) === 0, 'no edit actions in the picker');
check((await page.getByLabel('Course The Tropical Trail').count()) === 0, 'no courses until a venue is chosen (2 venues)');
await page.getByLabel('Venue Putt Putt Palace').click();
await settle(400);
check(await page.getByLabel('Course Jungle Run').isVisible(), 'choosing a venue loads its courses');
check((await page.getByLabel('Course The Tropical Trail').count()) === 0, 'other venues\' courses are not listed');
await page.getByLabel('Venue Sandton').click();
await settle(400);
const chooseDisabled = await page.getByRole('button', { name: 'Choose players' }).last().isDisabled().catch(() => null);
check(chooseDisabled === true, 'Choose players is disabled until a course is picked');
await page.getByLabel('Course The Tropical Trail').click();
await settle(300);
check((await page.getByRole('button', { name: 'Choose players' }).last().isDisabled()) === false, 'picking a course enables Choose players');
await shot('nav-05-game-select', 600);
await page.getByText('Choose players', { exact: true }).last().click();
await page.waitForURL(/\/game\/players\?courseId=\d+/);
await settle(800);
check((await tabBar()).length === 0, 'player picker has no tab bar');
check((await page.getByLabel(/^Remove /).count()) === 0, 'player picker has no delete');
check(await page.getByText(/The Tropical Trail · Sandton/).last().isVisible(), 'picker shows the chosen course and venue');
await page.getByLabel('Player name').last().fill('Sam');
await page.getByLabel('Add player').last().click();
await settle(600);
check((await page.getByRole('checkbox', { name: 'Sam' }).last().getAttribute('aria-checked')) === 'true', 'a newly added player is selected');
await shot('nav-06-players-pick', 600);
await back();
await at(/^\/game\/new$/);
check(await page.getByLabel('Course The Tropical Trail').getAttribute('aria-checked') === 'true', 'back to the picker keeps the chosen course');
await page.getByText('Choose players', { exact: true }).last().click();
await page.waitForURL(/\/game\/players\?courseId=\d+/);
await settle(600);
await page.getByRole('checkbox', { name: 'Sam' }).last().click(); // deselect: You, Alex, Jordan
await page.getByText('Start the round', { exact: true }).last().click();
await at(/^\/game\/\d+$/);
await settle(1200);
const newGameId = pathname().split('/')[2];
check(await page.getByText('The Tropical Trail', { exact: true }).last().isVisible(), 'round starts on the chosen course');
await page.getByLabel('Leave game').last().click();
await at(/^\/$/);
await settle(800);
check((await selectedTab()) === 'Home', 'Leave game exits the whole game stack back to Home');
await page.goBack();
await settle(800);
check(!/^\/game\/(new|players)/.test(pathname()), `browser back does not reopen the picker (${pathname()})`);

// Resume live game -> game screen -> Finish round -> game complete (confirm).
await page.goto(URL, { waitUntil: 'networkidle' });
await settle(2000);
await page.getByText('Resume game', { exact: true }).last().click();
await at(new RegExp(`^/game/${newGameId}$`));
check(true, 'Resume game opens the live game screen');
await settle(1000);
for (let hole = 1; hole <= 9; hole++) {
  for (const [name, taps] of [['You', 1], ['Alex', 2], ['Jordan', 3]]) {
    for (let i = 0; i < taps; i++) await page.getByLabel(`Increase ${name} score on hole ${hole}`).click();
  }
}
await page.getByText('Finish round', { exact: true }).last().click();
await at(/^\/game\/\d+\/complete$/);
await settle(1000);
check(await visible('CONFIRM RESULT'), 'finishing opens the game complete screen in confirm mode');
check(await visible('Confirm result'), 'confirm mode has Confirm result');
check(await visible('Score sheet'), 'game complete includes the score sheet');
check(await visible('You win!'), 'game complete names the winner');
await shot('nav-07-game-complete-confirm', 600);
await page.getByText('Keep editing scores', { exact: true }).last().click();
await at(/^\/game\/\d+$/);
check(true, 'Keep editing scores returns to the game screen');
await settle(600);
await page.getByText('Finish round', { exact: true }).last().click();
await at(/^\/game\/\d+\/complete$/);
await settle(800);
await page.getByText('Confirm result', { exact: true }).last().click();
await page.getByText('ROUND COMPLETE', { exact: true }).last().waitFor();
check(/^\/game\/\d+\/complete$/.test(pathname()), 'Confirm result plays the celebration before leaving');
await page.getByText('Back to Home', { exact: true }).last().click();
await at(/^\/$/);
await settle(1200);
check((await selectedTab()) === 'Home', 'Confirm result resets to the Home tab');
check(!(await page.getByText('Resume game').last().isVisible()), 'no live round after confirming');
await page.goBack();
await settle(1000);
check(!/^\/game\//.test(pathname()), `back after confirming does not return to the game (${pathname()})`);

// --- History -> game complete (review) ---
await page.goto(URL + 'history', { waitUntil: 'networkidle' });
await settle(2000);
const cards = await page.getByLabel(/, open result$/).count();
check(cards === 2, `history lists both finished rounds (${cards})`);
const firstCard = await page.getByLabel(/, open result$/).first().getAttribute('aria-label');
check(firstCard === 'The Tropical Trail at Sandton, open result', 'newest round first');
check(await page.evaluate(() => /YOU\s+9\s+[−-]20/.test(document.body.innerText)), 'owner total vs par shown on the new round (9, -20)');
await page.getByLabel(/, open result$/).last().click();
await at(/^\/game\/\d+\/complete$/);
await settle(1000);
check(await visible('FINAL SCORECARD'), 'history opens the game complete screen in review mode');
check((await page.getByText('Confirm result', { exact: true }).count()) === 0, 'review mode is read-only (no Confirm result)');
check((await page.getByLabel(/^Increase /).count()) === 0, 'review mode has no score controls');
check((await tabBar()).length === 0, 'game complete has no tab bar');
await shot('nav-08-game-complete-review', 600);
await back();
await at(/^\/history$/);
check(true, 'back from review returns to History');

// --- Venue detail "Play" -> game stack at select players (venue + course preset) ---
await tab('Venues').click();
await at(/^\/venues$/);
await page.getByLabel('Sandton, open venue').last().click();
await at(/^\/venues\/\d+$/);
const venuePath = pathname();
await page.getByLabel('Play The Tropical Trail').last().click();
await page.waitForURL(/\/game\/players\?courseId=\d+/);
await settle(800);
check(await visible("Who's playing?"), 'Play opens the player picker directly');
check(await page.getByText(/The Tropical Trail · Sandton/).last().isVisible(), 'venue and course are preset');
check((await tabBar()).length === 0, 'play-from-venue picker has no tab bar');
await shot('nav-09-play-from-venue', 600);
await back();
await page.waitForURL((u) => new globalThis.URL(u).pathname === venuePath);
check((await selectedTab()) === 'Venues', 'back from Play returns to the venue detail (Venues tab)');

// Venue detail and player detail -> past game opens review.
await page.getByLabel('The Tropical Trail, finished round, open result').first().click();
await at(/^\/game\/\d+\/complete$/);
await settle(600);
check(await visible('FINAL SCORECARD'), 'venue game card opens review');
await back();
await page.waitForURL((u) => new globalThis.URL(u).pathname === venuePath);

await page.goto(URL, { waitUntil: 'networkidle' });
await settle(2000);
await page.getByLabel(/^Last game: .* Open result$/).last().click();
await at(/^\/game\/\d+\/complete$/);
await settle(600);
check(await visible('FINAL SCORECARD'), 'Home last-game opens review');
await back();
await at(/^\/$/);

// --- Deep links: each lands with a sensible screen underneath ---
for (const [link, expectBack] of [
  ['venues/1', /^\/venues$/],
  ['venues/1/courses/1', /^\/venues\/1$/],
  ['players/2', /^\/players$/],
  ['game/1/complete', /^\/history$|^\/$/],
]) {
  await page.goto(URL + link, { waitUntil: 'networkidle' });
  await settle(1800);
  check(pathname() === `/${link}`, `deep link /${link} opens`);
  await back();
  await settle(800);
  check(expectBack.test(pathname()), `back from deep link /${link} -> ${pathname()}`);
}
await page.goto(URL + 'game/new', { waitUntil: 'networkidle' });
await settle(1800);
await back();
await settle(800);
check(pathname() === '/', `back from deep link /game/new -> ${pathname()}`);
await page.goto(URL + 'game/players', { waitUntil: 'networkidle' });
await settle(1800);
check(await visible('Pick a venue and course first.'), 'picker without a course asks for one');

await browser.close();
log(failures ? `${failures} FAILURES` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
