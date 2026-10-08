import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { playerColor } from '@/lib/players';
import { fonts } from '@/theme';
import type { Player } from '@/db/schema';

/** Coloured initial bubble (prototype .player-avatar / .player-avatar.small), or the player's photo. */
export function PlayerAvatar({
  player,
  index,
  size = 39,
}: {
  player: Pick<Player, 'name' | 'avatar'> & { photo?: string | null };
  index: number;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: playerColor(player, index) },
      ]}
    >
      {player.photo ? (
        <Image source={{ uri: player.photo }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text style={[styles.letter, { fontSize: size > 39 ? Math.round(size * 0.41) : size >= 39 ? 16 : 13 }]}>
          {player.name.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  letter: { color: '#fff', fontFamily: fonts.display },
});
