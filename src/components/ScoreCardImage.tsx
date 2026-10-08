import { StyleSheet, View } from 'react-native';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import type { GameDetail } from '@/db/queries';
import { gameResults, scoreGrid, totalPar } from '@/lib/game';
import { playerColor } from '@/lib/players';
import { roundDate, roundHeadline } from '@/lib/scorecard';
import { formatVsPar } from '@/lib/stats';
import { formatLongDate } from '@/lib/time';
import { colors, fonts } from '@/theme';

export const SCORE_CARD_WIDTH = 360;

/**
 * The shareable score card, laid out for an image (fixed width, no photos so nothing has to load):
 * course, venue, date, winner, hole-by-hole strokes per player, totals and vs par.
 */
export function ScoreCardImage({ game }: { game: GameDetail }) {
  const players = game.gamePlayers.map((gp) => gp.player);
  const grid = scoreGrid(game);
  const results = gameResults(game);
  const byPlayer = new Map(results.map((r) => [r.playerId, r]));
  const winners = new Set(results.filter((r) => r.isWinner).map((r) => r.playerId));
  const leader = results[0];
  const par = totalPar(game.holes);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Logo compact />
          <Text style={styles.date}>{formatLongDate(roundDate(game))}</Text>
        </View>
        <Eyebrow style={{ marginTop: 10, marginBottom: 6, color: '#90ce5e' }}>SCORE CARD</Eyebrow>
        <Text style={styles.course}>{game.courseName}</Text>
        <Text style={styles.venue}>
          {game.venueName} · {game.holes.length} holes · Par {par}
        </Text>
      </View>

      <View style={styles.winner}>
        <View style={styles.trophy}>
          <Icon name="trophy" size={20} color="#c99a12" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.winnerTitle}>{roundHeadline(game)}</Text>
          {leader?.holesScored ? (
            <Text style={styles.winnerSub}>
              {leader.total} strokes · {formatVsPar(leader.vsPar)} vs par
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tr, styles.thead]}>
          <Text style={[styles.th, styles.holeCol]}>HOLE</Text>
          <Text style={[styles.th, styles.parCol]}>PAR</Text>
          {players.map((p, i) => (
            <View key={p.id} style={[styles.playerCol, winners.has(p.id) && styles.winnerCol]}>
              <View style={[styles.bubble, { backgroundColor: playerColor(p, i) }]}>
                <Text style={styles.bubbleText}>{p.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.thName} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>
        {game.holes.map((hole, h) => (
          <View key={hole.id} style={[styles.tr, h % 2 === 1 && styles.trAlt]}>
            <Text style={[styles.holeCol, styles.holeNum]}>{hole.number}</Text>
            <Text style={[styles.parCol, styles.parNum]}>{hole.par}</Text>
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

      <Text style={styles.footer}>Scored with the Adventure Golf app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Square corners: transparent corners would turn black in some apps' previews.
  card: { width: SCORE_CARD_WIDTH, overflow: 'hidden', backgroundColor: colors.cream },
  header: { padding: 18, paddingBottom: 20, backgroundColor: colors.deep },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: fonts.bodyBold },
  course: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 31 },
  venue: { marginTop: 3, color: 'rgba(255,255,255,0.72)', fontSize: 11, fontFamily: fonts.bodySemi },
  winner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    margin: 14,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1ba28',
    borderRadius: 16,
    backgroundColor: '#fffbea',
  },
  trophy: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#fff3c8' },
  winnerTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24 },
  winnerSub: { color: '#7c6a2e', fontSize: 10, fontFamily: fonts.bodySemi },
  table: {
    marginHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  trAlt: { backgroundColor: '#fafbf8' },
  thead: { minHeight: 52, backgroundColor: colors.deep },
  th: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  holeCol: { width: 40, textAlign: 'center' },
  parCol: { width: 30, textAlign: 'center' },
  playerCol: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 3 },
  winnerCol: { backgroundColor: 'rgba(241, 186, 40, 0.16)' },
  winnerColDark: { backgroundColor: 'rgba(241, 186, 40, 0.3)' },
  bubble: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  bubbleText: { color: '#fff', fontFamily: fonts.display, fontSize: 11, lineHeight: 14 },
  thName: { maxWidth: '94%', color: '#fff', fontSize: 9, fontFamily: fonts.bodyBold },
  holeNum: { color: colors.ink, fontSize: 12, fontFamily: fonts.displayBold },
  parNum: { color: '#7f8e86', fontSize: 11, fontFamily: fonts.bodySemi },
  cell: { minWidth: 24, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  under: { backgroundColor: '#dcefd2' },
  over: { backgroundColor: '#fde3e3' },
  ace: { backgroundColor: colors.green },
  cellText: { color: colors.ink, fontSize: 12, lineHeight: 15, fontFamily: fonts.displayBold },
  totalRow: { minHeight: 36, borderTopWidth: 1, borderTopColor: '#dfe4dc', backgroundColor: '#edf4e8' },
  vsRow: { backgroundColor: '#edf4e8' },
  tf: { color: '#5f6f67', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.6 },
  totalText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
  vsText: { color: colors.green, fontSize: 11, fontFamily: fonts.bodyBold },
  footer: { paddingTop: 10, paddingBottom: 14, color: '#82908a', fontSize: 9, fontFamily: fonts.bodySemi, textAlign: 'center' },
});
