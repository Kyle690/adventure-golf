import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_CLEARANCE } from '@/components/BottomNav';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { ColorSwatches, FieldCard, FieldLabel, SectionTitle, TextField } from '@/components/onboarding/Form';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { getPlayer, listGamesForStats, listPlayers, removePlayer, updatePlayer } from '@/db/queries';
import type { Player } from '@/db/schema';
import { effectiveHandicap, formatHandicap, HANDICAP_BEST_OF, HANDICAP_WINDOW } from '@/lib/handicap';
import { pickImageSafely } from '@/lib/images';
import { playerColor } from '@/lib/players';
import { formatVsPar, ordinal, playerStats, type PlayerStats, type RecentRound } from '@/lib/stats';
import { timeAgo } from '@/lib/time';
import { colors, fonts } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/players');
}

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);
  const { data } = useDbQuery(async () => {
    const [player, games, crew] = await Promise.all([getPlayer(playerId), listGamesForStats(), listPlayers()]);
    return {
      player: player ?? null,
      index: Math.max(0, crew.findIndex((p) => p.id === playerId)),
      takenColors: crew.filter((p) => p.id !== playerId).map((p) => p.avatar ?? ''),
      stats: playerStats(playerId, games),
    };
  }, id);

  if (!data) return <View style={styles.screen} />;
  if (!data.player) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Text style={styles.missingText}>This player no longer exists.</Text>
        <WideCta label="Back to players" onPress={goBack} />
      </View>
    );
  }
  // Keyed so the form re-initialises if a different player is opened.
  return <PlayerDetail key={data.player.id} {...data} player={data.player} />;
}

function PlayerDetail({
  player,
  index,
  takenColors,
  stats,
}: {
  player: Player;
  index: number;
  takenColors: string[];
  stats: PlayerStats;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(player.name);
  const [color, setColor] = useState(playerColor(player, index));
  const [photo, setPhoto] = useState<string | null>(player.photo ?? null);
  const [handicap, setHandicap] = useState(player.handicap != null ? String(player.handicap) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trimmed = name.trim();
  const handicapValue = handicap === '' ? null : Number(handicap);
  const dirty =
    trimmed !== player.name ||
    color !== playerColor(player, index) ||
    photo !== (player.photo ?? null) ||
    handicapValue !== player.handicap;
  const valid = trimmed.length > 0;

  const save = () => {
    if (!valid) return;
    updatePlayer(player.id, { name: trimmed, avatar: color, photo, handicap: handicapValue });
    goBack();
  };

  const remove = () => {
    setConfirmDelete(false);
    removePlayer(player.id);
    goBack();
  };

  const preview = { name: trimmed || player.name, avatar: color, photo };
  const shownHandicap = effectiveHandicap(stats.handicap, handicapValue);
  const firstName = player.isOwner ? 'you' : player.name;

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
            <Pressable accessibilityLabel="Back to players" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.identity}>
            <View style={styles.avatarRing}>
              <PlayerAvatar player={preview} index={index} size={68} />
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>
                {player.isOwner ? 'SCOREKEEPER · YOU' : 'PLAYER'}
              </Eyebrow>
              <Text style={styles.title} numberOfLines={2}>
                {trimmed || player.name}
              </Text>
            </View>
          </View>
          <View style={styles.meta}>
            <View style={styles.metaChip}>
              <Icon name="flag" size={15} color="rgba(255,255,255,0.78)" />
              <Text style={styles.metaText}>
                {stats.rounds} {stats.rounds === 1 ? 'round' : 'rounds'}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>
                {shownHandicap.source === 'starting' ? 'Starting HCP' : 'HCP'} {formatHandicap(shownHandicap.value)}
              </Text>
            </View>
            {stats.holesInOne > 0 ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {stats.holesInOne} hole{stats.holesInOne === 1 ? '' : 's'}-in-one
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.handicapCard}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: '#b7e783' }]}>HANDICAP · CALCULATED</Text>
              <Text style={styles.handicapCopy}>
                {stats.handicap != null
                  ? stats.handicapRounds >= HANDICAP_BEST_OF
                    ? `Best ${HANDICAP_BEST_OF} of the last ${Math.min(stats.rounds, HANDICAP_WINDOW)} finished rounds`
                    : `Average of ${stats.handicapRounds} finished round${stats.handicapRounds === 1 ? '' : 's'}`
                  : handicapValue != null
                    ? `No finished rounds yet. Using the starting handicap (${handicapValue}) until then.`
                    : 'Finish a round to get a handicap.'}
              </Text>
              <Text style={styles.handicapFormula}>Strokes over par per hole × 18</Text>
            </View>
            <Text style={styles.handicapValue}>{formatHandicap(stats.handicap)}</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="ROUNDS" value={String(stats.rounds)} sub="Finished" />
            <StatCard label="WINS" value={String(stats.wins)} sub={stats.rounds ? `${Math.round((stats.wins / stats.rounds) * 100)}% win rate` : 'No rounds yet'} />
            <StatCard
              label="BEST ROUND"
              value={stats.best ? String(stats.best.total) : '–'}
              sub={stats.best ? `${formatVsPar(stats.best.vsPar)} · ${stats.best.courseName}` : 'Finish a round'}
            />
            <StatCard
              label="AVG / HOLE"
              value={stats.avgPerHole != null ? stats.avgPerHole.toFixed(1) : '–'}
              sub="Strokes per hole"
            />
          </View>

          <SectionTitle aside="Saved on this phone">Edit player</SectionTitle>
          <FieldCard>
            <TextField
              label="NAME"
              value={name}
              onChangeText={setName}
              onSubmitEditing={save}
              placeholder="Player name"
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={40}
            />
            {!valid ? <Text style={styles.error}>A name is required.</Text> : null}
            <View>
              <FieldLabel>AVATAR COLOUR</FieldLabel>
              <ColorSwatches value={color} onChange={setColor} taken={takenColors} />
            </View>
            <View>
              <FieldLabel optional>PHOTO</FieldLabel>
              <View style={styles.photoRow}>
                <PlayerAvatar player={preview} index={index} size={46} />
                <Pressable
                  accessibilityLabel={photo ? 'Change photo' : 'Add photo'}
                  onPress={() => pickImageSafely(setPhoto, [1, 1])}
                  style={styles.smallButton}
                >
                  <Icon name={photo ? 'edit' : 'image'} size={14} color={colors.ink} />
                  <Text style={styles.smallButtonText}>{photo ? 'Change' : 'Add photo'}</Text>
                </Pressable>
                {photo ? (
                  <Pressable accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} style={styles.smallButton}>
                    <Icon name="trash" size={14} color={colors.ink} />
                    <Text style={styles.smallButtonText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View>
              <TextField
                label="STARTING HANDICAP"
                optional
                value={handicap}
                onChangeText={(text) => setHandicap(text.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="e.g. 12"
              />
              <Text style={styles.help}>
                {stats.handicap != null
                  ? `Not used any more: the handicap is now calculated from ${firstName === 'you' ? 'your' : `${firstName}'s`} finished rounds.`
                  : `Only shown until ${firstName} ${firstName === 'you' ? 'finish' : 'finishes'} a round; after that it is calculated.`}
              </Text>
            </View>
          </FieldCard>
          <WideCta label={dirty ? 'Save changes' : 'No changes'} disabled={!valid || !dirty} onPress={save} />

          <SectionTitle aside={stats.recent.length ? `Last ${stats.recent.length}` : undefined}>Recent rounds</SectionTitle>
          {stats.recent.length ? (
            <View style={{ gap: 8 }}>
              {stats.recent.map((round) => (
                <RoundRow key={round.gameId} round={round} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptyCopy}>Rounds {player.isOwner ? 'you play' : `${player.name} plays`} will show up here.</Text>
            </View>
          )}

          {player.isOwner ? (
            <Text style={styles.ownerNote}>You&apos;re the scorekeeper, so this player can&apos;t be removed.</Text>
          ) : (
            <Pressable accessibilityRole="button" style={styles.danger} onPress={() => setConfirmDelete(true)}>
              <View style={styles.dangerIcon}>
                <Icon name="trash" size={19} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerTitle}>Remove player</Text>
                <Text style={styles.dangerSub}>Deletes {player.name} and all of their scores</Text>
              </View>
              <Icon name="chevron" size={17} color="#9ca7a1" />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`Remove ${player.name}?`}
        message={`${player.name} and all of their scores (${stats.recent.length ? 'including past rounds' : 'none recorded yet'}) will be removed. This action can't be undone.`}
        confirmLabel="Yes, remove player"
        cancelLabel="No, keep them"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={[styles.statLabel, accent && { color: '#b7e783' }]}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: '#fff' }]}>{value}</Text>
      <Text style={[styles.statSub, accent && { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function RoundRow({ round }: { round: RecentRound }) {
  const detail = round.live
    ? `Live · hole ${Math.min(round.holeCount, round.holesPlayed + 1)} of ${round.holeCount}`
    : `${timeAgo(round.date)}${round.position ? ` · ${ordinal(round.position)} of ${round.playerCount}` : ''}`;
  return (
    <Pressable accessibilityRole="button" style={styles.round} onPress={() => router.push(round.live ? `/game/${round.gameId}` : `/game/${round.gameId}/complete`)}>
      <View style={[styles.roundIcon, round.live && { backgroundColor: '#ffe9e4' }]}>
        {round.live ? <View style={styles.liveDot} /> : <Icon name={round.position === 1 ? 'trophy' : 'flag'} color="#348d45" />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ fontSize: 8, color: round.live ? colors.red : '#8a9790', marginBottom: 4 }}>
          {round.venueName.toUpperCase()}
        </Eyebrow>
        <Text style={styles.roundTitle} numberOfLines={1}>
          {round.courseName}
        </Text>
        <Text style={styles.roundMeta}>{detail}</Text>
      </View>
      <View style={styles.roundScore}>
        <Text style={styles.roundTotal}>{round.total || '–'}</Text>
        <Text style={styles.roundPar}>{round.holesPlayed ? formatVsPar(round.vsPar) : 'NO SCORE'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { justifyContent: 'center', padding: 24 },
  missingText: { textAlign: 'center', color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  // Same dark header as the Game screen.
  header: {
    paddingHorizontal: 21,
    paddingBottom: 23,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
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
  identity: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarRing: { padding: 3, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.14)' },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  metaText: { color: '#fff', fontSize: 9, fontFamily: fonts.bodyBold },
  content: { paddingTop: 18, paddingHorizontal: 20 },
  handicapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.green,
    boxShadow: '0 10px 22px rgba(24, 128, 68, 0.22)',
  },
  handicapCopy: { marginTop: 4, color: '#fff', fontSize: 11, fontFamily: fonts.bodySemi },
  handicapFormula: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontSize: 9, fontFamily: fonts.body },
  handicapValue: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 44 },
  help: { marginTop: 6, color: '#8c9992', fontSize: 9, lineHeight: 13, fontFamily: fonts.body },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexBasis: '45%',
    flexGrow: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  statAccent: { borderColor: colors.green, backgroundColor: colors.green },
  statLabel: { color: '#7f8e86', fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  statValue: { marginTop: 4, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34 },
  statSub: { color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  error: { marginTop: -8, color: colors.red, fontSize: 10, fontFamily: fonts.bodySemi },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: '#eff2ed',
  },
  smallButtonText: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodyBold },
  // Mirrors the Home "Last game" card.
  round: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  roundIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#e9f1e5',
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.red,
    boxShadow: '0 0 0 5px rgba(237, 27, 59, 0.12)',
  },
  roundTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  roundMeta: { color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  roundScore: { alignItems: 'center', minWidth: 44 },
  roundTotal: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24 },
  roundPar: { color: colors.green, fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 0.6 },
  emptyCard: {
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  emptyTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  emptyCopy: { color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  ownerNote: { marginTop: 18, textAlign: 'center', color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  // Same as the round menu's danger action.
  danger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0d8d8',
    borderRadius: 14,
    backgroundColor: '#fffafa',
  },
  dangerIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#ffe8e8',
  },
  dangerTitle: { color: '#b9142e', fontFamily: fonts.displayBold, fontSize: 14 },
  dangerSub: { marginTop: 2, color: '#849189', fontSize: 9, fontFamily: fonts.body },
});
