import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { FieldCard, ImageField, TextField } from '@/components/onboarding/Form';
import { StepPage } from '@/components/onboarding/StepPage';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { saveVenue, type OnboardingState } from '@/db/queries';
import { pickLocalImage } from '@/lib/images';
import { colors, fonts } from '@/theme';

export async function pickImageSafely(setUri: (uri: string) => void) {
  try {
    const uri = await pickLocalImage();
    if (uri) setUri(uri);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (Platform.OS === 'web') console.warn('Image pick failed', message);
    else Alert.alert('Could not add photo', message);
  }
}

export function VenueStep({
  state,
  onSaved,
  topBar,
}: {
  state: OnboardingState;
  onSaved: () => void;
  topBar: React.ReactNode;
}) {
  const venue = state.venue;
  const [name, setName] = useState(venue?.name ?? '');
  const [address, setAddress] = useState(venue?.address ?? '');
  const [image, setImage] = useState<string | null>(venue?.image ?? null);

  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    saveVenue({ id: venue?.id, name: name.trim(), address: address.trim() || null, image });
    onSaved();
  };

  return (
    <StepPage
      topBar={topBar}
      step={2}
      total={4}
      eyebrow="YOUR VENUE"
      title="Where do you play?"
      subtitle="Add the adventure golf venue you visit most. You can add more later."
    >
      <FieldCard>
        <View style={styles.preview}>
          <View style={styles.icon}>
            <Icon name="pin" color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, !valid && styles.placeholder]} numberOfLines={1}>
              {name.trim() || 'Venue name'}
            </Text>
            <Text style={styles.previewSub} numberOfLines={1}>
              {address.trim() || 'Address (optional)'}
            </Text>
          </View>
        </View>
        <TextField
          label="VENUE NAME"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Jungle Putt Sandton"
          autoCapitalize="words"
          returnKeyType="next"
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
          returnKeyType="done"
          maxLength={120}
        />
      </FieldCard>
      <View style={{ marginTop: 12 }}>
        <ImageField
          label="Venue photo"
          uri={image}
          onPick={() => pickImageSafely(setImage)}
          onClear={() => setImage(null)}
        />
      </View>
      <WideCta label="Save venue" disabled={!valid} onPress={save} />
    </StepPage>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  // Same icon tile as the Setup venue cards.
  icon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.green,
  },
  previewName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },
  placeholder: { color: '#b3bdb7' },
  previewSub: { marginTop: 1, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
});
