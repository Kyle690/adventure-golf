/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createInterstitialGate, type InterstitialSource, type ShowCallbacks } from './interstitial-gate';

function harness() {
  let t = 1_000_000;
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const gate = createInterstitialGate({
    minIntervalMs: 60_000,
    openTimeoutMs: 2_000,
    now: () => t,
    setTimer: (fn, ms) => {
      const h = { fn, ms, cleared: false };
      timers.push(h);
      return h;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  });
  const fireTimers = () => timers.filter((h) => !h.cleared).forEach((h) => h.fn());
  return { gate, advance: (ms: number) => (t += ms), fireTimers };
}

/** An ad that opens and closes on demand. */
function fakeAd(loaded = true) {
  let cbs: ShowCallbacks | null = null;
  const source: InterstitialSource = { isLoaded: () => loaded, show: (c) => (cbs = c) };
  return { source, open: () => cbs!.onOpened(), close: () => cbs!.onClosed(), error: () => cbs!.onError(new Error('x')), shown: () => cbs !== null };
}

describe('interstitial gate', () => {
  it('runs the action only after the ad closes', async () => {
    const { gate } = harness();
    const ad = fakeAd();
    let ran = 0;
    const p = gate.run(() => ran++, { adFree: false, source: ad.source });
    assert.equal(ran, 0);
    ad.open();
    assert.equal(ran, 0, 'not while the ad is on screen');
    ad.close();
    assert.equal(await p, 'shown');
    assert.equal(ran, 1);
  });

  it('skips the ad for ad-free users', async () => {
    const { gate } = harness();
    const ad = fakeAd();
    let ran = 0;
    assert.equal(await gate.run(() => ran++, { adFree: true, source: ad.source }), 'ad-free');
    assert.equal(ran, 1);
    assert.equal(ad.shown(), false);
  });

  it('caps to one interstitial per 60 seconds', async () => {
    const { gate, advance } = harness();
    const first = fakeAd();
    const p = gate.run(() => {}, { adFree: false, source: first.source });
    first.open();
    first.close();
    await p;
    advance(59_000);
    const second = fakeAd();
    let ran = 0;
    assert.equal(await gate.run(() => ran++, { adFree: false, source: second.source }), 'capped');
    assert.equal(ran, 1);
    assert.equal(second.shown(), false);
    advance(1_000);
    const third = fakeAd();
    const p3 = gate.run(() => ran++, { adFree: false, source: third.source });
    assert.equal(third.shown(), true, 'allowed again after 60s');
    third.open();
    third.close();
    await p3;
    assert.equal(ran, 2);
  });

  it('passes straight through when not loaded, missing or throwing', async () => {
    const { gate } = harness();
    let ran = 0;
    assert.equal(await gate.run(() => ran++, { adFree: false, source: fakeAd(false).source }), 'not-loaded');
    assert.equal(await gate.run(() => ran++, { adFree: false, source: null }), 'not-loaded');
    const throwing: InterstitialSource = { isLoaded: () => true, show: () => { throw new Error('boom'); } };
    assert.equal(await gate.run(() => ran++, { adFree: false, source: throwing }), 'failed');
    assert.equal(ran, 3);
  });

  it('continues when the ad errors, and an error does not start the cap', async () => {
    const { gate } = harness();
    const ad = fakeAd();
    let ran = 0;
    const p = gate.run(() => ran++, { adFree: false, source: ad.source });
    ad.error();
    assert.equal(await p, 'failed');
    assert.equal(ran, 1);
    assert.equal(gate.isCapped(), false);
  });

  it('continues if the ad never opens (timeout), and ignores late callbacks', async () => {
    const { gate, fireTimers } = harness();
    const ad = fakeAd();
    let ran = 0;
    const p = gate.run(() => ran++, { adFree: false, source: ad.source });
    fireTimers();
    assert.equal(await p, 'timeout');
    ad.open();
    ad.close();
    assert.equal(ran, 1, 'action runs exactly once');
  });

  it('ignores a second tap while an ad is showing', async () => {
    const { gate } = harness();
    const ad = fakeAd();
    let ran = 0;
    const p = gate.run(() => ran++, { adFree: false, source: ad.source });
    ad.open();
    assert.equal(await gate.run(() => ran++, { adFree: false, source: ad.source }), 'busy');
    ad.close();
    await p;
    assert.equal(ran, 1);
  });
});
