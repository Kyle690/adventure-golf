/** Web: no AdMob. Same surface as mobile-ads.ts so the app and Playwright scripts run unchanged. */
import type { InterstitialSource } from '@/lib/interstitial-gate';

export const adsSupported = false;
export const bannerUnitId = () => '';

export async function prepareAds() {
  return { canRequestAds: false, privacyOptionsRequired: false };
}

export async function openPrivacyOptions(): Promise<boolean> {
  return false;
}

export function createInterstitial(): InterstitialSource & { load: () => void; destroy: () => void } {
  return { load: () => {}, destroy: () => {}, isLoaded: () => false, show: ({ onError }) => onError() };
}
