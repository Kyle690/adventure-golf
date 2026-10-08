import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RoundMenu } from '@/components/RoundMenu';
import { useDbQuery } from '@/db/hooks';
import { completeGame, deleteGame, getGame, setScore } from '@/db/queries';
import { currentHoleIndex, playerTotals, scoreGrid, totalPar } from '@/lib/game';
import { playerColor } from '@/lib/players';
import { colors, fonts, MAX_STROKES } from '@/theme';

const CARD_GAP = 12;
const SIDE_PADDING = 20;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameId = Number(id);
  const insets = useSafeAreaInsets();
  const { data: game, refresh } = useDbQuery(() => getGame(gameId).then((g) => g ?? null), String(gameId));

  const [activeHole, setActiveHole] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const positioned = useRef(false);

  // Card = scroller width minus padding, minus 8px (prototype: flex 0 0 100%; max-width calc(100% - 8px)).
  const cardWidth = Math.max(0, width - SIDE_PADDING * 2 - 8);
  const interval = cardWidth + CARD_GAP;

  // Resume on the first hole that still needs scores.
  useEffect(() => {
    if (!game || !width || positioned.current) return;
    positioned.current = true;
    const start = currentHoleIndex(game);
    setActiveHole(start);
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: start * interval, animated: false }));
  }, [game, width, interval]);

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
        <Pressable style={styles.nextHole} onPress={() => router.dismissTo('/')}>
          <Text style={styles.nextHoleText}>Back home</Text>
        </Pressable>
      </View>
    );
  }

  const holes = game.course.holes;
  const players = game.gamePlayers.map((gp) => gp.player);
  const grid = scoreGrid(game);
  const totals = playerTotals(game);
  const par = totalPar(holes);
  const holeCount = holes.length;
  const isLive = game.status === 'in_progress';

  const goToHole = (index: number) => {
    setActiveHole(index);
    scroller.current?.scrollTo({ x: index * interval, animated: true });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!interval) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / interval);
    setActiveHole(Math.min(holeCount - 1, Math.max(0, index)));
  };

  const updateScore = (holeIndex: number, playerIndex: number, amount: number) => {
    const current = grid[holeIndex][playerIndex];
    const next = Math.min(MAX_STROKES, Math.max(0, current + amount));
    if (next !== current) setScore(game.id, players[playerIndex].id, holes[holeIndex].id, next);
  };

  const finish = () => {
    completeGame(game.id);
    router.dismissTo('/');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top), height: 258 + Math.max(0, insets.top - 16) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Leave game" onPress={() => router.dismissTo('/')} style={styles.roundButton}>
              <Icon name="close" color="#fff" />
            </Pressable>
            <Logo compact />
            <Pressable
              accessibilityLabel="Round options"
              onPress={() => setMenuOpen(true)}
              style={[styles.roundButton, { paddingBottom: 12 }]}
            >
              <Text style={styles.moreText}>•••</Text>
            </Pressable>
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>{isLive ? 'LIVE ROUND' : 'FINISHED ROUND'}</Eyebrow>
          <Text style={styles.title}>{game.course.name}</Text>
          <View style={styles.meta}>
            <View style={styles.metaChip}>
              <Icon name="pin" size={15} color="rgba(255,255,255,0.78)" />
              <Text style={styles.metaText}>{game.course.venue.name}</Text>
            </View>
            <View style={styles.metaChip}>
              <Icon name="flag" size={15} color="rgba(255,255,255,0.78)" />
              <Text style={styles.metaText}>{holeCount} holes</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>PAR {par}</Text>
            </View>
          </View>
        </View>

        <View style={styles.main} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          <View style={styles.holeProgress}>
            <View>
              <Text style={styles.holeLabel}>HOLE</Text>
              <Text style={styles.holeNumber}>
                {String(activeHole + 1).padStart(2, '0')}{' '}
                <Text style={styles.holeOf}>/ {String(holeCount).padStart(2, '0')}</Text>
              </Text>
            </View>
            <View style={styles.progressLine}>
              <View style={[styles.progressFill, { width: `${((activeHole + 1) / holeCount) * 100}%` }]} />
            </View>
            <View style={styles.parBadge}>
              <Text style={styles.parBadgeLabel}>PAR</Text>
              <Text style={styles.parBadgeValue}>{holes[activeHole]?.par}</Text>
            </View>
          </View>

          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval || undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={onScroll}
            scrollEventThrottle={32}
            style={styles.scroller}
            contentContainerStyle={styles.scrollerContent}
          >
            {holes.map((hole, holeIndex) => {
              const last = holeIndex === holeCount - 1;
              return (
                <View key={hole.id} style={[styles.card, { width: cardWidth }]}>
                  <View style={styles.cardHeading}>
                    <View>
                      <Text style={styles.cardKicker}>HOLE {hole.number}</Text>
                      <Text style={styles.cardTitle}>Enter scores</Text>
                    </View>
                    <Text style={styles.miniPar}>PAR {hole.par}</Text>
                  </View>
                  <View style={styles.scoreList}>
                    {players.map((player, playerIndex) => (
                      <View key={player.id} style={styles.scoreRow}>
                        <PlayerAvatar player={player} index={playerIndex} size={34} />
                        <Text style={styles.scoreName}>{player.name}</Text>
                        <View style={styles.stepper}>
                          <Pressable
                            accessibilityLabel={`Decrease ${player.name} score on hole ${hole.number}`}
                            onPress={() => updateScore(holeIndex, playerIndex, -1)}
                            style={styles.stepButton}
                          >
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.stepValue}>{grid[holeIndex][playerIndex] || '–'}</Text>
                          <Pressable
                            accessibilityLabel={`Increase ${player.name} score on hole ${hole.number}`}
                            onPress={() => updateScore(holeIndex, playerIndex, 1)}
                            style={[styles.stepButton, styles.stepButtonPlus]}
                          >
                            <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    style={styles.nextHole}
                    onPress={() => (last ? finish() : goToHole(holeIndex + 1))}
                  >
                    <Text style={styles.nextHoleText}>{last ? 'Finish round' : 'Next hole'}</Text>
                    <Icon name={last ? 'trophy' : 'arrow'} size={19} color="#fff" />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.dots}>
            {holes.map((hole, index) => (
              <View key={hole.id} style={[styles.dot, index === activeHole && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.leaderboard}>
            <View style={styles.leaderHeading}>
              <View>
                <Eyebrow style={{ color: '#85c556' }}>SCOREBOARD</Eyebrow>
                <Text style={styles.leaderTitle}>Round totals</Text>
              </View>
              <Icon name="trophy" color={colors.yellow} />
            </View>
            {players.map((player, index) => (
              <View key={player.id} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>{index + 1}</Text>
                <View style={[styles.leaderAvatar, { backgroundColor: playerColor(player, index) }]}>
                  {player.photo ? (
                    <Image source={{ uri: player.photo }} style={styles.leaderPhoto} contentFit="cover" />
                  ) : (
                    <Text style={styles.leaderAvatarText}>{player.name.slice(0, 1)}</Text>
                  )}
                </View>
                <Text style={styles.leaderName}>{player.name}</Text>
                <Text style={styles.leaderTotal}>{totals[index] || '–'}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <RoundMenu
        visible={menuOpen}
        courseName={game.course.name}
        onClose={() => setMenuOpen(false)}
        onSaveAndExit={() => router.dismissTo('/')}
        onQuit={() => {
          setMenuOpen(false);
          deleteGame(game.id);
          refresh();
          router.dismissTo('/');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#edf1ea' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
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
  moreText: { color: '#fff', fontSize: 18, letterSpacing: 2, fontFamily: fonts.body },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  meta: { flexDirection: 'row', gap: 9, marginTop: 15 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  metaText: { color: 'rgba(255,255,255,0.78)', fontSize: 8, fontFamily: fonts.bodyBold },

  main: { zIndex: 3, marginTop: -27 },
  holeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: SIDE_PADDING,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    boxShadow: '0 8px 24px rgba(8, 61, 64, 0.12)',
  },
  holeLabel: { color: '#8c9992', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.12 },
  holeNumber: { marginTop: 2, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20 },
  holeOf: { color: '#a2aaa6', fontSize: 10 },
  progressLine: { flex: 1, height: 5, overflow: 'hidden', borderRadius: 5, backgroundColor: '#e3e7e1' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.red },
  parBadge: { alignItems: 'flex-start' },
  parBadgeLabel: { color: '#8a9690', fontSize: 8, fontFamily: fonts.body },
  parBadgeValue: { alignSelf: 'center', color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20 },

  scroller: { marginTop: 17 },
  scrollerContent: { gap: CARD_GAP, paddingHorizontal: SIDE_PADDING, paddingBottom: 12 },
  card: {
    padding: 19,
    borderRadius: 21,
    backgroundColor: '#fff',
    boxShadow: '0 5px 14px rgba(8,61,64,0.08)',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e7eae4',
  },
  cardKicker: { color: colors.green, fontSize: 8, lineHeight: 24, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  cardTitle: { marginTop: 3, color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  miniPar: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    overflow: 'hidden',
    color: colors.ink,
    fontSize: 8,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.64,
    borderRadius: 8,
    backgroundColor: '#f7edbc',
  },
  scoreList: { paddingVertical: 4 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0eb',
  },
  scoreName: { flex: 1, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 13 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#f1f3ef',
  },
  stepButton: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  stepButtonPlus: { backgroundColor: colors.green },
  stepText: { color: colors.ink, fontSize: 17, lineHeight: 19, fontFamily: fonts.body },
  stepValue: { minWidth: 24, textAlign: 'center', color: colors.ink, fontFamily: fonts.display, fontSize: 16 },
  nextHole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 11,
    backgroundColor: colors.red,
  },
  nextHoleText: { color: '#fff', fontSize: 11, fontFamily: fonts.bodyBold },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 4, paddingBottom: 18 },
  dot: { width: 5, height: 5, borderRadius: 5, backgroundColor: '#aeb8b1' },
  dotActive: { width: 16, backgroundColor: colors.green },

  leaderboard: { marginHorizontal: SIDE_PADDING, padding: 17, borderRadius: 19, backgroundColor: colors.deep },
  leaderHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  leaderTitle: { marginTop: 4, color: '#fff', fontFamily: fonts.display, fontSize: 17 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  leaderRank: { width: 12, color: '#91a5a5', fontSize: 9, fontFamily: fonts.body },
  leaderAvatar: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 14,
  },
  leaderPhoto: { width: '100%', height: '100%' },
  leaderAvatarText: { color: '#fff', fontSize: 10, fontFamily: fonts.body },
  leaderName: { flex: 1, color: '#fff', fontSize: 11, fontFamily: fonts.bodyBold },
  leaderTotal: { color: colors.yellow, fontFamily: fonts.displayBold, fontSize: 16 },
});
