// Walks the first-run onboarding on the Expo web export (node scripts/serve-web.mjs 8090) from a
// fresh browser profile (= empty SQLite DB) and saves screenshots/onboarding-*.png.
// Needs playwright + Chrome: run from a folder where playwright is installed.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/screenshots`;
const FIX = `${ROOT}/scripts/fixtures`;
const URL = process.env.APP_URL ?? 'http://127.0.0.1:8090/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);
let failures = 0;
const check = (ok, msg) => { log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 1150 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text()); });

const settle = (ms = 800) => page.waitForTimeout(ms);
const shot = async (name, ms) => { await settle(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };
const currentStep = () =>
  page.evaluate(() => {
    const els = [...document.querySelectorAll('div')].filter((d) => /^STEP \d OF 4/.test(d.textContent ?? '') && d.children.length === 0);
    const vw = window.innerWidth;
    const onScreen = els.find((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < vw && r.width > 0; });
    return onScreen ? Number(onScreen.textContent.match(/STEP (\d)/)[1]) : null;
  });
const drag = async (dx) => {
  await page.mouse.move(250, 700);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(250 + (dx * i) / 12, 702);
  await page.mouse.up();
  await settle(900);
};
const pickPhoto = async (label, file) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByLabel(label, { exact: true }).click();
  await (await chooser).setFiles(file);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForURL(/onboarding/);
check(page.url().includes('/onboarding'), 'fresh DB redirects Home -> /onboarding');

// Step 1: owner
await shot('onboarding-01-owner');
check(await page.getByRole('button', { name: 'Continue' }).isDisabled(), 'Continue disabled until a name is entered');
await drag(-250);
check((await currentStep()) === 1, 'cannot swipe ahead past unsaved step 1');
await page.getByLabel('YOUR NAME').fill('Kyle Winter');
await page.getByLabel('Colour #4b87d5').first().click();
await page.getByLabel('HANDICAP').fill('12');
await shot('onboarding-01b-owner-filled');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(140);
await page.screenshot({ path: `${OUT}/onboarding-01c-slide-transition.png` }); // mid-slide frame
log('saved', 'onboarding-01c-slide-transition');

// Step 2: venue
await shot('onboarding-02-venue');
check((await currentStep()) === 2, 'Continue saved owner and advanced to step 2');
await drag(-250);
check((await currentStep()) === 2, 'cannot swipe ahead past unsaved step 2');
await page.getByLabel('VENUE NAME').fill('Sandton');
await page.getByLabel('ADDRESS').fill('Johannesburg, Gauteng');
await pickPhoto('Venue photo', `${FIX}/venue.jpg`);
await shot('onboarding-02b-venue-filled');
await page.getByRole('button', { name: 'Save venue' }).click();

// Step 3: course
await shot('onboarding-03-course');
check((await currentStep()) === 3, 'Save venue advanced to step 3');
// Back (button) shows the saved venue, then swipe forward again (allowed up to the current step).
await page.getByLabel('Previous step').nth(1).click(); // the button on step 3's header
await shot('onboarding-03a-back-to-venue');
check((await currentStep()) === 2, 'back button returns to step 2');
await drag(-250);
check((await currentStep()) === 3, 'swiping forward to the reached step works');
await drag(-250);
check((await currentStep()) === 3, 'cannot swipe ahead past unsaved step 3');

await page.getByLabel('COURSE NAME').fill('The Tropical Trail');
const pars = [3, 3, 4, 3, 2, 4, 3, 3, 4];
for (let i = 0; i < pars.length; i++) {
  const diff = pars[i] - 3;
  for (let k = 0; k < Math.abs(diff); k++) await page.getByLabel(`${diff > 0 ? 'Increase' : 'Decrease'} hole ${i + 1} par`).click();
}
await pickPhoto('Course photo', `${FIX}/course.jpg`);
await shot('onboarding-03b-course-filled');
await page.getByText('Hole details', { exact: true }).first().click();
await page.getByLabel('Hole 1 length in metres').fill('8');
await page.getByLabel('Hole 1 Easy').click();
await page.getByLabel('Hole 5 length in metres').fill('14');
await page.getByLabel('Hole 5 Hard').click();
await page.getByLabel('Hole 9 Medium').click();
await page.evaluate(() => document.querySelector('[aria-label="Hole 1 length in metres"]')?.scrollIntoView({ block: 'center' }));
await shot('onboarding-03c-hole-details');
await page.getByRole('button', { name: 'Save course' }).click();

// Step 4: crew
await shot('onboarding-04-crew');
check((await currentStep()) === 4, 'Save course advanced to step 4');
await page.getByLabel('Player name').fill('Alex');
await page.getByLabel('Add player').click();
await page.getByLabel('Player name').fill('Jordan');
await page.getByLabel('Add player').click();
await page.getByLabel('Player name').fill('Sam');
await page.getByLabel('Add player').click();
await page.getByLabel('Remove Sam').click();
await shot('onboarding-04b-crew-added');
await page.getByRole('button', { name: 'Create', exact: true }).click();

// Complete
await page.waitForURL(/onboarding\/complete/);
await shot('onboarding-05-complete', 2030);
check(await page.getByText("You're all set,").isVisible(), 'complete screen congratulates by name');
check(await page.getByText('Kyle!').isVisible(), 'uses first name');
check(await page.getByText('YOUR VENUE').isVisible() && await page.getByText('Johannesburg, Gauteng').isVisible(), 'complete card shows venue + address');
check(
  (await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.startsWith('data:image/') && i.getBoundingClientRect().width > 0).length)) >= 2,
  'complete card shows the venue photo and course photo',
);
check(await page.getByText('The Tropical Trail').isVisible() && await page.getByText('TOTAL PAR').isVisible(), 'complete card shows course, holes and par');
check(await page.getByText('3 PLAYERS').isVisible(), 'complete card shows player count');
check((await page.getByText(/first round|ROUND READY/i).count()) === 0, 'no first-round copy');
await page.getByRole('button', { name: 'Go to Home' }).click();

// Home
await page.waitForURL((u) => new globalThis.URL(u).pathname === '/');
await shot('onboarding-06-home', 1200);
check(await page.getByText('KW', { exact: true }).last().isVisible(), 'home initials from owner name');
check((await page.getByText('ROUND IN PROGRESS').count()) === 0, 'onboarding created no game: no round in progress on Home');
check(await page.getByText('No finished rounds yet').last().isVisible(), 'home last-game empty state');

// Reload: onboarding must not come back.
await page.reload({ waitUntil: 'networkidle' });
await settle(1500);
check(!page.url().includes('onboarding'), 'reload stays on Home after onboarding');
await page.goto(URL + 'game/new', { waitUntil: 'networkidle' });
await shot('onboarding-08-setup-with-photos', 1200);
await ctx.close();

// Resume: a profile that stopped after step 2 reopens on step 3.
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 1150 }, deviceScaleFactor: 2 });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'networkidle' });
await p2.waitForURL(/onboarding/);
await p2.getByLabel('YOUR NAME').fill('Robin');
await p2.getByRole('button', { name: 'Continue' }).click();
await p2.waitForTimeout(700);
await p2.getByLabel('VENUE NAME').fill('Seaside Putt');
await p2.getByRole('button', { name: 'Save venue' }).click();
await p2.waitForTimeout(700);
await p2.reload({ waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
const resumed = await p2.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter((d) => /^STEP \d OF 4/.test(d.textContent ?? '') && d.children.length === 0);
  const on = els.find((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < innerWidth; });
  return on?.textContent;
});
check(p2.url().includes('onboarding') && resumed?.startsWith('STEP 3'), `relaunch mid-onboarding resumes on step 3 (${resumed})`);
await ctx2.close();

await browser.close();
log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
