// Game polish walkthrough on a demo-data web build:
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// Hole switcher (strip + previous/next, scores persist), the big hole title, Edit players during a
// round (add saved / create / remove with confirmation), the round-complete celebration after
// Confirm result, and "Share score card" on the complete screen (web: image download).
// Saves screenshots/polish-*.png (incl. the shared image itself). Needs playwright + Chrome.
import { chromium } from 'playwright';
import { copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/screenshots`;
const URL = process.env.APP_URL ?? 'http://127.0.0.1:8091/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1000 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
let failures = 0;
const check = (ok, msg) => { log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };
page.on('pageerror', (e) => { log('PAGEERROR', e.message); failures++; });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('WebSocket')) log('CONSOLE', m.text()); });
const settle = (ms = 800) => page.waitForTimeout(ms);
const shot = async (name, ms) => { await settle(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); log('saved', name); };
const visible = (text) => page.getByText(text, { exact: true }).last().isVisible();
const pathname = () => new globalThis.URL(page.url()).pathname;
const at = (re) => page.waitForURL((u) => re.test(new globalThis.URL(u).pathname), { timeout: 10000 });
const scoreOf = (name, hole) =>
  page.getByLabel(`Increase ${name} score on hole ${hole}`).evaluate((el) => el.previousElementSibling?.textContent);
const activeHole = () =>
  page.evaluate(() => document.querySelector('[aria-label^="Go to hole"][aria-selected="true"]')?.getAttribute('aria-label'));
const chipLabels = () =>
  page.evaluate(() => [...document.querySelectorAll('[aria-label^="Go to hole"]')].map((el) => el.getAttribute('aria-label')));
/** Is the "Hole n" card title inside the viewport (the card the scroller shows)? */
const cardInView = (n) =>
  page.getByText(`Hole ${n}`, { exact: true }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth;
  });

// --- Resume the demo live round (holes 1-4 scored, resumes on 5) ---
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await settle(2500);
// 6. New "Summit Pin" brand: the wordmark in the Home header (old parrot logo gone).
const logos = await page.evaluate(() =>
  [...document.querySelectorAll('img[alt="Adventure Golf"]')].map((img) => {
    const r = img.getBoundingClientRect();
    return { src: img.getAttribute('src') ?? '', w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 };
  }),
);
const homeLogo = logos.find((l) => l.visible);
check(/\/logo\.[0-9a-f]+\.png$|\/logo\.png/.test(homeLogo?.src ?? ''), `Home header uses the new logo (${homeLogo?.src})`);
check(logos.every((l) => !/adventure-golf-logo/.test(l.src)), 'no old parrot logo on the page');
check(homeLogo?.w === 211 && homeLogo?.h === 40, `Home logo is 211x40 (${homeLogo?.w}x${homeLogo?.h})`);
await shot('polish-brand-home', 400);

await page.getByText('Resume game', { exact: true }).last().click();
await at(/^\/game\/\d+$/);
await settle(1500);
const gamePath = pathname();

// 2. Big, bold hole title.
const title = await page.getByText('Hole 5', { exact: true }).evaluate((el) => {
  const cs = getComputedStyle(el);
  return { size: parseFloat(cs.fontSize), family: cs.fontFamily };
});
check(title.size >= 30 && /Fredoka_700Bold/.test(title.family), `hole title is big and bold (${title.size}px ${title.family})`);
check(await cardInView(5), 'resumes on hole 5');

// 1. Hole switcher.
const chips = await chipLabels();
check(chips.length === 9, `strip shows all 9 holes (${chips.length})`);
check(
  chips.slice(0, 4).every((l) => l.endsWith(', scored')) && chips.slice(4).every((l) => l.endsWith(', not scored')),
  'strip marks holes 1-4 scored, 5-9 not scored',
);
check((await activeHole()) === 'Go to hole 5, not scored', 'strip highlights the current hole');
await shot('polish-01-hole-switcher', 600);

await page.getByLabel('Go to hole 2, scored').click();
await settle(700);
check((await activeHole()) === 'Go to hole 2, scored', 'tapping hole 2 in the strip jumps back to it');
check(await cardInView(2), 'hole 2 card is shown');
check((await scoreOf('You', 2)) === '2' && (await scoreOf('Alex', 2)) === '3', 'hole 2 keeps its scores (You 2, Alex 3)');
await page.getByLabel('Increase You score on hole 2').click();
await settle(300);
check((await scoreOf('You', 2)) === '3', 'scores can be corrected on an earlier hole');
await page.getByLabel('Previous hole').nth(1).click();
await settle(700);
check((await activeHole())?.startsWith('Go to hole 1'), 'Previous hole goes back to hole 1');
check(await cardInView(1), 'hole 1 card is shown');
check(await page.getByLabel('Previous hole').first().isDisabled(), 'Previous hole is disabled on hole 1');
await page.getByText('Next hole', { exact: true }).first().click();
await settle(700);
check((await activeHole())?.startsWith('Go to hole 2'), 'Next hole goes forward to hole 2');
await page.getByLabel('Go to hole 8, not scored').click();
await settle(700);
check(await cardInView(8), 'jumping forward to hole 8 (not yet played) works');
await page.getByLabel('Increase Alex score on hole 8').click();
await settle(300);
check((await chipLabels())[7] === 'Go to hole 8, partly scored', 'a part-scored hole is marked in the strip');
await page.getByLabel('Go to hole 2, scored').click();
await settle(700);
check((await scoreOf('You', 2)) === '3', 'moving between holes keeps the corrected score');
await shot('polish-02-big-hole-title', 600);
await page.reload({ waitUntil: 'networkidle' });
await settle(2500);
await page.getByLabel(/^Go to hole 2,/).click();
await settle(700);
check((await scoreOf('You', 2)) === '3' && (await scoreOf('Alex', 8)) === '1', 'scores persist after a reload');

// 5. Edit players during the round.
await page.getByLabel('Edit players', { exact: true }).click();
await settle(600);
check(await visible('IN THIS ROUND'), 'Edit players sheet opens');
for (const name of ['You', 'Alex', 'Jordan']) {
  check(await page.getByLabel(`Remove ${name} from round`).isVisible(), `${name} can be removed`);
}
await page.getByLabel('Player name').last().fill('Sam');
await page.getByLabel('Add player').last().click();
await settle(700);
check(await page.getByLabel('Remove Sam from round').isVisible(), 'a player created in the sheet joins the round');
check(await page.getByText('No scores yet').last().isVisible(), 'the new player has no scores yet');
await shot('polish-03-edit-players', 500);
await page.getByLabel('Remove Jordan from round').click();
await settle(500);
check(await visible('Remove Jordan?'), 'removing a player with scores asks first');
check(await page.getByText(/Jordan's 4 scores in this round will be deleted/).isVisible(), 'confirmation says how many scores go');
await shot('polish-04-remove-player-confirm', 400);
await page.getByText('Yes, remove Jordan', { exact: true }).click();
await settle(700);
check((await page.getByLabel('Remove Jordan from round').count()) === 0, 'Jordan is out of the round');
check(await page.getByLabel('Add Jordan to round').isVisible(), 'Jordan can be added back from the crew');
await page.getByLabel('Remove Sam from round').click(); // no scores: removed straight away
await settle(600);
check((await page.getByLabel('Remove Sam from round').count()) === 0 && !(await visible('Remove Sam?')), 'a player without scores is removed without a prompt');
await page.getByLabel('Add Sam to round').click();
await settle(600);
check(await page.getByLabel('Remove Sam from round').isVisible(), 'a saved player can be added to the round');
await page.getByText('Done', { exact: true }).click();
await settle(600);
const scoreRows = await page.getByLabel(/^Increase .* score on hole 1$/).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
check(
  scoreRows.join('|') === 'Increase You score on hole 1|Increase Alex score on hole 1|Increase Sam score on hole 1',
  `game now scores You, Alex, Sam in order (${scoreRows.join(', ')})`,
);
// Round options also opens it.
await page.getByLabel('Round options').click();
await settle(400);
await page.getByText('Edit players', { exact: true }).last().click();
await settle(700);
check(await visible('IN THIS ROUND'), 'Round options > Edit players opens the sheet');
await page.getByText('Done', { exact: true }).click();
await settle(400);

// Score the rest (every hole, every player) and finish.
for (let hole = 1; hole <= 9; hole++) {
  for (const [name, target] of [['You', 2], ['Alex', 3], ['Sam', 4]]) {
    let current = Number((await scoreOf(name, hole)) || 0) || 0;
    while (current < target) {
      await page.getByLabel(`Increase ${name} score on hole ${hole}`).click();
      current++;
    }
  }
}
await page.getByLabel('Go to hole 9, scored').click();
await settle(600);
await page.getByText('Finish round', { exact: true }).last().click();
await at(/^\/game\/\d+\/complete$/);
await settle(1200);

// 4. Share score card (confirm mode).
check(await visible('CONFIRM RESULT'), 'finish opens the complete screen in confirm mode');
const shareButton = page.getByRole('button', { name: 'Share score card' });
check(await shareButton.last().isVisible(), 'complete screen has a Share score card button');
const box = await shareButton.last().boundingBox();
check(box && box.y < 1000 && box.height >= 56, `share button is large and on the first screen (y=${box?.y}, h=${box?.height})`);
await shot('polish-05-complete-share', 600);
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), shareButton.last().click()]);
const file = await download.path();
const name = download.suggestedFilename();
check(/^adventure-golf-the-tropical-trail-\d{4}-\d{2}-\d{2}\.png$/.test(name), `web share downloads the score card image (${name})`);
check(statSync(file).size > 20000, `score card image has content (${statSync(file).size} bytes)`);
copyFileSync(file, `${OUT}/polish-06-shared-scorecard.png`);
log('saved polish-06-shared-scorecard (the downloaded image)');
await settle(500);
check(await page.getByText('Score card image saved to your downloads.').last().isVisible(), 'web tells the user the image was downloaded');
check((await page.getByTestId('score-card-capture').count()) === 0, 'capture view is removed after sharing');

// 3. Confirm -> celebration overlay -> Home.
await page.getByText('Confirm result', { exact: true }).last().click();
await page.getByText('ROUND COMPLETE', { exact: true }).last().waitFor();
check(await visible('You win!'), 'celebration names the winner');
check(await visible('FINAL STANDINGS'), 'celebration recaps the standings');
check(await page.getByText('Back to Home', { exact: true }).last().isVisible(), 'celebration has Back to Home');
check(await page.getByRole('button', { name: 'Share score card' }).last().isVisible(), 'celebration can share the score card too');
await shot('polish-07-celebration', 1800);
await page.getByText('Back to Home', { exact: true }).last().click();
await at(/^\/$/);
await settle(1200);
check(!(await page.getByText('Resume game').last().isVisible()), 'round is saved as finished (no live round on Home)');
await page.goBack();
await settle(1000);
check(!/^\/game\//.test(pathname()), `back after the celebration does not return to the game (${pathname()})`);
check(pathname() !== gamePath, 'the finished game is not reopened');

// Review mode (History): share button, no celebration.
await page.goto(URL + 'history', { waitUntil: 'networkidle' });
await settle(2000);
await page.getByLabel(/, open result$/).first().click();
await at(/^\/game\/\d+\/complete$/);
await settle(1500);
check(await visible('FINAL SCORECARD'), 'History opens the review');
check(!(await page.getByText('ROUND COMPLETE', { exact: true }).count()), 'review mode never shows the celebration');
check(await page.getByRole('button', { name: 'Share score card' }).last().isVisible(), 'review mode has Share score card');
check(await page.evaluate(() => /TOTAL\s+29\s+23\s+29\s+36/.test(document.body.innerText)), 'score sheet totals after the edits: You 23, Alex 29, Sam 36 (Jordan removed)');
await shot('polish-08-review-share', 600);

await browser.close();
log(failures ? `${failures} FAILURES` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
