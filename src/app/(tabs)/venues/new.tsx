import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_CLEARANCE } from '@/components/BottomNav';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { FieldCard, ImageField, TextField } from '@/components/onboarding/Form';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { createVenue } from '@/db/queries';
import { pickImageSafely } from '@/lib/images';
import { colors, fonts } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/venues');
}

/** Add a venue (name required, address + photo optional), then open it to add its courses. */
export default function NewVenueScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const venue = createVenue({ name: name.trim(), address: address.trim() || null, image });
    router.replace(`/venues/${venue.id}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom }}
      >
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>NEW VENUE</Eyebrow>
          <Text style={styles.title}>Add a venue</Text>
          <Text style={styles.subtitle}>Save it, then add its courses from the venue page.</Text>
        </View>
        <View style={styles.content}>
          <FieldCard>
            <TextField
              label="VENUE NAME"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jungle Putt Sandton"
              autoCapitalize="words"
              maxLength={60}
            />
            <TextField
              label="ADDRESS"
              optional
              value={address}
              onChangeText={setAddress}
              onSubmitEditing={save}
              placeholder="Street, city"
              autoCapitalize="words"
              maxLength={120}
            />
          </FieldCard>
          <View style={{ marginTop: 12 }}>
            <ImageField label="Venue photo" uri={image} onPick={() => pickImageSafely(setImage)} onClear={() => setImage(null)} />
          </View>
          <WideCta label="Save venue" disabled={!valid} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 21,
    paddingBottom: 25,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
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
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 20, paddingHorizontal: 20 },
});
