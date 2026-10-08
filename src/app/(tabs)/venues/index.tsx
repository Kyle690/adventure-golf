import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_CLEARANCE } from '@/components/BottomNav';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { useDbQuery } from '@/db/hooks';
import { loadVenueSummaries } from '@/db/queries';
import { formatVsPar } from '@/lib/stats';
import { timeAgo } from '@/lib/time';
import { sortVenues, type VenueSort, type VenueSummary } from '@/lib/venue-stats';
import { BRAND, colors, fonts } from '@/theme';

const SORTS: { key: VenueSort; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'played', label: 'Most played' },
  { key: 'recent', label: 'Recent' },
];

/** Venues tab: every venue with courses, games played, last played and your best score there. */
export default function VenuesScreen() {
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<VenueSort>('name');
  const { data } = useDbQuery(loadVenueSummaries);
  const venues = sortVenues(data ?? [], sort);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(105,183,52,0.06)', 'transparent']}
        locations={[0, 0.35]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <Logo compact style={{ marginBottom: 21 }} />
          <Eyebrow style={{ marginBottom: 6, color: '#8dcc58' }}>CLUBHOUSE</Eyebrow>
          <Text style={styles.title}>Your venues</Text>
          <Text style={styles.subtitle}>Where you play, with stats from your finished rounds.</Text>
        </View>

        <View style={styles.content}>
          {data && venues.length > 0 ? (
            <>
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>SORT BY</Text>
                <View style={styles.chips}>
                  {SORTS.map((s) => {
                    const selected = s.key === sort;
                    return (
                      <Pressable
                        key={s.key}
                        accessibilityRole="radio"
                        aria-selected={selected}
                        accessibilityLabel={`Sort by ${s.label}`}
                        onPress={() => setSort(s.key)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </View>
              <Pressable accessibilityRole="button" style={styles.addRow} onPress={() => router.push('/venues/new')}>
                <Icon name="plus" size={18} color={colors.green} />
                <Text style={styles.addRowText}>Add a venue</Text>
              </Pressable>
            </>
          ) : null}

          {data && venues.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="pin" color="#fff" />
              </View>
              <Text style={styles.emptyTitle}>No venues yet</Text>
              <Text style={styles.emptyCopy}>
                Add the adventure golf venues you visit. Courses, games and your best scores will show up here.
              </Text>
              <Pressable accessibilityRole="button" style={styles.emptyButton} onPress={() => router.push('/venues/new')}>
                <Icon name="plus" size={17} color="#fff" />
                <Text style={styles.emptyButtonText}>Add venue</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function VenueCard({ venue }: { venue: VenueSummary }) {
  const best = venue.ownerBest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, open venue`}
      onPress={() => router.push(`/venues/${venue.id}`)}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      {venue.image ? (
        <Image source={{ uri: venue.image }} style={styles.photo} contentFit="cover" accessibilityLabel={`${venue.name} photo`} />
      ) : (
        // Placeholder: dark green leafy panel like the app headers.
        <View style={[styles.photo, styles.placeholder]}>
          <LeafDecoration />
          <View style={styles.placeholderIcon}>
            <Icon name="pin" size={24} color="#fff" />
          </View>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>{BRAND.toUpperCase()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {venue.name}
            </Text>
            {venue.address ? (
              <View style={styles.addressRow}>
                <Icon name="pin" size={12} color="#8c9992" />
                <Text style={styles.address} numberOfLines={1}>
                  {venue.address}
                </Text>
              </View>
            ) : null}
          </View>
          <Icon name="chevron" size={18} color="#9ca7a1" />
        </View>
        <View style={styles.tiles}>
          <Tile label="COURSES" value={String(venue.courseCount)} sub={`${venue.holeCount} holes`} />
          <Tile label="GAMES" value={String(venue.gamesPlayed)} sub="Finished" />
          <Tile
            label="LAST PLAYED"
            value={venue.lastPlayed ? timeAgo(venue.lastPlayed) : 'Never'}
            sub={venue.lastPlayed ? 'Most recent round' : 'No rounds yet'}
            small
          />
        </View>
        <View style={styles.bestRow}>
          <Icon name="trophy" size={16} color={colors.green} />
          <Text style={styles.bestText} numberOfLines={1}>
            {best ? (
              <>
                Your best: <Text style={styles.bestStrong}>{best.total}</Text> ({formatVsPar(best.vsPar)}) on {best.courseName}
              </>
            ) : (
              'Your best: finish a full round here to set one'
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function Tile({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, small && styles.tileValueSmall]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 22, paddingBottom: 23, overflow: 'hidden', backgroundColor: colors.deep },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subtitle: { marginTop: 5, maxWidth: 300, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sortLabel: { color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.72 },
  chips: { flex: 1, flexDirection: 'row', gap: 5 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: colors.green, backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodySemi },
  chipTextSelected: { color: '#fff' },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 18,
    backgroundColor: '#fff',
    boxShadow: '0 8px 20px rgba(8, 61, 64, 0.06)',
  },
  photo: { width: '100%', aspectRatio: 16 / 6, backgroundColor: '#e9f1e5' },
  placeholder: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.deep },
  placeholderIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.green,
  },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { color: colors.green, fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flex: 1, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  tiles: { flexDirection: 'row', gap: 7, marginTop: 12 },
  tile: { flex: 1, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#edf4e8' },
  tileLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  tileValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24 },
  tileValueSmall: { fontSize: 13 },
  tileSub: { color: '#7f8e86', fontSize: 8, lineHeight: 12, fontFamily: fonts.body },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  bestText: { flex: 1, color: '#5f6f67', fontSize: 10, fontFamily: fonts.body },
  bestStrong: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodyBold },
  // Same as Setup's "Create a new venue" row.
  addRow: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, marginTop: 11, marginLeft: 5, padding: 5 },
  addRowText: { color: colors.green, fontSize: 11, fontFamily: fonts.bodyBold },
  empty: {
    alignItems: 'center',
    padding: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.green,
  },
  emptyTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  emptyCopy: { marginTop: 3, maxWidth: 270, textAlign: 'center', color: '#82908a', fontSize: 10, fontFamily: fonts.body },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: colors.red,
  },
  emptyButtonText: { color: '#fff', fontSize: 11, fontFamily: fonts.bodyBold },
});
