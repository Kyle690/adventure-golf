import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorSwatches, FieldCard, FieldLabel, TextField } from '@/components/onboarding/Form';
import { StepPage } from '@/components/onboarding/StepPage';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { saveOwner, type OnboardingState } from '@/db/queries';
import { colors, fonts, PLAYER_COLORS } from '@/theme';

export function OwnerStep({
  state,
  onSaved,
  topBar,
}: {
  state: OnboardingState;
  onSaved: () => void;
  topBar: React.ReactNode;
}) {
  const owner = state.owner;
  const [name, setName] = useState(owner?.name ?? '');
  const [color, setColor] = useState(owner?.avatar ?? PLAYER_COLORS[0]);
  const [handicap, setHandicap] = useState(owner?.handicap != null ? String(owner.handicap) : '');

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const save = () => {
    if (!valid) return;
    saveOwner({ name: trimmed, avatar: color, handicap: handicap === '' ? null : Number(handicap) });
    onSaved();
  };

  return (
    <StepPage
      topBar={topBar}
      step={1}
      total={4}
      eyebrow="WELCOME"
      title={'Welcome to\nAdventure Golf'}
      subtitle="Let's set up your clubhouse. First up: who's keeping score?"
    >
      <FieldCard>
        <View style={styles.preview}>
          <PlayerAvatar player={{ name: trimmed || '?', avatar: color }} index={0} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, !valid && styles.placeholder]}>{trimmed || 'Your name'}</Text>
            <Text style={styles.previewRole}>Scorekeeper · that&apos;s you</Text>
          </View>
        </View>
        <TextField
          label="YOUR NAME"
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          placeholder="Enter your name"
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="done"
          maxLength={40}
        />
        <View>
          <FieldLabel>AVATAR COLOUR</FieldLabel>
          <ColorSwatches value={color} onChange={setColor} />
        </View>
        <TextField
          label="HANDICAP"
          optional
          value={handicap}
          onChangeText={(text) => setHandicap(text.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          placeholder="e.g. 12"
        />
      </FieldCard>
      <WideCta label="Continue" disabled={!valid} onPress={save} />
    </StepPage>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  previewName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
  placeholder: { color: '#b3bdb7' },
  previewRole: { marginTop: 1, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
});
