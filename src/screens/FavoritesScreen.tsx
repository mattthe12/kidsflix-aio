import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar, EmptyState } from '../components/Screen';
import { SectionHeader } from '../components/Logo';
import { TitleRail, TitleGrid } from '../components/Rails';
import { titleById } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { timeAgo } from '../lib/format';

export function FavoritesScreen() {
  const { t, favoriteTitles, watchlist, history, downloads, canWatch, profile } = useApp();
  const nav = useNav();

  const watchlistTitles = useMemo(
    () => watchlist.map((id) => titleById[id]).filter((title) => title && canWatch(title)),
    [watchlist, canWatch]
  );

  const recent = useMemo(() => {
    if (!profile) return [];
    const seen = new Set<string>();
    return history
      .filter((h) => {
        if (seen.has(h.titleId)) return false;
        const title = titleById[h.titleId];
        if (!title || !canWatch(title)) return false;
        seen.add(h.titleId);
        return true;
      })
      .slice(0, 8)
      .map((h) => ({ title: titleById[h.titleId], at: h.at }));
  }, [history, canWatch, profile]);

  const readyDownloads = downloads.filter((d) => d.status === 'ready').length;

  return (
    <Screen>
      <TopBar />
      <View style={styles.heading}>
        <Text style={styles.title}>{t('favorites')} 💖</Text>
        <Text style={styles.subtitle}>Everything you loved, saved in one cosy place.</Text>
      </View>

      <Pressable onPress={() => nav.push({ name: 'downloads' })} style={styles.downloadCard} accessibilityRole="button">
        <LinearGradient colors={['#3FE0B0', '#3EA8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 34 }}>📥</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.downloadTitle}>{t('downloads')}</Text>
          <Text style={styles.downloadSub}>
            {readyDownloads ? `${readyDownloads} ready to watch offline` : 'Save a show for the car or the plane'}
          </Text>
        </View>
        <Text style={styles.downloadArrow}>›</Text>
      </Pressable>

      {favoriteTitles.length ? (
        <View style={styles.section}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader title={t('favoriteShows')} emoji="❤️" actionLabel={`${favoriteTitles.length}`} />
          </View>
          <TitleGrid items={favoriteTitles} onPress={(title) => nav.push({ name: 'title', titleId: title.id })} />
        </View>
      ) : null}

      {watchlistTitles.length ? (
        <TitleRail
          title={t('watchlist')}
          emoji="📌"
          items={watchlistTitles}
          onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        />
      ) : null}

      {recent.length ? (
        <TitleRail
          title={t('recentlyWatched')}
          emoji="🕒"
          items={recent.map((r) => r.title)}
          onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
          subtitleFor={(title) => timeAgo(recent.find((r) => r.title.id === title.id)?.at ?? Date.now())}
        />
      ) : null}

      {!favoriteTitles.length && !watchlistTitles.length && !recent.length ? (
        <EmptyState
          emoji="🫶"
          title="Nothing saved yet"
          body={t('favoritesEmpty')}
          actionLabel="Find something fun"
          onAction={() => nav.setTab('shows')}
        />
      ) : null}

      {!favoriteTitles.length && (watchlistTitles.length || recent.length) ? (
        <EmptyState emoji="💗" title="Tap a heart to add favourites" body={t('favoritesEmpty')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: 20, paddingBottom: 18 },
  title: { fontFamily: font.display, fontSize: 32, color: colors.white },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.textDim, marginTop: 2 },
  downloadCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  downloadTitle: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  downloadSub: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  downloadArrow: { fontFamily: font.bold, fontSize: 28, color: colors.white },
  section: { marginBottom: 26 },
});
