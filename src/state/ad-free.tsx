/**
 * Ads + "Remove ads" state for the whole app.
 *
 * - adFree comes from the app_meta cache synchronously (works offline, no ad flash on launch) and
 *   is refreshed from RevenueCat on launch and whenever RevenueCat reports a change.
 * - Ads are only requested once UMP consent (and iOS ATT) has been resolved, and never for ad-free users.
 * - runWithInterstitial(action) shows a preloaded interstitial first when allowed (60s cap), and
 *   otherwise runs the action straight away.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { createInterstitial, openPrivacyOptions, prepareAds } from '@/ads/mobile-ads';
import {
  buyRemoveAds,
  configurePurchases,
  fetchAdFree,
  getRemoveAdsProduct,
  purchasesAvailable,
  restoreRemoveAds,
  type PurchaseResult,
  type RemoveAdsProduct,
} from '@/ads/purchases';
import { entitlementStore } from '@/db/queries';
import { INTERSTITIAL_MIN_INTERVAL_MS, INTERSTITIAL_OPEN_TIMEOUT_MS } from '@/lib/ads-config';
import { applyEntitlementRefresh, readCachedEntitlement, writeCachedEntitlement } from '@/lib/entitlement-cache';
import { createInterstitialGate } from '@/lib/interstitial-gate';

type AdFreeValue = {
  /** User bought "Remove ads": no banners, no interstitials. */
  adFree: boolean;
  /** Consent resolved, SDK started and not ad-free: banners may load. */
  canShowAds: boolean;
  privacyOptionsRequired: boolean;
  purchasesAvailable: boolean;
  product: RemoveAdsProduct | null;
  productLoading: boolean;
  loadProduct: () => Promise<void>;
  purchase: () => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  openPrivacyOptions: () => Promise<boolean>;
  runWithInterstitial: (action: () => void) => void;
};

const AdFreeContext = createContext<AdFreeValue | null>(null);

export function AdFreeProvider({ children }: PropsWithChildren) {
  const [adFree, setAdFreeState] = useState(() => readCachedEntitlement(entitlementStore)?.active ?? false);
  const [consentReady, setConsentReady] = useState(false);
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [product, setProduct] = useState<RemoveAdsProduct | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const adFreeRef = useRef(adFree);
  const gate = useRef(
    createInterstitialGate({ minIntervalMs: INTERSTITIAL_MIN_INTERVAL_MS, openTimeoutMs: INTERSTITIAL_OPEN_TIMEOUT_MS }),
  ).current;
  const interstitial = useRef<ReturnType<typeof createInterstitial> | null>(null);

  const setAdFree = useCallback((value: boolean) => {
    adFreeRef.current = value;
    setAdFreeState(value);
    writeCachedEntitlement(entitlementStore, value);
  }, []);

  // RevenueCat: configure and refresh the entitlement on launch (cache kept if offline).
  useEffect(() => {
    if (!configurePurchases(setAdFree)) return;
    fetchAdFree().then((remote) => {
      const value = applyEntitlementRefresh(entitlementStore, remote);
      adFreeRef.current = value;
      setAdFreeState(value);
    });
  }, [setAdFree]);

  // Consent first (UMP, then ATT on iOS), then the ads SDK. Ad-free users never see a consent form.
  useEffect(() => {
    if (adFree || consentReady) return;
    let cancelled = false;
    prepareAds().then((r) => {
      if (cancelled) return;
      setCanRequestAds(r.canRequestAds);
      setPrivacyOptionsRequired(r.privacyOptionsRequired);
      setConsentReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [adFree, consentReady]);

  const canShowAds = consentReady && canRequestAds && !adFree;

  // Preload the interstitial once ads are allowed; drop it when the user goes ad-free.
  useEffect(() => {
    if (!canShowAds) return;
    const ad = createInterstitial();
    interstitial.current = ad;
    ad.load();
    return () => {
      ad.destroy();
      interstitial.current = null;
    };
  }, [canShowAds]);

  const runWithInterstitial = useCallback(
    (action: () => void) => {
      void gate.run(action, { adFree: adFreeRef.current, source: interstitial.current });
    },
    [gate],
  );

  const loadProduct = useCallback(async () => {
    setProductLoading(true);
    setProduct(await getRemoveAdsProduct());
    setProductLoading(false);
  }, []);

  const purchase = useCallback(async () => {
    const result = await buyRemoveAds();
    if (result === 'purchased') setAdFree(true);
    return result;
  }, [setAdFree]);

  const restore = useCallback(async () => {
    const result = await restoreRemoveAds();
    if (result === 'purchased') setAdFree(true);
    return result;
  }, [setAdFree]);

  const reopenPrivacy = useCallback(async () => {
    try {
      const allowed = await openPrivacyOptions();
      setCanRequestAds(allowed);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AdFreeValue>(
    () => ({
      adFree,
      canShowAds,
      privacyOptionsRequired,
      purchasesAvailable: purchasesAvailable(),
      product,
      productLoading,
      loadProduct,
      purchase,
      restore,
      openPrivacyOptions: reopenPrivacy,
      runWithInterstitial,
    }),
    [adFree, canShowAds, privacyOptionsRequired, product, productLoading, loadProduct, purchase, restore, reopenPrivacy, runWithInterstitial],
  );

  return <AdFreeContext.Provider value={value}>{children}</AdFreeContext.Provider>;
}

export function useAdFree() {
  const ctx = useContext(AdFreeContext);
  if (!ctx) throw new Error('useAdFree must be used inside <AdFreeProvider>');
  return ctx;
}
