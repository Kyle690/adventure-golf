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

/** "Kyle Winter" -> "KW", "Kyle" -> "K" (home profile button). */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
