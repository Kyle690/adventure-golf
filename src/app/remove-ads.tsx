import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { GolfBall } from '@/components/GolfBall';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useAdFree } from '@/state/ad-free';
import { colors, fonts } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const PERKS = ['No banners on Home, Venues, Players or History', 'No full-screen ads before games or new venues', 'Pay once, keep it forever, restore on any device'];

/** "Remove ads": one-off RevenueCat purchase (entitlement no_ads). Price comes from the offering. */
export default function RemoveAdsScreen() {
  const insets = useSafeAreaInsets();
  const ads = useAdFree();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { loadProduct } = ads;

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const describe = (r: Awaited<ReturnType<typeof ads.purchase>>, restoring: boolean) =>
    r === 'purchased'
      ? null
      : r === 'cancelled'
        ? null
        : r === 'not-entitled'
          ? restoring
            ? 'No Remove ads purchase found for this account.'
            : 'The purchase didn’t complete. You haven’t been charged.'
          : r === 'unavailable'
            ? 'Purchases are unavailable right now.'
            : 'Something went wrong talking to the store. Try again.';

  const buy = async () => {
    setBusy('buy');
    setMessage(null);
    const r = await ads.purchase();
    setBusy(null);
    setMessage(describe(r, false));
  };
  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    const r = await ads.restore();
    setBusy(null);
    setMessage(describe(r, true));
  };

  const unavailable = !ads.purchasesAvailable || (!ads.productLoading && !ads.product);
  const price = ads.product?.price;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 28 }}>
        <View style={[styles.hero, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <View style={{ width: 38 }} />
            <Pressable accessibilityLabel="Close" onPress={close} style={styles.roundButton}>
              <Icon name="close" color="#fff" />
            </Pressable>
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>ADVENTURE GOLF</Eyebrow>
          <Text style={styles.title}>{ads.adFree ? 'Ads removed' : 'Play ad-free'}</Text>
          <Text style={styles.subtitle}>
            {ads.adFree ? 'Thanks for supporting Adventure Golf.' : 'One small, one-off purchase. No subscription.'}
          </Text>
          <GolfBall size={58} style={{ right: 26, bottom: 22, transform: [{ rotate: '18deg' }] }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            {PERKS.map((perk) => (
              <View key={perk} style={styles.perk}>
                <View style={styles.tick}>
                  <Icon name="check" size={13} strokeWidth={2.8} color="#fff" />
                </View>
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          {ads.adFree ? (
            <WideCta label="Back to the course" onPress={close} />
          ) : (
            <>
              <View style={styles.priceRow}>
                {ads.productLoading ? (
                  <ActivityIndicator color={colors.green} />
                ) : (
                  <>
                    <Text style={styles.price}>{price ?? '—'}</Text>
                    <Text style={styles.priceNote}>{unavailable ? 'Purchases unavailable' : 'one-off'}</Text>
                  </>
                )}
              </View>
              <WideCta
                label={busy === 'buy' ? 'Opening the store…' : price ? `Remove ads · ${price}` : 'Remove ads'}
                disabled={unavailable || busy !== null}
                onPress={buy}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                disabled={busy !== null || !ads.purchasesAvailable}
                onPress={restore}
                style={styles.restore}
              >
                <Text style={[styles.restoreText, !ads.purchasesAvailable && { opacity: 0.45 }]}>
                  {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
                </Text>
              </Pressable>
              {unavailable && !ads.productLoading ? (
                <Text style={styles.message}>Remove ads isn’t available on this device right now. Please try again later.</Text>
              ) : null}
            </>
          )}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 30,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  roundButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 32 },
  subtitle: { marginTop: 5, maxWidth: 240, color: 'rgba(255,255,255,0.68)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 20, paddingHorizontal: 20 },
  card: { gap: 12, padding: 16, borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 18, backgroundColor: '#fff' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  tick: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.green },
  perkText: { flex: 1, color: colors.ink, fontSize: 12, fontFamily: fonts.bodySemi },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 22, marginBottom: 4, minHeight: 40 },
  price: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 32 },
  priceNote: { color: '#82908a', fontSize: 11, fontFamily: fonts.bodySemi },
  restore: { alignSelf: 'center', marginTop: 14, padding: 6 },
  restoreText: { color: colors.green, fontSize: 12, fontFamily: fonts.bodyBold },
  message: { marginTop: 10, textAlign: 'center', color: '#5f6f67', fontSize: 11, fontFamily: fonts.bodySemi },
});
