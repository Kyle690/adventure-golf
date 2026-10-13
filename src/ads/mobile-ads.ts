/**
 * Native AdMob layer: UMP consent + iOS App Tracking Transparency, SDK init, interstitials and the
 * privacy options form. Web uses mobile-ads.web.ts (no AdMob there).
 */
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
} from 'react-native-google-mobile-ads';

import { resolveAdUnits } from '@/lib/ads-config';
import type { InterstitialSource } from '@/lib/interstitial-gate';

export const adsSupported = true;

const units = () => resolveAdUnits(Platform.OS === 'ios' ? 'ios' : 'android', __DEV__);
export const bannerUnitId = () => units().banner;

/**
 * Ask for consent (UMP shows its form only where required, e.g. UK/EEA), then ATT on iOS, then start
 * the SDK. Resolves with whether ads may be requested. Never throws.
 */
export async function prepareAds(): Promise<{ canRequestAds: boolean; privacyOptionsRequired: boolean }> {
  let canRequestAds = false;
  let privacyOptionsRequired = false;
  try {
    const info = await AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
    privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    // Consent update failed (e.g. offline): fall back to whatever consent was stored last time.
    try {
      const info = await AdsConsent.getConsentInfo();
      canRequestAds = info.canRequestAds;
      privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    } catch {
      canRequestAds = false;
    }
  }
  if (Platform.OS === 'ios') {
    try {
      const { status } = await getTrackingPermissionsAsync();
      if (status === 'undetermined') await requestTrackingPermissionsAsync();
    } catch {
      // ATT unavailable: ads are simply non-personalised.
    }
  }
  if (!canRequestAds) return { canRequestAds, privacyOptionsRequired };
  try {
    await mobileAds().initialize();
  } catch {
    return { canRequestAds: false, privacyOptionsRequired };
  }
  return { canRequestAds, privacyOptionsRequired };
}

/** Reopen the consent choices ("Privacy & ad choices"). Returns whether ads may be requested now. */
export async function openPrivacyOptions(): Promise<boolean> {
  const info = await AdsConsent.showPrivacyOptionsForm();
  return info.canRequestAds;
}

/** One reusable interstitial: preloads, reloads after each show, retries a failed load later. */
export function createInterstitial(): InterstitialSource & { load: () => void; destroy: () => void } {
  const ad = InterstitialAd.createForAdRequest(units().interstitial);
  let loading = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const load = () => {
    if (loading || ad.loaded) return;
    loading = true;
    ad.load();
  };
  const subs = [
    ad.addAdEventListener(AdEventType.LOADED, () => {
      loading = false;
    }),
    ad.addAdEventListener(AdEventType.ERROR, () => {
      loading = false;
      if (retry) clearTimeout(retry);
      retry = setTimeout(load, 30_000);
    }),
    ad.addAdEventListener(AdEventType.CLOSED, () => load()),
  ];
  return {
    load,
    isLoaded: () => ad.loaded,
    show: ({ onOpened, onClosed, onError }) => {
      const once = [
        ad.addAdEventListener(AdEventType.OPENED, () => onOpened()),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          once.forEach((u) => u());
          onClosed();
        }),
        ad.addAdEventListener(AdEventType.ERROR, (e) => {
          once.forEach((u) => u());
          onError(e);
        }),
      ];
      ad.show().catch((e: unknown) => {
        once.forEach((u) => u());
        onError(e);
      });
    },
    destroy: () => {
      subs.forEach((u) => u());
      if (retry) clearTimeout(retry);
    },
  };
}
