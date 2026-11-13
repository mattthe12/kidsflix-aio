import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader, EmptyState, Card } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { EmojiPicker } from '../components/EmojiPicker';
import { TitleRail, TitleGrid } from '../components/Rails';
import { CATEGORY_MAP, titleById } from '../data/catalog';
import { AVATARS } from '../data/avatars';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { timeAgo } from '../lib/format';
import { tap } from '../lib/haptics';
import type { CategoryId } from '../types';

export function MyWorldScreen() {
  const {
    profile,
    updateProfile,
    favorites,
    favoriteTitles,
    watchlist,
    history,
    recommended,
    canWatch,
    watchedMinutesToday,
  } = useApp();
  const nav = useNav();
  const [avatar, setAvatar] = useState(profile?.avatar ?? 'fox');
  const [characters, setCharacters] = useState<string[]>(profile?.favoriteCharacters ?? []);
  const [saved, setSaved] = useState(false);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((entry) => {
        if (seen.has(entry.titleId)) return false;
        const title = titleById[entry.titleId];
        if (!title || !canWatch(title)) return false;
        seen.add(entry.titleId);
        return true;
      })
      .slice(0, 8)
      .map((entry) => ({ title: titleById[entry.titleId], at: entry.at }));
  }, [history, canWatch]);

  const topCategories = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    const add = (id: string) => {
      const title = titleById[id];
      if (!title || !canWatch(title)) return;
      counts.set(title.category, (counts.get(title.category) ?? 0) + 1);
    };
    favorites.forEach(add);
    history.forEach((entry) => add(entry.titleId));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ category: CATEGORY_MAP[id], count }));
  }, [favorites, history, canWatch]);

  const watchlistTitles = useMemo(
    () => watchlist.map((id) => titleById[id]).filter((title) => title && canWatch(title)),
    [watchlist, canWatch]
  );

  if (!profile) return null;

  return (
    <Screen>
      <PageHeader title="My Cartoon World" subtitle="Your buddies, your favourites, your little universe" onBack={() => nav.back()} />

      <View style={styles.hero}>
        <LinearGradient colors={['rgba(255,92,168,0.35)', 'rgba(124,77,255,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Avatar avatarId={profile.avatar} size={92} />
        <View style={styles.heroText}>
          <Text style={styles.heroName} numberOfLines={1}>{profile.name}’s world</Text>
          <Text style={styles.heroSub}>{watchedMinutesToday} min watched today · {favoriteTitles.length} favourites · {watchlistTitles.length} on the watchlist</Text>
          <Text style={styles.heroSub}>Every pick below follows the {profile.ageLimit} content level.</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardLabel}>MY CARTOON BUDDY</Text>
        <EmojiPicker
          value={avatar}
          onChange={(id) => {
            setAvatar(id);
            setSaved(false);
          }}
        />
        <Text style={styles.cardLabel}>FAVOURITE CHARACTERS · UP TO 4</Text>
        <View style={styles.characterRow}>
          {AVATARS.map((character) => {
            const picked = characters.includes(character.id);
            return (
              <Pressable
                key={character.id}
                onPress={() => {
                  tap();
                  setSaved(false);
                  setCharacters((current) =>
                    current.includes(character.id)
                      ? current.filter((id) => id !== character.id)
                      : current.length >= 4
                        ? current
                        : [...current, character.id]
                  );
                }}
                accessibilityRole="checkbox"
                accessibilityLabel={`Favourite character ${character.label}`}
                accessibilityState={{ checked: picked }}
                style={[styles.characterChip, picked && styles.characterChipOn]}
              >
                <LinearGradient colors={character.colors} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 23 }}>{character.emoji}</Text>
                {picked ? <Text style={styles.characterCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.saveRow}>
          <Text style={styles.saveHint}>{saved ? '✓ Your world is saved' : 'Pick a buddy and characters, then save your look.'}</Text>
          <BigButton
            label={saved ? 'Saved' : 'Save my look'}
            size="sm"
            full={false}
            onPress={() => {
              tap('success');
              updateProfile(profile.id, { avatar, favoriteCharacters: characters });
              setSaved(true);
            }}
          />
        </View>
      </Card>

      <Text style={styles.sectionLabel}>MY FAVOURITE WORLDS</Text>
      {topCategories.length ? (
        <View style={styles.categoryRow}>
          {topCategories.map(({ category, count }) => (
            <Pressable
              key={category.id}
              onPress={() => nav.push({ name: 'category', category: category.id })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${category.name}`}
              style={({ pressed }) => [styles.categoryCard, { opacity: pressed ? 0.82 : 1 }]}
            >
              <LinearGradient colors={category.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={{ fontSize: 26 }}>{category.emoji}</Text>
              <Text style={styles.categoryName} numberOfLines={2}>{category.name}</Text>
              <Text style={styles.categoryCount}>{count} loved</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyHint}>Watch or favourite a few cartoons and your favourite worlds will appear here.</Text>
      )}

      {favoriteTitles.length ? (
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>💖 My favourites</Text>
          <TitleGrid items={favoriteTitles} onPress={(title) => nav.push({ name: 'title', titleId: title.id })} />
        </View>
      ) : null}

      {watchlistTitles.length ? (
        <TitleRail title="My watchlist" emoji="📌" items={watchlistTitles} onPress={(title) => nav.push({ name: 'title', titleId: title.id })} />
      ) : null}

      {recent.length ? (
        <TitleRail
          title="Recently watched"
          emoji="🕒"
          items={recent.map((item) => item.title)}
          onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
          subtitleFor={(title) => timeAgo(recent.find((item) => item.title.id === title.id)?.at ?? Date.now())}
        />
      ) : null}

      {recommended.length ? (
        <TitleRail
          title="Because you like these"
          emoji="🪄"
          items={recommended.filter((title) => !favorites.includes(title.id)).slice(0, 10)}
          onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        />
      ) : null}

      {!favoriteTitles.length && !watchlistTitles.length && !recent.length ? (
        <EmptyState
          emoji="🌱"
          title="Your world is just starting"
          body="Explore a cartoon and tap the heart to make this place yours."
          actionLabel="Explore cartoons"
          onAction={() => nav.setTab('shows')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  heroText: { flex: 1, minWidth: 0, gap: 3 },
  heroName: { fontFamily: font.display, fontSize: 25, color: colors.white },
  heroSub: { fontFamily: font.medium, fontSize: 11.5, color: colors.textDim, lineHeight: 16 },
  card: { marginHorizontal: 20, marginBottom: 20, gap: 12 },
  cardLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: colors.textFaint },
  characterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  characterChip: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent' },
  characterChipOn: { borderColor: colors.white },
  characterCheck: { position: 'absolute', right: 3, bottom: 2, fontSize: 11, color: colors.white, fontFamily: font.bold },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  saveHint: { fontFamily: font.medium, fontSize: 11.5, color: colors.textFaint, flexShrink: 1 },
  sectionLabel: { fontFamily: font.bold, fontSize: 12, color: colors.textFaint, marginLeft: 24, marginBottom: 8, letterSpacing: 0.5 },
  sectionTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, paddingHorizontal: 20, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  categoryCard: { flexGrow: 1, minWidth: 100, maxWidth: 180, flexBasis: 100, height: 112, borderRadius: radius.lg, padding: 13, justifyContent: 'flex-end', overflow: 'hidden', gap: 2 },
  categoryName: { fontFamily: font.bold, fontSize: 13, color: colors.white, lineHeight: 16 },
  categoryCount: { fontFamily: font.semibold, fontSize: 10, color: 'rgba(255,255,255,0.82)' },
  emptyHint: { fontFamily: font.body, fontSize: 12.5, color: colors.textFaint, paddingHorizontal: 24, marginBottom: 18, lineHeight: 18 },
  gridSection: { marginBottom: 24 },
});
