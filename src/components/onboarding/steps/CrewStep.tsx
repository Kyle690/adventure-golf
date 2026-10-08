import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ColorSwatches, formStyles } from '@/components/onboarding/Form';
import { StepPage } from '@/components/onboarding/StepPage';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { addPlayer, removePlayer, type OnboardingState } from '@/db/queries';
import { nextPlayerColor } from '@/lib/players';
import { colors, fonts, MAX_PLAYERS } from '@/theme';

/**
 * Step 4: build the crew. Players are written to SQLite as soon as they are added/removed,
 * and "Create" just finishes onboarding (no game is started).
 */
export function CrewStep({
  state,
  onCreate,
  topBar,
}: {
  state: OnboardingState;
  onCreate: () => void;
  topBar: React.ReactNode;
}) {
  const crew = state.crew;
  const [name, setName] = useState('');
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const color = pickedColor ?? nextPlayerColor(crew);
  const full = crew.length >= MAX_PLAYERS;

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed || full) return;
    addPlayer(trimmed, color);
    setName('');
    setPickedColor(null);
  };

  return (
    <StepPage
      topBar={topBar}
      step={4}
      total={4}
      eyebrow="YOUR CREW"
      title="Who's playing?"
      subtitle={`Add the friends and family you play ${state.course?.name ?? 'your course'} with.`}
    >
      <View style={styles.count}>
        <Text style={styles.countText}>{crew.length} {crew.length === 1 ? 'PLAYER' : 'PLAYERS'}</Text>
        <Text style={styles.countText}>
          {crew.length} / {MAX_PLAYERS} SAVED
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {crew.map((player, index) => (
          <View key={player.id} style={[styles.row, styles.rowSelected]}>
            <PlayerAvatar player={player} index={index} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{player.name}</Text>
              <Text style={styles.role}>{player.isOwner ? 'Scorekeeper' : 'Player'}</Text>
            </View>
            {player.isOwner ? null : (
              <Pressable
                accessibilityLabel={`Remove ${player.name}`}
                hitSlop={6}
                onPress={() => removePlayer(player.id)}
                style={styles.remove}
              >
                <Icon name="trash" size={17} color="#a6aea9" />
              </Pressable>
            )}
            <View style={styles.check}>
              <Icon name="check" size={15} strokeWidth={2.8} color="#fff" />
            </View>
          </View>
        ))}
      </View>

      {full ? null : (
        <View style={styles.addForm}>
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addLabel}>ADD A PLAYER</Text>
              <TextInput
                accessibilityLabel="Player name"
                value={name}
                onChangeText={setName}
                onSubmitEditing={add}
                placeholder="Enter their name"
                placeholderTextColor="#9aa59f"
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={40}
                style={formStyles.input}
              />
            </View>
            <Pressable
              accessibilityLabel="Add player"
              disabled={!name.trim()}
              onPress={add}
              style={[styles.addButton, !name.trim() && { opacity: 0.45 }]}
            >
              <Icon name="plus" color="#fff" />
            </Pressable>
          </View>
          <Text style={[styles.addLabel, { marginTop: 12 }]}>THEIR COLOUR</Text>
          <ColorSwatches value={color} onChange={setPickedColor} taken={crew.map((p) => p.avatar ?? '')} />
        </View>
      )}

      <Text style={styles.note}>
        {crew.length === 1
          ? 'Playing solo? That works too. You can always add players later.'
          : 'You can choose who plays each time you start a round.'}
      </Text>

      <WideCta label="Create" disabled={!state.course} onPress={onCreate} />
    </StepPage>
  );
}

// Mirrors the Players screen (prototype .player-row / .add-player-form).
const styles = StyleSheet.create({
  count: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  countText: { color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.72 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  rowSelected: { borderColor: '#77b763', backgroundColor: '#fbfdf9' },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  role: { marginTop: 2, color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  remove: { padding: 7 },
  check: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.green,
  },
  addForm: {
    marginTop: 13,
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  addLabel: { marginBottom: 5, color: '#75837b', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  addButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.green,
  },
  note: { marginTop: 14, marginHorizontal: 2, color: '#82908a', fontSize: 10, fontFamily: fonts.body },
});
