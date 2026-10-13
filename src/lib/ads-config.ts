/**
 * All AdMob ad unit ids and RevenueCat product config in one place.
 *
 * Ad unit ids come from EXPO_PUBLIC_* env vars (set them in EAS for production builds) and fall back
 * to Google's official test ids. Dev builds (__DEV__) always use the test ids, so we never serve or
 * click real ads while developing (AdMob can suspend accounts for that).
 *
 * The AdMob *app* ids are native config and live in app.json (react-native-google-mobile-ads plugin).
 */

export type AdPlatform = 'ios' | 'android';

/** Google's official test ad units: https://developers.google.com/admob/{ios,android}/test-ads */
export const TEST_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174', // adaptive banner
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741', // adaptive banner
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
} as const;

export type AdUnitEnv = {
  iosBanner?: string;
  androidBanner?: string;
  iosInterstitial?: string;
  androidInterstitial?: string;
};

/** Expo only inlines EXPO_PUBLIC_* when read as literal `process.env.NAME`, so list them explicitly. */
const ENV: AdUnitEnv = {
  iosBanner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  androidBanner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
  iosInterstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
  androidInterstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
};

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export function resolveAdUnits(os: AdPlatform, dev: boolean, env: AdUnitEnv = ENV) {
  const test = TEST_AD_UNITS[os];
  if (dev) return { ...test, isTest: true };
  const banner = clean(os === 'ios' ? env.iosBanner : env.androidBanner);
  const interstitial = clean(os === 'ios' ? env.iosInterstitial : env.androidInterstitial);
  return {
    banner: banner ?? test.banner,
    interstitial: interstitial ?? test.interstitial,
    isTest: !banner || !interstitial,
  };
}

/** At least this long between two interstitials (shared by "new game" and "new venue"). */
export const INTERSTITIAL_MIN_INTERVAL_MS = 60_000;
/** If a loaded interstitial hasn't opened within this time, carry on without it. */
export const INTERSTITIAL_OPEN_TIMEOUT_MS = 2_000;

/** RevenueCat: one-off, non-consumable "Remove ads". */
export const REVENUECAT = {
  entitlement: 'no_ads',
  productId: 'adventure_golf_remove_ads',
  offering: 'default',
  iosKey: clean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
  androidKey: clean(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
} as const;
