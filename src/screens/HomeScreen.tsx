import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar } from '../components/Screen';
import { HeroBanner } from '../components/HeroBanner';
import { TitleRail } from '../components/Rails';
import { Skeleton, SkeletonRail } from '../components/Skeleton';
import { CATEGORIES, FEATURED, allTitles, titleById } from '../data/catalog';
import { COLLECTIONS, collectionTitles, type Collection } from '../data/collections';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { greeting, timeAgo } from '../lib/format';
import { useResponsive } from '../lib/responsive';

export function HomeScreen() {
  const {
    profile,
    t,
    canWatch,
    continueWatching,
    recommended,
    favoriteTitles,
    isInWatchlist,
    toggleWatchlist,
    progressFor,
    history,
  } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const responsive = useResponsive();
  const contentWidth = responsive.contentWidth;

  const visible = useMemo(() => allTitles.filter(canWatch), [canWatch]);
  const featured = useMemo(() => {
    const list = FEATURED.filter(canWatch);
    return list.length ? list : visible.slice(0, 3);
  }, [canWatch, visible]);
  const hero = featured[0];

  const popular = useMemo(() => [...visible].sort((a, b) => b.popularity - a.popularity).slice(0, 12), [visible]);
  const trending = useMemo(
    () => [...visible].sort((a, b) => b.popularity + (14 - Math.min(14, b.addedDaysAgo)) - (a.popularity + (14 - Math.min(14, a.addedDaysAgo)))).slice(0, 12),
    [visible]
  );
  const recent = useMemo(() => [...visible].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo).slice(0, 12), [visible]);

  const recentlyWatched = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((h) => {
        if (seen.has(h.titleId)) return false;
        const entryTitle = titleById[h.titleId];
        if (!entryTitle || !canWatch(entryTitle)) return false;
        seen.add(h.titleId);
        return true;
      })
      .slice(0, 10)
      .map((h) => ({ title: titleById[h.titleId], at: h.at }));
  }, [history, canWatch]);

  const because = useMemo(() => {
    const seed = recentlyWatched[0]?.title;
    if (!seed) return [];
    const tags = new Set(seed.tags);
    return visible
      .filter((title) => title.id !== seed.id && (title.category === seed.category || title.tags.some((tag) => tags.has(tag))))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);
  }, [recentlyWatched, visible]);

  const learningPicks = useMemo(
    () => visible.filter((title) => title.category === 'learning').sort((a, b) => b.popularity - a.popularity).slice(0, 10),
    [visible]
  );
  const bedtimePicks = useMemo(
    () => visible.filter((title) => title.category === 'bedtime').sort((a, b) => b.popularity - a.popularity).slice(0, 10),
    [visible]
  );

  const featuredCollections = useMemo(
    () =>
      COLLECTIONS.map((collection) => ({ collection, items: collectionTitles(collection).filter(canWatch) })).filter(
        (entry) => entry.items.length > 0
      ),
    [canWatch]
  );

  if (!profile || !hero) {
    return (
      <Screen>
        <TopBar />
        <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 10 }}>
          <Skeleton width={180} height={18} />
          <Skeleton width="78%" height={32} />
          <Skeleton width="100%" height={250} style={{ borderRadius: radius.xl }} />
        </View>
        <SkeletonRail cardWidth={width < 380 ? 136 : 148} />
        <SkeletonRail cardWidth={width < 380 ? 136 : 148} />
      </Screen>
    );
  }

  const openTitle = (id: string) => nav.push({ name: 'title', titleId: id });

  return (
    <Screen>
      <TopBar />

      <View style={[styles.hello, { paddingHorizontal: responsive.gutter }]}>
        <View style={styles.helloRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.helloSmall} numberOfLines={2}>
              {greeting()}, {profile.name}! 👋
            </Text>
            <Text style={[styles.helloBig, { fontSize: responsive.titleSize }]} numberOfLines={2}>
              What shall we watch today?
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => nav.push({ name: 'world' })}
          accessibilityRole="button"
          accessibilityLabel="Open my cartoon world"
          style={({ pressed }) => [styles.worldCard, { opacity: pressed ? 0.86 : 1 }]}
        >
          <LinearGradient colors={['rgba(255,92,168,0.55)', 'rgba(124,77,255,0.5)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 25 }}>🌈</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.worldTitle}>My Cartoon World</Text>
            <Text style={styles.worldSub} numberOfLines={1}>Your buddy, favourite worlds and watchlist</Text>
          </View>
          <Text style={styles.worldArrow}>›</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: responsive.gutter }}>
        <HeroBanner
          title={hero}
          width={contentWidth}
          favorite={isInWatchlist(hero.id)}
          resume={Boolean(progressFor(hero.id))}
          onPlay={() => nav.push({ name: 'player', titleId: hero.id, episodeId: progressFor(hero.id)?.episodeId })}
          onList={() => toggleWatchlist(hero.id)}
        />
        {featured.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dots} style={{ marginTop: 10 }}>
            {featured.slice(1).map((f) => (
              <Pressable key={f.id} onPress={() => openTitle(f.id)} style={styles.nextHero}>
                <Text style={{ fontSize: 14 }}>{f.emoji}</Text>
                <Text style={styles.nextHeroText} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.nextHeroArrow}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ height: 22 }} />

      {continueWatching.length ? (
        <TitleRail
          title={t('continueWatching')}
          emoji="⏯️"
          items={continueWatching.map((c) => c.title)}
          onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
          progressFor={(title) => {
            const c = continueWatching.find((x) => x.title.id === title.id);
            return c && c.durationSec ? c.positionSec / c.durationSec : undefined;
          }}
          subtitleFor={(title) => {
            const c = continueWatching.find((x) => x.title.id === title.id);
            if (!c) return undefined;
            const ep = c.title.episodes.find((e) => e.id === c.episodeId);
            const mins = Math.max(1, Math.round((c.durationSec - c.positionSec) / 60));
            return `${ep ? `E${ep.number} · ` : ''}${mins} min left`;
          }}
        />
      ) : null}

      <View style={styles.exploreBlock}>
        <Text style={styles.exploreTitle}>✨ {t('funZone')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: responsive.gutter, gap: 12 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => nav.push({ name: 'category', category: cat.id })}
              accessibilityRole="button"
              accessibilityLabel={cat.name}
              style={({ pressed }) => [styles.catCard, { opacity: pressed ? 0.82 : 1 }]}
            >
              <LinearGradient colors={cat.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 30 }}>{cat.emoji}</Text>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catCount}>{visible.filter((v) => v.category === cat.id).length} titles</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {featuredCollections.length ? (
        <View style={styles.collectionsBlock}>
          <Text style={styles.exploreTitle}>🧺 Featured collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: responsive.gutter, gap: 12 }}>
            {featuredCollections.map(({ collection, items }) => (
              <CollectionCard key={collection.id} collection={collection} count={items.length} onPress={() => nav.push({ name: 'collection', collectionId: collection.id })} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <TitleRail title="Trending this week" emoji="📈" items={trending} onPress={(title) => openTitle(title.id)} />
      <TitleRail title={t('popular')} emoji="🔥" items={popular} onPress={(title) => openTitle(title.id)} onSeeAll={() => nav.push({ name: 'category', category: 'cartoons' })} />
      <TitleRail title="New arrivals" emoji="🎁" items={recent} onPress={(title) => openTitle(title.id)} />
      <TitleRail title={t('recommended')} emoji="🪄" items={recommended} onPress={(title) => openTitle(title.id)} subtitleFor={(title) => (title.tags[0] ? `#${title.tags[0]}` : undefined)} />

      {because.length ? <TitleRail title="Because you watched" emoji="🎬" items={because} onPress={(title) => openTitle(title.id)} /> : null}

      <TitleRail title="Learning recommendations" emoji="🧠" items={learningPicks} onPress={(title) => openTitle(title.id)} onSeeAll={() => nav.push({ name: 'category', category: 'learning' })} />
      <TitleRail title="Bedtime picks" emoji="🌙" items={bedtimePicks} onPress={(title) => openTitle(title.id)} onSeeAll={() => nav.push({ name: 'category', category: 'bedtime' })} />

      <TitleRail title={t('recentlyAdded')} emoji="🆕" items={recent} onPress={(title) => openTitle(title.id)} />

      {favoriteTitles.length ? (
        <TitleRail title={t('favoriteShows')} emoji="💖" items={favoriteTitles} onPress={(title) => openTitle(title.id)} onSeeAll={() => nav.setTab('favorites')} />
      ) : null}

      {recentlyWatched.length ? (
        <View style={styles.recentBlock}>
          <Text style={styles.recentHeading}>🕒 {t('recentlyWatched')}</Text>
          <View style={{ paddingHorizontal: responsive.gutter, gap: 8 }}>
            {recentlyWatched.slice(0, 4).map(({ title, at }) => (
              <Pressable key={title.id} onPress={() => openTitle(title.id)} style={({ pressed }) => [styles.recentRow, { opacity: pressed ? 0.8 : 1 }]}>
                <View style={[styles.recentThumb, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={{ fontSize: 24 }}>{title.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.recentName} numberOfLines={1}>{title.name}</Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {title.category === 'learning' ? 'Learning' : 'Watched'} · {timeAgo(at)}
                  </Text>
                </View>
                <Text style={styles.recentPlay}>▶️</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.footer}>Made with 💜 for little dreamers · KidsFlix</Text>
    </Screen>
  );
}

function CollectionCard({ collection, count, onPress }: { collection: Collection; count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${collection.name} collection`}
      style={({ pressed }) => [styles.collectionCard, { opacity: pressed ? 0.84 : 1 }]}
    >
      <LinearGradient colors={collection.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={{ fontSize: 30 }}>{collection.emoji}</Text>
      <Text style={styles.collectionName} numberOfLines={2}>{collection.name}</Text>
      <Text style={styles.collectionCount}>{count} titles ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hello: { paddingTop: 4, paddingBottom: 16, gap: 12 },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helloSmall: { fontFamily: font.semibold, fontSize: 15, color: colors.textDim },
  helloBig: { fontFamily: font.display, color: colors.white, lineHeight: 34 },
  worldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  worldTitle: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  worldSub: { fontFamily: font.medium, fontSize: 10.5, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
  worldArrow: { fontFamily: font.bold, fontSize: 24, color: colors.white },
  dots: { gap: 8, paddingHorizontal: 2, paddingVertical: 2 },
  nextHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 190,
  },
  nextHeroText: { fontFamily: font.semibold, fontSize: 12, color: colors.textDim, flexShrink: 1 },
  nextHeroArrow: { fontFamily: font.bold, fontSize: 16, color: colors.textFaint },
  exploreBlock: { marginBottom: 26 },
  exploreTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, paddingHorizontal: 20, marginBottom: 12 },
  catCard: { width: 148, height: 118, borderRadius: radius.lg, padding: 14, justifyContent: 'flex-end', overflow: 'hidden', gap: 2 },
  catName: { fontFamily: font.bold, fontSize: 14, color: colors.white, lineHeight: 17 },
  catCount: { fontFamily: font.semibold, fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  collectionsBlock: { marginBottom: 26 },
  collectionCard: { width: 180, height: 132, borderRadius: radius.lg, padding: 14, justifyContent: 'flex-end', overflow: 'hidden', gap: 3 },
  collectionName: { fontFamily: font.bold, fontSize: 13.5, color: colors.white, lineHeight: 17 },
  collectionCount: { fontFamily: font.semibold, fontSize: 10, color: 'rgba(255,255,255,0.84)' },
  recentBlock: { marginBottom: 20 },
  recentHeading: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, paddingHorizontal: 20, marginBottom: 12 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentThumb: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  recentMeta: { fontFamily: font.medium, fontSize: 11, color: colors.textDim, marginTop: 2 },
  recentPlay: { fontSize: 18, marginRight: 6 },
  footer: { textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.textFaint, marginTop: 12, marginBottom: 10 },
});
