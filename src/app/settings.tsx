import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adsSupported } from '@/ads/mobile-ads';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon, type IconName } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { useAdFree } from '@/state/ad-free';
import { colors, fonts } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Opened from Home's avatar: your crew, Remove ads, Restore purchases and Privacy & ad choices. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const ads = useAdFree();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    const r = await ads.restore();
    setBusy(false);
    setNote(
      r === 'purchased'
        ? 'Purchase restored. Ads are off.'
        : r === 'not-entitled'
          ? 'No Remove ads purchase found for this account.'
          : r === 'unavailable'
            ? 'Purchases aren’t available on this device.'
            : 'Couldn’t reach the store. Try again later.',
    );
  };

  const privacy = async () => {
    if (!adsSupported) {
      setNote('Ad choices are managed in the mobile app.');
      return;
    }
    const ok = await ads.openPrivacyOptions();
    setNote(ok ? null : 'Couldn’t open ad choices right now. Try again later.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>YOUR CLUBHOUSE</Eyebrow>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Your crew, ads and privacy.</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.section}>CREW</Text>
          <View style={styles.group}>
            <Row icon="users" title="Your crew" sub="Players and scorekeeper" onPress={() => router.navigate('/players')} />
          </View>

          <Text style={styles.section}>ADS</Text>
          <View style={styles.group}>
            {ads.adFree ? (
              <Row icon="check" title="Ads removed" sub="Thanks for supporting Adventure Golf" />
            ) : (
              <Row icon="trophy" title="Remove ads" sub="One-off purchase, no subscription" onPress={() => router.push('/remove-ads')} />
            )}
            <View style={styles.divider} />
            <Row icon="history" title="Restore purchases" sub={busy ? 'Checking…' : 'Already bought Remove ads?'} onPress={busy ? undefined : restore} />
          </View>

          <Text style={styles.section}>PRIVACY</Text>
          <View style={styles.group}>
            <Row
              icon="flag"
              title="Privacy & ad choices"
              sub="Review or change your ad consent"
              onPress={privacy}
            />
          </View>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f6f8f3' }]}
    >
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {onPress ? <Icon name="chevron" size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 22, paddingBottom: 23, overflow: 'hidden', backgroundColor: colors.deep },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21 },
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
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subtitle: { marginTop: 5, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 8, paddingHorizontal: 20 },
  section: { marginTop: 18, marginBottom: 8, marginLeft: 2, color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.9 },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 16, backgroundColor: '#fff' },
  divider: { height: 1, marginLeft: 62, backgroundColor: '#edf0ea' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 13 },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.green },
  rowTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  rowSub: { marginTop: 2, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  note: { marginTop: 12, textAlign: 'center', color: '#5f6f67', fontSize: 11, fontFamily: fonts.bodySemi },
});
