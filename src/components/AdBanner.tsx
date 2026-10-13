import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { bannerUnitId } from '@/ads/mobile-ads';
import { AdBannerFrame } from '@/components/AdBannerFrame';
import { useAdFree } from '@/state/ad-free';

/**
 * Anchored adaptive banner at the end of a tab's scroll content (above the floating nav's clearance,
 * so it never sits under the nav or over content). Renders nothing when ad-free, before consent, or
 * if no ad loads.
 */
export function AdBanner() {
  const { canShowAds } = useAdFree();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  if (!canShowAds || failed) return null;
  return (
    <AdBannerFrame>
      <BannerAd
        unitId={bannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        width={Math.floor(width)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </AdBannerFrame>
  );
}
