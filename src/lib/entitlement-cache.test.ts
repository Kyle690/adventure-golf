/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAdUnits, TEST_AD_UNITS } from './ads-config';
import {
  applyEntitlementRefresh,
  ENTITLEMENT_META_KEY,
  readCachedEntitlement,
  writeCachedEntitlement,
  type KeyValueStore,
} from './entitlement-cache';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe('entitlement cache', () => {
  it('is empty on a fresh install', () => {
    assert.equal(readCachedEntitlement(memoryStore()), null);
  });

  it('round-trips the entitlement', () => {
    const store = memoryStore();
    writeCachedEntitlement(store, true, 42);
    assert.deepEqual(readCachedEntitlement(store), { active: true, checkedAt: 42 });
  });

  it('ignores corrupt values', () => {
    const store = memoryStore();
    store.set(ENTITLEMENT_META_KEY, '{nope');
    assert.equal(readCachedEntitlement(store), null);
    store.set(ENTITLEMENT_META_KEY, '{"active":"yes"}');
    assert.equal(readCachedEntitlement(store), null);
  });

  it('keeps the cached value when the refresh fails (offline)', () => {
    const store = memoryStore();
    writeCachedEntitlement(store, true, 1);
    assert.equal(applyEntitlementRefresh(store, null, 2), true);
    assert.deepEqual(readCachedEntitlement(store), { active: true, checkedAt: 1 });
    assert.equal(applyEntitlementRefresh(memoryStore(), null), false);
  });

  it('stores what RevenueCat reports, including a revoked purchase (refund)', () => {
    const store = memoryStore();
    assert.equal(applyEntitlementRefresh(store, true, 5), true);
    assert.equal(applyEntitlementRefresh(store, false, 6), false);
    assert.deepEqual(readCachedEntitlement(store), { active: false, checkedAt: 6 });
  });
});

describe('ad unit config', () => {
  const env = { iosBanner: 'ios-b', androidBanner: 'and-b', iosInterstitial: 'ios-i', androidInterstitial: ' ' };
  it('always uses test ids in dev', () => {
    assert.deepEqual(resolveAdUnits('ios', true, env), { ...TEST_AD_UNITS.ios, isTest: true });
  });
  it('uses env ids in release, falling back to test ids', () => {
    assert.deepEqual(resolveAdUnits('ios', false, env), { banner: 'ios-b', interstitial: 'ios-i', isTest: false });
    assert.deepEqual(resolveAdUnits('android', false, env), {
      banner: 'and-b',
      interstitial: TEST_AD_UNITS.android.interstitial,
      isTest: true,
    });
  });
});
