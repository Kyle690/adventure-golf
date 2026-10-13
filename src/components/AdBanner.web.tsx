import { StyleSheet, View } from 'react-native';

import { AdBannerFrame } from '@/components/AdBannerFrame';
import { Text } from '@/components/Text';
import { useAdFree } from '@/state/ad-free';
import { fonts } from '@/theme';

/** Web has no AdMob: in dev/demo builds show a placeholder where the banner goes; nothing in production. */
export function AdBanner() {
  const { adFree } = useAdFree();
  if (!__DEV__ || adFree) return null;
  return (
    <AdBannerFrame>
      <View style={styles.box} accessibilityLabel="Ad banner placeholder">
        <Text style={styles.text}>Banner ad · 320×50 adaptive</Text>
      </View>
    </AdBannerFrame>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#dfe4dc',
    backgroundColor: '#eef1ea',
  },
  text: { color: '#9aa69f', fontSize: 10, fontFamily: fonts.bodySemi },
});
