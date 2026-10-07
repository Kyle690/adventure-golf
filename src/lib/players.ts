import type { Player } from '@/db/schema';
import { PLAYER_COLORS } from '@/theme';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Kyle's schema has no colour column, so a player's `avatar` holds their avatar colour
 * (hex) until real avatar images exist. Falls back to the prototype palette by position.
 */
export function playerColor(player: Pick<Player, 'avatar'>, index: number): string {
  if (player.avatar && HEX.test(player.avatar)) return player.avatar;
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

/** Next unused palette colour for a new player (prototype: PLAYER_COLORS[players.length]). */
export function nextPlayerColor(existing: Pick<Player, 'avatar'>[]): string {
  const used = new Set(existing.map((p) => p.avatar));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[existing.length % PLAYER_COLORS.length];
}
