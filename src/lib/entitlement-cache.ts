/**
 * Local copy of the RevenueCat "no_ads" entitlement (stored in app_meta), so an ad-free user stays
 * ad-free offline and from the very first frame of a launch. Pure; the store is injected.
 */

export const ENTITLEMENT_META_KEY = 'no_ads_entitlement';

export type KeyValueStore = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
};

export type CachedEntitlement = { active: boolean; checkedAt: number };

export function readCachedEntitlement(store: KeyValueStore): CachedEntitlement | null {
  let raw: string | null = null;
  try {
    raw = store.get(ENTITLEMENT_META_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedEntitlement>;
    if (typeof parsed.active !== 'boolean') return null;
    return { active: parsed.active, checkedAt: typeof parsed.checkedAt === 'number' ? parsed.checkedAt : 0 };
  } catch {
    return null;
  }
}

export function writeCachedEntitlement(store: KeyValueStore, active: boolean, now = Date.now()): CachedEntitlement {
  const value = { active, checkedAt: now };
  store.set(ENTITLEMENT_META_KEY, JSON.stringify(value));
  return value;
}

/**
 * Merge a RevenueCat refresh into the cache. `remote` is the entitlement RevenueCat reported, or
 * null when the refresh failed/was unavailable, in which case the cached value is kept (offline).
 */
export function applyEntitlementRefresh(
  store: KeyValueStore,
  remote: boolean | null,
  now = Date.now(),
): boolean {
  const cached = readCachedEntitlement(store);
  if (remote === null) return cached?.active ?? false;
  writeCachedEntitlement(store, remote, now);
  return remote;
}
