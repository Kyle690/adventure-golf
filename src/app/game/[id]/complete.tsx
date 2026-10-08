import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationOverlay } from '@/components/celebration/Celebration';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ShareScoreCardButton, useScoreCardShare } from '@/components/ShareScoreCard';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { completeGame, getGame, type GameDetail } from '@/db/queries';
import { gameResults, scoreGrid, totalPar } from '@/lib/game';
import { finishToHome } from '@/lib/navigation';
import { roundHeadline } from '@/lib/scorecard';
import { formatVsPar } from '@/lib/stats';
import { formatDayTime } from '@/lib/time';
import { colors, fonts } from '@/theme';

/**
 * Game complete. One screen for both:
 * - a just-finished live round ("Finish round"): results to check, then "Confirm result" marks it
 *   completed and resets to the Home tab; "Keep editing scores" goes back to scoring;
 * - a completed round (History, venue, player, Home last game): read-only review.
 * Both show the winner, standings and the hole-by-hole score sheet from the game's snapshot, with
 * a prominent "Share score card" (image via the share sheet). Confirming saves the round as
 * completed straight away, then plays the celebration overlay; leaving it resets to Home.
 */
export default function GameCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: game } = useDbQuery(() => getGame(Number(id)).then((g) => g ?? null), id);
  const scoreCard = useScoreCardShare(game);
  // Only set by "Confirm result" in this session, so reviewing a past round never celebrates.
  const [celebrating, setCelebrating] = useState(false);

  if (game === undefined) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  if (game === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.missing}>This round no longer exists.</Text>
      </View>
    );
  }

  const holes = game.holes;
  const players = game.gamePlayers.map((gp) => gp.player);
  const grid = scoreGrid(game);
  const results = gameResults(game);
  const winners = new Set(results.filter((r) => r.isWinner).map((r) => r.playerId));
  const byPlayer = new Map(results.map((r) => [r.playerId, r]));
  const par = totalPar(holes);
  const live = game.status === 'in_progress';
  const nothingScored = results.every((r) => r.holesScored === 0);
  const missing = results.some((r) => r.missing > 0 && r.holesScored > 0);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(live ? `/game/${game.id}` : '/history');
  };
  const confirm = () => {
    completeGame(game.id);
    setCelebrating(true);
  };
  const goHome = () => {
    setCelebrating(false);
    finishToHome();
  };

  return (
    <View style={styles.screen}>
      {scoreCard.capture}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <Pressable accessibilityLabel="Share" onPress={scoreCard.share} style={styles.roundButton}>
              <Icon name="share" size={19} color="#fff" />
            </Pressable>
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>{live ? 'CONFIRM RESULT' : 'FINAL SCORECARD'}</Eyebrow>
          <Text style={styles.title}>{game.courseName}</Text>
          <View style={styles.meta}>
            <View style={styles.metaChip}>
              <Icon name="pin" size={15} color="rgba(255,255,255,0.78)" />
              <Text style={styles.metaText}>{game.venueName}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{formatDayTime(game.completedAt ?? game.startedAt)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>
                {holes.length} holes · PAR {par}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.winnerCard}>
            <View style={styles.trophy}>
              <Icon name="trophy" size={24} color="#c99a12" />
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: '#b9861a', marginBottom: 4 }}>{live ? 'FINAL RESULT' : 'WINNER'}</Eyebrow>
              <Text style={styles.winnerTitle}>{roundHeadline(game)}</Text>
              {results[0]?.holesScored ? (
                <Text style={styles.winnerSub}>
                  {results[0].total} strokes · {formatVsPar(results[0].vsPar)} vs par
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <ShareScoreCardButton onPress={scoreCard.share} busy={scoreCard.busy} notice={scoreCard.notice} />
          </View>

          <Text style={styles.section}>Standings</Text>
          <View style={{ gap: 7 }}>
            {results.map((r) => {
              const index = players.findIndex((p) => p.id === r.playerId);
              return (
                <View key={r.playerId} style={[styles.standing, r.isWinner && styles.standingWinner]}>
                  <Text style={styles.rank}>{r.rank ?? '–'}</Text>
                  <PlayerAvatar player={players[index]} index={index} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.standingName}>{r.name}</Text>
                    <Text style={styles.standingSub}>
                      {r.holesScored ? `${formatVsPar(r.vsPar)} vs par` : 'No scores'}
                      {r.missing && r.holesScored ? ` · ${r.missing} not scored` : ''}
                    </Text>
                  </View>
                  {r.isWinner ? <Icon name="trophy" size={18} color="#c99a12" /> : null}
                  <Text style={styles.standingTotal}>{r.holesScored ? r.total : '–'}</Text>
                </View>
              );
            })}
          </View>

          {live ? (
            <View style={styles.actions}>
              <Text style={styles.copy}>Check the totals. Once confirmed, the round is saved as finished.</Text>
              {missing ? (
                <Text style={styles.warning}>Some holes have no score. Totals only count the holes that were scored.</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={nothingScored}
                style={[styles.button, styles.confirm, nothingScored && { opacity: 0.45 }]}
                onPress={confirm}
              >
                <Icon name="check" size={17} strokeWidth={2.6} color="#fff" />
                <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm result</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.button} onPress={goBack}>
                <Text style={styles.buttonText}>Keep editing scores</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.section}>Score sheet</Text>
          {/* Grid: one row per hole, one column per player (fits up to 6 players on a phone). */}
          <View style={styles.table}>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, styles.holeCol]}>HOLE</Text>
              <Text style={[styles.th, styles.parCol]}>PAR</Text>
              {players.map((p, i) => (
                <View key={p.id} style={[styles.playerCol, winners.has(p.id) && styles.winnerCol]}>
                  <PlayerAvatar player={p} index={i} size={24} />
                  <Text style={styles.thName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
            {holes.map((hole, h) => (
              <View key={hole.id} style={[styles.tr, h % 2 === 1 && styles.trAlt]}>
                <Text style={[styles.td, styles.holeCol, styles.holeNum]}>{hole.number}</Text>
                <Text style={[styles.td, styles.parCol, styles.parNum]}>{hole.par}</Text>
                {players.map((p, i) => {
                  const strokes = grid[h][i];
                  const diff = strokes - hole.par;
                  return (
                    <View key={p.id} style={[styles.playerCol, winners.has(p.id) && styles.winnerCol]}>
                      <View
                        style={[
                          styles.cell,
                          strokes > 0 && diff < 0 && styles.under,
                          strokes > 0 && diff > 0 && styles.over,
                          strokes === 1 && styles.ace,
                        ]}
                      >
                        <Text style={[styles.cellText, strokes === 1 && { color: '#fff' }]}>{strokes || '–'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={[styles.tr, styles.totalRow]}>
              <Text style={[styles.tf, styles.holeCol]}>TOTAL</Text>
              <Text style={[styles.tf, styles.parCol]}>{par}</Text>
              {players.map((p) => {
                const r = byPlayer.get(p.id);
                return (
                  <View key={p.id} style={[styles.playerCol, winners.has(p.id) && styles.winnerColDark]}>
                    <Text style={styles.totalText}>{r?.holesScored ? r.total : '–'}</Text>
                  </View>
                );
              })}
            </View>
            <View style={[styles.tr, styles.vsRow]}>
              <Text style={[styles.tf, styles.holeCol]}>± PAR</Text>
              <Text style={[styles.tf, styles.parCol]} />
              {players.map((p) => {
                const r = byPlayer.get(p.id);
                return (
                  <View key={p.id} style={[styles.playerCol, winners.has(p.id) && styles.winnerColDark]}>
                    <Text style={styles.vsText}>{r?.holesScored ? formatVsPar(r.vsPar) : '–'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.legend}>
            <View style={[styles.legendSwatch, styles.under]} />
            <Text style={styles.legendText}>Under par</Text>
            <View style={[styles.legendSwatch, styles.over]} />
            <Text style={styles.legendText}>Over par</Text>
            <View style={[styles.legendSwatch, styles.ace]} />
            <Text style={styles.legendText}>Hole-in-one</Text>
          </View>

        </View>
      </ScrollView>
      {celebrating ? <RoundCelebration game={game} onDone={goHome} /> : null}
    </View>
  );
}

/** The onboarding-style celebration, played once when a round is confirmed. */
function RoundCelebration({ game, onDone }: { game: GameDetail; onDone: () => void }) {
  const scoreCard = useScoreCardShare(game);
  const players = game.gamePlayers.map((gp) => gp.player);
  const results = gameResults(game);
  const solo = players.length === 1;
  const leader = results[0];
  return (
    <CelebrationOverlay
      visible
      onRequestClose={onDone}
      behind={scoreCard.capture}
      eyebrow="ROUND COMPLETE"
      title={roundHeadline(game)}
      subtitle={
        solo && leader?.holesScored
          ? `${leader.total} strokes (${formatVsPar(leader.vsPar)} vs par) at ${game.courseName}, ${game.venueName}. Saved to your history.`
          : `${game.courseName} at ${game.venueName} is in the books. Saved to your history.`
      }
      card={
        <View style={styles.celebrationCard}>
          <Eyebrow style={{ color: colors.green, fontSize: 8, marginBottom: 4 }}>FINAL STANDINGS</Eyebrow>
          {results.map((r) => {
            const index = players.findIndex((p) => p.id === r.playerId);
            return (
              <View key={r.playerId} style={[styles.celebrationRow, r.isWinner && styles.standingWinner]}>
                <Text style={styles.rank}>{r.rank ?? '–'}</Text>
                <PlayerAvatar player={players[index]} index={index} size={30} />
                <Text style={[styles.standingName, { flex: 1 }]} numberOfLines={1}>
                  {r.name}
                </Text>
                {r.isWinner && !solo ? <Icon name="trophy" size={17} color="#c99a12" /> : null}
                <Text style={styles.celebrationVs}>{r.holesScored ? formatVsPar(r.vsPar) : ''}</Text>
                <Text style={styles.celebrationTotal}>{r.holesScored ? r.total : '–'}</Text>
              </View>
            );
          })}
        </View>
      }
      actions={
        <View style={{ marginTop: 22 }}>
          <ShareScoreCardButton tone="light" onPress={scoreCard.share} busy={scoreCard.busy} notice={scoreCard.notice} />
          <WideCta label="Back to Home" onPress={onDone} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  // Opaque, so the score card being captured for sharing (rendered first) stays hidden.
  scroll: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: { color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  header: {
    paddingHorizontal: 21,
    paddingBottom: 23,
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
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
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
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#f1ba28',
    borderRadius: 18,
    backgroundColor: '#fffbea',
  },
  trophy: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#fff3c8',
  },
  winnerTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 21, lineHeight: 26 },
  winnerSub: { color: '#7c6a2e', fontSize: 10, fontFamily: fonts.bodySemi },
  table: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  tr: { flexDirection: 'row', alignItems: 'stretch', minHeight: 34 },
  trAlt: { backgroundColor: '#fafbf8' },
  thead: { backgroundColor: colors.deep, minHeight: 58 },
  th: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 0.8, textAlignVertical: 'center', alignSelf: 'center' },
  holeCol: { width: 44, textAlign: 'center', alignSelf: 'center' },
  parCol: { width: 34, textAlign: 'center', alignSelf: 'center' },
  playerCol: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 5 },
  winnerCol: { backgroundColor: 'rgba(241, 186, 40, 0.16)' },
  winnerColDark: { backgroundColor: 'rgba(241, 186, 40, 0.3)' },
  thName: { maxWidth: '92%', color: '#fff', fontSize: 9, fontFamily: fonts.bodyBold },
  td: { color: colors.ink },
  holeNum: { fontSize: 12, fontFamily: fonts.displayBold },
  parNum: { color: '#7f8e86', fontSize: 11, fontFamily: fonts.bodySemi },
  cell: { minWidth: 26, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  under: { backgroundColor: '#dcefd2' },
  over: { backgroundColor: '#fde3e3' },
  ace: { backgroundColor: colors.green },
  cellText: { color: colors.ink, fontSize: 13, lineHeight: 16, fontFamily: fonts.displayBold },
  totalRow: { borderTopWidth: 1, borderTopColor: '#dfe4dc', backgroundColor: '#edf4e8', minHeight: 40 },
  vsRow: { backgroundColor: '#edf4e8' },
  tf: { color: '#5f6f67', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.6 },
  totalText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
  vsText: { color: colors.green, fontSize: 11, fontFamily: fonts.bodyBold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginLeft: 2 },
  legendSwatch: { width: 12, height: 12, borderRadius: 4 },
  legendText: { marginRight: 8, color: '#82908a', fontSize: 9, fontFamily: fonts.body },
  actions: { gap: 10, marginTop: 16 },
  copy: { textAlign: 'center', color: '#7c8c84', fontSize: 11, lineHeight: 16, fontFamily: fonts.body },
  warning: { textAlign: 'center', color: '#b9142e', fontSize: 10, fontFamily: fonts.bodySemi },
  button: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#e8eee5',
  },
  confirm: { backgroundColor: colors.red, boxShadow: '0 8px 18px rgba(237, 27, 59, 0.22)' },
  buttonText: { color: colors.ink, fontSize: 12, fontFamily: fonts.bodyBold },
  section: { marginTop: 22, marginBottom: 10, color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  standing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  standingWinner: { borderColor: '#f1ba28', backgroundColor: '#fffbea' },
  rank: { width: 14, textAlign: 'center', color: '#8a9790', fontSize: 11, fontFamily: fonts.bodyBold },
  standingName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  standingSub: { color: '#849189', fontSize: 9, fontFamily: fonts.body },
  celebrationCard: { gap: 6, padding: 15 },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: '#e6ebe3',
    borderRadius: 12,
  },
  celebrationVs: { color: colors.green, fontSize: 10, fontFamily: fonts.bodyBold },
  celebrationTotal: { minWidth: 28, textAlign: 'right', color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
  standingTotal: { minWidth: 30, textAlign: 'right', color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20 },
});
