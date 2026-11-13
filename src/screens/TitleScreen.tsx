import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader, Card } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { TitleRail } from '../components/Rails';
import { PALETTES, allTitles, titleById } from '../data/catalog';
import { colors, font, radius, ratingColor } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { formatClock } from '../lib/format';
import { tap } from '../lib/haptics';

export function TitleScreen({ titleId }: { titleId: string }) {
  const {
    t,
    canWatch,
    isFavorite,
    toggleFavorite,
    isInWatchlist,
    toggleWatchlist,
    progressFor,
    episodeProgress,
    settings,
    downloads,
    downloadTitle,
    removeDownload,
    profile,
  } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const title = titleById[titleId];

  if (!title) {
    return (
      <Screen>
        <PageHeader title="Not found" onBack={() => nav.back()} />
        <Text style={styles.bodyText}>That show has wandered off. Try searching for it!</Text>
      </Screen>
    );
  }

  const allowed = canWatch(title);
  const progress = progressFor(title.id);
  const latestEpisode = progress && !progress.completed ? title.episodes.find((e) => e.id === progress.episodeId) : undefined;
  const palette = PALETTES[title.palette % PALETTES.length];
  const small = width < 400;
  const heroWidth = Math.min(width - 40, 1180);
  const download = downloads.find((d) => d.titleId === title.id);

  const play = (episodeId?: string) => {
    if (!allowed) return;
    nav.push({
      name: 'player',
      titleId: title.id,
      episodeId: episodeId ?? latestEpisode?.id ?? title.episodes[0]?.id,
    });
  };

  const more = allTitles
    .filter((other) => other.id !== title.id && other.category === title.category && canWatch(other))
    .sort((a, b) => (a.subcategory === title.subcategory ? -1 : 0) - (b.subcategory === title.subcategory ? -1 : 0))
    .slice(0, 10);
  const captionLabels = Array.from(
    new Set(title.episodes.flatMap((episode) => episode.captions.map((track) => track.label)))
  );

  if (!allowed) {
    return (
      <Screen>
        <PageHeader title={title.name} onBack={() => nav.back()} />
        <View style={styles.locked}>
          <Text style={{ fontSize: 56 }}>🔒</Text>
          <Text style={styles.lockedTitle}>Not for {profile?.name ?? 'this profile'} yet</Text>
          <Text style={styles.bodyText}>
            This title is rated {title.rating}, above the {profile?.ageLimit} level set for this profile. A grown-up can change the
            content level in the parent dashboard.
          </Text>
          <BigButton label={t('parentDashboard')} size="sm" full={false} onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={title.name} onBack={() => nav.back()} />

      <View style={[styles.hero, { width: heroWidth, height: small ? 218 : 270 }]}>
        <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroBlob} />
        <Text style={[styles.heroEmoji, { fontSize: small ? 78 : 118, top: small ? 28 : 40 }]}>{title.emoji}</Text>
        <LinearGradient colors={['rgba(10,4,26,0.85)', 'rgba(10,4,26,0.25)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} />
        <View style={styles.heroContent}>
          <View style={styles.badgeRow}>
            <View style={[styles.ratingBadge, { backgroundColor: ratingColor(title.rating), }]}>
              <Text style={styles.ratingText}>{title.rating}</Text>
            </View>
            <Text style={styles.heroMeta}>
              {title.year} · {title.episodes.length > 1 ? `${title.episodes.length} episodes` : title.category === 'movies' ? 'Short film' : 'Cartoon'} · {title.minutes} min
            </Text>
          </View>
          <Text style={[styles.heroTitle, small && { fontSize: 28, lineHeight: 32, maxWidth: '86%' }]} numberOfLines={2}>{title.name}</Text>
          <View style={styles.tagRow}>
            {title.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <BigButton
          label={latestEpisode ? `Resume · ${latestEpisode.name}` : title.episodes.length > 1 ? 'Play episode 1' : title.category === 'movies' ? 'Play film' : 'Play cartoon'}
          icon="▶"
          onPress={() => play()}
          size="lg"
          style={{ flexGrow: 1, minWidth: 220 }}
        />
        <View style={styles.roundRow}>
          <Pressable
            onPress={() => { tap('success'); toggleFavorite(title.id); }}
            style={[styles.roundAction, isFavorite(title.id) && styles.roundActionOn]}
            accessibilityRole="button"
            accessibilityLabel={isFavorite(title.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Text style={{ fontSize: 19 }}>{isFavorite(title.id) ? '💖' : '🤍'}</Text>
            <Text style={styles.roundLabel}>{isFavorite(title.id) ? 'Saved' : 'Favorite'}</Text>
          </Pressable>
          <Pressable
            onPress={() => { tap(); toggleWatchlist(title.id); }}
            style={[styles.roundAction, isInWatchlist(title.id) && styles.roundActionOn]}
            accessibilityRole="button"
            accessibilityLabel={isInWatchlist(title.id) ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Text style={{ fontSize: 19 }}>{isInWatchlist(title.id) ? '📌' : '＋'}</Text>
            <Text style={styles.roundLabel}>{isInWatchlist(title.id) ? 'Listed' : 'My list'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!settings.downloadsAllowed) return;
              if (download?.status === 'ready') removeDownload(title.id);
              else if (!download || download.status === 'error') downloadTitle(title.id);
            }}
            style={[styles.roundAction, download?.status === 'ready' && styles.roundActionOn, !settings.downloadsAllowed && { opacity: 0.45 }]}
            accessibilityRole="button"
            accessibilityLabel={download?.status === 'ready' ? 'Remove download' : 'Download for offline'}
          >
            <Text style={{ fontSize: 19 }}>{download?.status === 'ready' ? '✅' : '📥'}</Text>
            <Text style={styles.roundLabel}>
              {download?.status === 'downloading'
                ? `${Math.round(download.progress * 100)}%`
                : download?.status === 'ready'
                  ? 'Offline'
                  : download?.status === 'error'
                    ? 'Retry'
                    : settings.downloadsAllowed
                      ? 'Download'
                      : 'Off'}
            </Text>
          </Pressable>
        </View>
        {download?.status === 'error' ? (
          <Text style={styles.downloadNote}>
            Couldn’t save this one. The demo host blocks browser downloads — retry, or use the native app.
          </Text>
        ) : null}
      </View>

      {progress && progress.durationSec > 0 ? (
        <View style={styles.resumeCard}>
          <Text style={styles.resumeText}>
            ⏯️ You stopped at {formatClock(progress.positionSec)} of {formatClock(progress.durationSec)}
            {latestEpisode ? ` · ${latestEpisode.name}` : ''}
          </Text>
        </View>
      ) : null}

      <Card style={styles.about}>
        <Text style={styles.aboutLabel}>ABOUT THIS {title.episodes.length > 1 ? 'SERIES' : title.category === 'movies' ? 'SHORT FILM' : 'CARTOON'}</Text>
        <Text style={styles.aboutText}>{title.description}</Text>
        <Text style={styles.aboutMeta}>
          Ages: {title.rating} · Category: {title.category.replace('-', ' ')} · Audio: English ·{' '}
          {captionLabels.length ? `Captions: ${captionLabels.join(', ')}` : 'Captions: not published for this title'}
        </Text>
      </Card>

      {title.episodes.length > 1 ? (
        <View style={styles.episodes}>
          <Text style={styles.sectionTitle}>🎬 {t('episodes')}</Text>
          {title.episodes.map((ep) => {
            const epProgress = episodeProgress(ep.id);
            const pct = epProgress && epProgress.durationSec ? Math.min(1, epProgress.positionSec / epProgress.durationSec) : 0;
            return (
              <Pressable
                key={ep.id}
                onPress={() => play(ep.id)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${ep.name}`}
                style={({ pressed }) => [styles.epRow, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.epNumber}>
                  <Text style={styles.epNumberText}>{epProgress?.completed ? '✓' : ep.number}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.epName}>{ep.name}</Text>
                  <Text style={styles.epMeta}>
                    {ep.durationMin} min · {epProgress?.completed ? 'Watched' : pct > 0 ? `${Math.round(pct * 100)}% watched` : 'New'}
                  </Text>
                  {pct > 0 && !epProgress?.completed ? (
                    <View style={styles.epTrack}>
                      <View style={[styles.epFill, { width: `${pct * 100}%` }]} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.epPlay}>▶</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TitleRail
        title={t('moreLikeThis')}
        emoji="✨"
        items={more}
        onPress={(next) => nav.replace({ name: 'title', titleId: next.id })}
      />

      <Text style={styles.footer}>
        KidsFlix streams openly licensed demo clips. Replace the media library with your own licensed catalogue before launch.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
    height: 270,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  heroBlob: { position: 'absolute', right: -60, top: -70, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.14)' },
  heroEmoji: { position: 'absolute', right: 16, top: 40, fontSize: 118 },
  heroContent: { padding: 20, gap: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ratingText: { fontFamily: font.bold, fontSize: 10, color: '#12091F' },
  heroMeta: { fontFamily: font.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.9)' },
  heroTitle: { fontFamily: font.display, fontSize: 36, color: colors.white, lineHeight: 40, maxWidth: '78%' },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontFamily: font.semibold, fontSize: 9.5, color: 'rgba(255,255,255,0.9)' },
  actions: { paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  roundRow: { flexDirection: 'row', gap: 10 },
  roundAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  roundActionOn: { borderColor: colors.pink, backgroundColor: 'rgba(255,92,168,0.16)' },
  downloadNote: {
    fontFamily: font.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textDim,
    marginTop: 8,
    maxWidth: 320,
  },
  roundLabel: { fontFamily: font.bold, fontSize: 10.5, color: colors.textDim },
  resumeCard: { marginHorizontal: 20, backgroundColor: 'rgba(124,77,255,0.16)', borderRadius: radius.md, padding: 12, marginBottom: 14 },
  resumeText: { fontFamily: font.semibold, fontSize: 12, color: colors.primarySoft },
  about: { marginHorizontal: 20, marginBottom: 22, gap: 8 },
  aboutLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: colors.textFaint },
  aboutText: { fontFamily: font.body, fontSize: 14, color: colors.text, lineHeight: 21 },
  aboutMeta: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint, lineHeight: 16 },
  episodes: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, marginBottom: 10 },
  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  epNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  epNumberText: { fontFamily: font.displaySoft, fontSize: 15, color: colors.white },
  epName: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  epMeta: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint },
  epTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 3 },
  epFill: { height: '100%', backgroundColor: colors.pink, borderRadius: 2 },
  epPlay: { color: colors.white, fontSize: 14, marginRight: 4 },
  locked: { alignItems: 'center', padding: 26, gap: 12 },
  lockedTitle: { fontFamily: font.displaySoft, fontSize: 23, color: colors.white, textAlign: 'center' },
  bodyText: { fontFamily: font.body, fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 21, paddingHorizontal: 24 },
  footer: { fontFamily: font.medium, fontSize: 10, color: colors.textFaint, textAlign: 'center', paddingHorizontal: 30, marginTop: 4 },
});
