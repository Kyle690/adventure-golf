// Players tab (crew list), player detail / edit walkthrough on a demo-data web build:
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// plus the owner-only empty state on a fresh release build (node scripts/serve-web.mjs 8090).
// Saves screenshots/players-*.png. Needs playwright + Chrome (run where playwright is installed).
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
const scrollTo = (selectorText) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent === t);
    el?.scrollIntoView({ block: 'start' });
  }, selectorText);

// Game-setup picker keeps the prototype behaviour: tapping a row toggles selection.
await page.goto(URL + 'players', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await settle(2500);
const alexRow = page.getByRole('checkbox').filter({ hasText: 'Alex' }).last();
const selectedCount = () => page.getByText(/ SELECTED$/).last().textContent();
const before = await selectedCount();
await alexRow.click();
await settle(300);
check(before === '3 SELECTED' && (await selectedCount()) === '2 SELECTED', 'picker: tapping a row toggles selection (no navigation)');
check(page.url().endsWith('/players'), 'picker: stays on the picker');
await alexRow.click();
await shot('players-01-list');

// Players tab -> crew list.
await page.goto(URL, { waitUntil: 'networkidle' });
await settle(2000);
await page.getByRole('button', { name: 'Players', exact: true }).last().click();
await page.waitForURL(/\/crew$/);
await shot('players-10-tab', 1000);
check(await page.getByText('HANDICAP').first().isVisible(), 'crew cards show handicap');
await page.getByLabel('Sort by Best').click();
await shot('players-10b-tab-sorted-best', 500);
await page.getByLabel('Sort by Name').click();

// Owner detail with the calculated handicap.
await page.getByLabel('You, open player details').last().click();
await page.waitForURL(/\/player\//);
await shot('players-12-detail-handicap');
check(await page.getByText('HANDICAP · CALCULATED').isVisible(), 'detail shows calculated handicap');
await page.getByLabel('Back to players').click();
await page.waitForURL(/\/crew$/);

// Alex: detail with stats, then edit.
await page.getByLabel('Alex, open player details').last().click();
await page.waitForURL(/\/player\//);
await shot('players-02-detail');
check(await page.getByText('BEST ROUND').isVisible(), 'detail shows stats');

const save = page.getByRole('button', { name: /Save changes|No changes/ });
check(await save.isDisabled(), 'save disabled until something changes');
await page.getByLabel('NAME', { exact: true }).fill('');
check(await page.getByText('A name is required.').isVisible(), 'empty name shows required message');
await page.getByLabel('NAME', { exact: true }).fill('Alex Morgan');
await page.getByLabel('Colour #b067ce').click();
await page.getByLabel('STARTING HANDICAP').fill('18');
const chooser = page.waitForEvent('filechooser');
await page.getByLabel('Add photo').click();
await (await chooser).setFiles(`${ROOT}/scripts/fixtures/avatar.jpg`);
await shot('players-03-edit');
await scrollTo('Recent rounds');
await shot('players-04-recent-rounds');
await page.getByRole('button', { name: 'Save changes' }).click();

await page.waitForURL(/\/crew$/);
await shot('players-05-list-updated', 1200);
check(await page.getByText('Alex Morgan').last().isVisible(), 'list shows the edited name');

// Owner: editable, cannot be deleted.
await page.getByLabel('You, open player details').last().click();
await page.waitForURL(/\/player\//);
check((await page.getByText('Remove player').count()) === 0, 'owner has no remove action');
await page.getByLabel('NAME', { exact: true }).fill('Kyle Winter');
await page.getByLabel('STARTING HANDICAP').fill('12');
await scrollTo('Recent rounds');
await shot('players-06-owner-edit');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForURL(/\/crew$/);
await settle();
check(await page.getByText('Scorekeeper · Kyle Winter').last().isVisible(), 'owner rename saved');

// Jordan: delete with confirmation.
await page.getByLabel('Jordan, open player details').last().click();
await page.waitForURL(/\/player\//);
await page.getByText('Remove player', { exact: true }).click();
await shot('players-07-delete-confirm', 600);
await page.getByText('Yes, remove player').click();
await page.waitForURL(/\/crew$/);
await shot('players-08-after-delete', 1000);
check((await page.getByText('Jordan', { exact: true }).count()) === 0, 'Jordan removed');

await page.goto(URL, { waitUntil: 'networkidle' });
await shot('players-09-home-after-edits', 2500);
check(await page.getByText('KW', { exact: true }).last().isVisible(), 'home initials follow owner rename');
check(await page.getByText('2 players').last().isVisible(), 'live round now has 2 players');

// Owner-only empty state on a fresh install (release build).
const fresh = await browser.newContext({ viewport: { width: 390, height: 1150 }, deviceScaleFactor: 2 });
const p2 = await fresh.newPage();
await p2.goto(FRESH_URL, { waitUntil: 'networkidle' });
await p2.waitForURL(/onboarding/);
await p2.getByLabel('YOUR NAME').fill('Kyle Winter');
await p2.getByRole('button', { name: 'Continue' }).click();
await p2.waitForTimeout(600);
await p2.getByLabel('VENUE NAME').fill('Sandton');
await p2.getByRole('button', { name: 'Save venue' }).click();
await p2.waitForTimeout(600);
await p2.getByLabel('COURSE NAME').fill('The Tropical Trail');
await p2.getByRole('button', { name: 'Save course' }).click();
await p2.waitForTimeout(600);
await p2.getByRole('button', { name: 'Create', exact: true }).click();
await p2.waitForURL(/complete/);
await p2.getByRole('button', { name: 'Go to Home' }).click();
await p2.waitForTimeout(1500);
await p2.getByText('Players', { exact: true }).filter({ visible: true }).first().click(); // Home "Players" shortcut
await p2.waitForURL(/\/crew$/);
await p2.waitForTimeout(1000);
await p2.screenshot({ path: `${OUT}/players-11-tab-empty.png` });
log('saved', 'players-11-tab-empty');
check(await p2.getByText("It's just you so far").isVisible(), 'owner-only empty state');
await fresh.close();

await browser.close();
log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
