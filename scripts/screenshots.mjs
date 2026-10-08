// Screenshot harness used to compare the Figma Make prototype (vite on :5174) with the Expo web
// demo export (node scripts/serve-web.mjs 8091 /tmp/demo-web). Needs playwright + Chrome: run it from a folder
// where playwright is installed, e.g. node scripts/screenshots.mjs [proto|app|both].
// The app flow expects the demo data: export with `EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev`.
import { chromium } from 'playwright';

const OUT = '/workspace/adventure-golf/screenshots';
const viewport = { width: 390, height: 1150 };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);

async function newPage() {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text()); });
  return page;
}
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const shot = async (page, name) => { await settle(page); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };

const which = process.argv[2] ?? 'both';

if (which !== 'app') {
  const p = await newPage();
  await p.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await shot(p, 'prototype-01-home');
  await p.getByText('Start a new game').click();
  await shot(p, 'prototype-02-setup');
  await p.getByText('The Tropical Trail').click();
  await shot(p, 'prototype-03-setup-par-editor');
  await p.getByText('Choose players').click();
  await shot(p, 'prototype-04-players');
  await p.getByText('Start the round').click();
  await shot(p, 'prototype-05-game');
  await p.getByLabel('Round options').click();
  await shot(p, 'prototype-06-round-options');
  await p.getByText('Quit round').click();
  await shot(p, 'prototype-07-quit-confirm');
  await p.context().close();
}

if (which !== 'proto') {
  const p = await newPage();
  await p.goto(process.env.APP_URL ?? 'http://localhost:8091/', { waitUntil: 'networkidle' });
  await p.getByText('ROUND IN PROGRESS').waitFor({ timeout: 60000 });
  await shot(p, 'app-01-home', 1200);

  // Resume the seeded live round: opens on hole 5 (first hole without scores).
  await p.getByText('Resume game').click();
  await p.getByText('Enter scores').first().waitFor();
  await shot(p, 'app-08-game-resumed', 1200);
  await p.getByLabel('Increase You score on hole 5').click();
  await p.getByLabel('Increase You score on hole 5').click();
  await settle(p, 400);
  await shot(p, 'app-08b-game-resumed-scored');
  await p.getByLabel('Leave game').click();
  await p.getByText('ROUND IN PROGRESS').waitFor();

  await p.getByText('Start a new game').last().click();
  await p.getByText('Choose your course').waitFor();
  // Pick-only (pars are edited from the venue page): the single venue is preselected, tap the course.
  await p.getByLabel('Course The Tropical Trail').click();
  await shot(p, 'app-02-setup');
  await p.getByText('Choose players').last().click();
  await p.getByText("Who's playing?").waitFor();
  await shot(p, 'app-04-players');
  await p.getByLabel('Player name').fill('Sam');
  await p.getByLabel('Add player').click();
  await p.getByText('4 / 6 SAVED').waitFor();
  await shot(p, 'app-09-players-added');
  await p.getByRole('checkbox', { name: 'Sam' }).click(); // no delete in the game flow: deselect
  await p.getByText('3 SELECTED').waitFor();
  await p.getByText('Start the round').last().click();
  await p.getByText('Enter scores').first().waitFor();
  await shot(p, 'app-05-game');
  await p.getByLabel('Round options').click();
  await p.getByText('Your scores are automatically saved as you play.').waitFor();
  await shot(p, 'app-06-round-options');
  await p.getByText('Quit round').last().click();
  await p.getByText('Quit this round?').waitFor();
  await shot(p, 'app-07-quit-confirm');
  await p.getByText('Yes, quit round').last().click();
  await p.getByText('Ready for an').waitFor();
  await shot(p, 'app-10-home-after-quit');

  // Full round: score every hole and finish; Last game updates. Then reload to prove persistence.
  await p.getByText('Start a new game').last().click();
  await p.getByLabel('Course The Tropical Trail').click();
  await p.getByText('Choose players').last().click();
  await p.getByText('Start the round').last().click();
  await p.getByText('Enter scores').first().waitFor();
  for (let h = 1; h <= 9; h++) {
    for (const name of ['You', 'Alex', 'Jordan']) {
      const times = name === 'You' ? 2 : 3;
      for (let t = 0; t < times; t++) await p.getByLabel(`Increase ${name} score on hole ${h}`).click();
    }
    if (h < 9) await p.getByText('Next hole').nth(h - 1).click();
    await settle(p, 250);
  }
  await shot(p, 'app-11-game-last-hole');
  await p.getByText('Finish round').last().click();
  await p.getByText('CONFIRM RESULT', { exact: true }).waitFor();
  await p.getByText('Confirm result').last().click();
  await p.getByText('Ready for an').waitFor();
  await p.reload({ waitUntil: 'networkidle' });
  await p.getByText('LAST GAME').waitFor({ timeout: 60000 });
  await shot(p, 'app-12-home-after-finish-reload', 1200);
  await p.context().close();
}

await browser.close();
