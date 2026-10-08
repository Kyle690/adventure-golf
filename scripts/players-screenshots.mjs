// Player detail / edit walkthrough on a demo-data web build:
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// Saves screenshots/players-*.png. Needs playwright + Chrome (run where playwright is installed).
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
page.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text()); });
const settle = (ms = 800) => page.waitForTimeout(ms);
const shot = async (name, ms) => { await settle(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };
const scrollTo = (selectorText) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent === t);
    el?.scrollIntoView({ block: 'start' });
  }, selectorText);

await page.goto(URL + 'players', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await shot('players-01-list', 2500);

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
await page.getByLabel('HANDICAP').fill('18');
const chooser = page.waitForEvent('filechooser');
await page.getByLabel('Add photo').click();
await (await chooser).setFiles(`${ROOT}/scripts/fixtures/avatar.jpg`);
await shot('players-03-edit');
await scrollTo('Recent rounds');
await shot('players-04-recent-rounds');
await page.getByRole('button', { name: 'Save changes' }).click();

await page.waitForURL(/\/players$/);
await shot('players-05-list-updated', 1200);
check(await page.getByText('Alex Morgan').last().isVisible(), 'list shows the edited name');

// Owner: editable, cannot be deleted.
await page.getByLabel('You, open player details').last().click();
await page.waitForURL(/\/player\//);
check((await page.getByText('Remove player').count()) === 0, 'owner has no remove action');
await page.getByLabel('NAME', { exact: true }).fill('Kyle Winter');
await page.getByLabel('HANDICAP').fill('12');
await scrollTo('Recent rounds');
await shot('players-06-owner-edit');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForURL(/\/players$/);
await settle();
check(await page.getByText('Kyle Winter').last().isVisible(), 'owner rename saved');

// Jordan: delete with confirmation.
await page.getByLabel('Jordan, open player details').last().click();
await page.waitForURL(/\/player\//);
await page.getByText('Remove player', { exact: true }).click();
await shot('players-07-delete-confirm', 600);
await page.getByText('Yes, remove player').click();
await page.waitForURL(/\/players$/);
await shot('players-08-after-delete', 1000);
check((await page.getByText('Jordan', { exact: true }).count()) === 0, 'Jordan removed');

await page.goto(URL, { waitUntil: 'networkidle' });
await shot('players-09-home-after-edits', 2500);
check(await page.getByText('KW', { exact: true }).last().isVisible(), 'home initials follow owner rename');
check(await page.getByText('2 players').last().isVisible(), 'live round now has 2 players');

await browser.close();
log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
