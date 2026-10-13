# Ads and Remove ads

AdMob (`react-native-google-mobile-ads`) + UMP consent + iOS ATT, and a one-off RevenueCat
"Remove ads" purchase (`react-native-purchases`). All native setup is in `app.json` (config plugins);
`ios/` and `android/` are generated. **Native modules: a new EAS build is required.**

## Where things live
- `src/lib/ads-config.ts` – ad unit ids (env vars, test-id fallbacks, test ids always in `__DEV__`),
  interstitial cap (60s) / open timeout (2s), RevenueCat ids.
- `src/lib/interstitial-gate.ts` – when an interstitial runs; the action always runs exactly once.
- `src/lib/entitlement-cache.ts` – `no_ads` entitlement cached in `app_meta` (offline-safe).
- `src/state/ad-free.tsx` – `AdFreeProvider` / `useAdFree()`.
- `src/ads/*.ts` and `*.web.ts` – native SDK wrappers and web stubs.
- `src/components/AdBanner.tsx` (`.web.tsx` = dev-only placeholder), `src/app/remove-ads.tsx`, `src/app/settings.tsx`.

## Placements
- Adaptive anchored banner at the end of Home, Venues, Players, History (above the nav clearance), with a "Remove ads" link.
- Interstitial before a game is created (Pick players → Start the round; covers Home "Start a new game" and Play-from-venue)
  and before a venue is created (New venue → Save). At most one per 60s; if not loaded / fails / doesn't open in 2s, the action runs immediately.
- Consent: UMP `gatherConsent()` at launch, then ATT on iOS, then `mobileAds().initialize()`; no ad requests before that.
  Settings (Home avatar) → "Privacy & ad choices" reopens the UMP form.

## What to set up
1. **AdMob**: create iOS + Android apps. Replace the test app ids in `app.json`
   (`react-native-google-mobile-ads` plugin: `iosAppId`, `androidAppId`).
   Create 4 ad units: banner + interstitial for each platform.
2. **AdMob → Privacy & messaging**: publish a GDPR (UK/EEA) message for both apps; optionally an IDFA explainer message.
3. **EAS env vars** (production environment, plain text is fine – they ship in the app):
   - `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID`
   - `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID`
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (appl_…), `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (goog_…)
4. **App Store Connect**: In-App Purchase, type **Non-Consumable**, product id `adventure_golf_remove_ads`, price, display name,
   review screenshot; paid apps agreement + banking/tax. Add the In-App Purchase key (or ASC API key) to RevenueCat.
5. **Google Play**: one-time in-app product `adventure_golf_remove_ads`; service account credentials in RevenueCat.
6. **RevenueCat**: project with iOS + Android apps; entitlement `no_ads`; attach both products; offering `default`
   (make it current) with a Lifetime package containing the product.
7. **app-ads.txt**: put AdMob's line (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`) at the root of the developer website
   listed in the App Store / Play listings.
8. **App Store privacy questionnaire / Play Data safety**: declare Device ID / advertising data, product interaction, coarse location,
   diagnostics collected by the AdMob SDK for third-party advertising (tracking: yes if ATT allowed), and purchase history (RevenueCat).
