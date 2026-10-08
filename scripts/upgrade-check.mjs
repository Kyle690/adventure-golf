// Upgrade check for migration 0002 (game snapshots): run the PREVIOUS build with demo data in a
// persistent browser profile, record what Home / Players / player detail show, then serve the NEW
// build on the same origin (same OPFS database), let it migrate, and compare.
//   OLD_DIR=/tmp/demo-web-old NEW_DIR=/tmp/demo-web node scripts/upgrade-check.mjs
// (both built with EXPO_PUBLIC_DEMO_SEED=1 ... expo export -p web --dev). Needs playwright + Chrome.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8093;
const URL = `http://127.0.0.1:${PORT}/`;
const OLD_DIR = process.env.OLD_DIR ?? '/tmp/demo-web-old';
const NEW_DIR = process.env.NEW_DIR ?? '/tmp/demo-web';
const profile = mkdtempSync(path.join(tmpdir(), 'ag-upgrade-'));
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) failures++; };

function serve(dir) {
  const child = spawn('node', [`${ROOT}/scripts/serve-web.mjs`, String(PORT), dir], { stdio: 'ignore' });
  return new Promise((resolve) => setTimeout(() => resolve(child), 800));
}

async function capture(label) {
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 390, height: 1150 },
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.on('pageerror', (e) => console.log(`[${label}] PAGEERROR`, e.message));
  const text = async (route) => {
    await page.goto(URL + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    return page.evaluate(() => document.body.innerText);
  };
  // The previous build used flat routes (/crew, /player/:id); the new one nests them under the tabs.
  const routes = label === 'old' ? { crew: 'crew', player: 'player/' } : { crew: 'players', player: 'players/' };
  const result = {
    home: await text(''),
    crew: await text(routes.crew),
    owner: await text(`${routes.player}1`),
    alex: await text(`${routes.player}2`),
  };
  if (label === 'new') {
    result.venues = await text('venues');
    result.history = await text('history');
    result.complete = await text('game/1/complete');
    result.game = await text('game/2');
  }
  await ctx.close();
  return result;
}

let server = await serve(OLD_DIR);
const before = await capture('old');
server.kill();
server = await serve(NEW_DIR);
const after = await capture('new');
server.kill();

check(before.home.includes('Resume game') && before.home.includes('24'), 'previous build shows demo data (live round, best 24)');
for (const key of ['home', 'crew', 'owner', 'alex']) {
  // The new build adds tappable rows etc. but every stat line must be identical.
  // Layout-only differences are ignored: the crew list now ends with an inline "add a player"
  // form and player detail now sits inside the Players tab (tab bar visible).
  const norm = (s) =>
    s.replace(/\s+/g, ' ').trim().replace(/( Home Venues Players History)$/, '').replace(/ ADD A PLAYER$/, '');
  check(norm(after[key]) === norm(before[key]), `${key}: same content after upgrade`);
  if (norm(after[key]) !== norm(before[key])) {
    const [b, a] = [norm(before[key]), norm(after[key])];
    let i = 0;
    while (b[i] === a[i]) i++;
    console.log(`  first difference at ${i}:\n  BEFORE: …${b.slice(i - 60, i + 120)}\n  AFTER:  …${a.slice(i - 60, i + 120)}`);
  }
}
check(/Your best:\s*24\s*\(\u2212?-?5\)/.test(after.venues), 'venues tab: owner best 24 (-5) from migrated scores');
check(after.complete.includes('You win!') && /TOTAL\s+29\s+24\s+31\s+32/.test(after.complete), 'game complete (review) of the migrated game: par 29, totals 24/31/32');
check(after.history.includes('The Tropical Trail') && after.history.includes('Sandton'), 'history lists the migrated finished game');
check(after.game.includes('HOLE') && after.game.includes('05'), 'live round resumes on hole 5 after upgrade');
console.log(failures ? `${failures} FAILURES` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
