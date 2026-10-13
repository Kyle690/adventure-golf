// Ads / Remove ads check on a demo-data web build (web shows a placeholder where AdMob banners go):
//   EXPO_PUBLIC_DEMO_SEED=1 npx expo export -p web --dev --output-dir /tmp/demo-web
//   node scripts/serve-web.mjs 8091 /tmp/demo-web
// Saves screenshots/ads-*.png. Needs playwright + Chrome.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/screenshots`;
const URL = process.env.APP_URL ?? 'http://127.0.0.1:8091/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const settle = (ms = 800) => page.waitForTimeout(ms);
const banner = () => page.getByLabel('Ad banner placeholder').last();
/** Scroll the active screen to its end so the banner (last item, above the nav clearance) is in view. */
const toBottom = async () => { await banner().scrollIntoViewIfNeeded(); await settle(400); };
const shot = async (name) => { await settle(500); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('saved', name); };
const tab = (name) => page.getByRole('tab', { name, exact: true });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await settle(2500);

const tabs = [['Home', 'ads-01-home'], ['Venues', 'ads-02-venues'], ['Players', 'ads-03-players'], ['History', 'ads-04-history']];
for (const [name, file] of tabs) {
  await tab(name).click();
  await settle(900);
  check(await banner().isVisible(), `${name}: banner placeholder shown`);
  await toBottom();
  const b = await banner().boundingBox();
  const nav = await page.locator('[role="tablist"]').last().boundingBox().catch(() => null);
  const navTop = nav?.y ?? (await tab('Home').boundingBox()).y;
  check(b && b.y + b.height <= navTop, `${name}: banner sits above the floating nav (${Math.round(b?.y + b?.height)} <= ${Math.round(navTop)})`);
  check(await page.getByLabel('Go ad-free').last().isVisible(), `${name}: "Remove ads" link next to the banner`);
  await shot(file);
}

// Remove ads sheet from the banner link (web: purchases unavailable, no crash).
await page.getByLabel('Go ad-free').last().click();
await page.waitForURL(/\/remove-ads$/);
await settle(1000);
check(await page.getByText('Play ad-free', { exact: true }).isVisible(), 'Remove ads screen opens from the banner link');
check(await page.getByText('Purchases unavailable', { exact: true }).isVisible(), 'web: shows purchases unavailable gracefully');
check(await page.getByLabel('Restore purchases').isVisible(), 'Restore purchases button');
await shot('ads-05-remove-ads');
await page.getByLabel('Close').last().click();
await settle(800);

// Settings from Home's avatar: Remove ads, Restore purchases, Privacy & ad choices.
await tab('Home').click();
await settle(600);
await page.getByLabel('Open profile').last().click();
await page.waitForURL(/\/settings$/);
await settle(900);
check(await page.getByLabel('Privacy & ad choices').isVisible(), 'Settings has Privacy & ad choices');
check(await page.getByLabel('Remove ads').isVisible(), 'Settings has Remove ads');
await page.getByLabel('Privacy & ad choices').click();
await settle(400);
check(await page.getByText('Ad choices are managed in the mobile app.').isVisible(), 'web: privacy entry explains it is mobile-only');
await shot('ads-06-settings-privacy');
await page.getByLabel('Remove ads').click();
await page.waitForURL(/\/remove-ads$/);
check(true, 'Settings opens Remove ads');

await browser.close();
console.log(failures ? `${failures} FAILURES` : 'ALL PASS');
process.exit(failures ? 1 : 0);
