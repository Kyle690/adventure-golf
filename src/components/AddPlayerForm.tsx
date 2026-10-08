import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { addPlayer } from '@/db/queries';
import type { Player } from '@/db/schema';
import { nextPlayerColor } from '@/lib/players';
import { colors, fonts, MAX_PLAYERS } from '@/theme';

/** Dashed "ADD A PLAYER" row (prototype add-player form): name + plus. Hidden at MAX_PLAYERS. */
export function AddPlayerForm({ players, onAdded }: { players: Player[]; onAdded?: (player: Player) => void }) {
  const [name, setName] = useState('');
  if (players.length >= MAX_PLAYERS) return null;

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const player = addPlayer(trimmed, nextPlayerColor(players));
    setName('');
    onAdded?.(player);
  };

  return (
    <View style={styles.addForm}>
      <View style={{ flex: 1 }}>
        <Text style={styles.addLabel}>ADD A PLAYER</Text>
        <TextInput
          accessibilityLabel="Player name"
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="Enter their name"
          placeholderTextColor="#9aa59f"
          returnKeyType="done"
          style={styles.input}
        />
      </View>
      <Pressable accessibilityLabel="Add player" onPress={add} style={styles.addButton}>
        <Icon name="plus" color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    marginTop: 13,
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  addLabel: { marginBottom: 5, color: '#75837b', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  input: {
    paddingVertical: 7,
    paddingHorizontal: 0,
    color: colors.ink,
    fontSize: 12,
    fontFamily: fonts.body,
    borderBottomWidth: 1,
    borderBottomColor: '#c8d1c6',
    outlineStyle: 'none',
  } as object,
  addButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.green,
  },
});
