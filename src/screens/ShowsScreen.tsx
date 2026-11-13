import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar, EmptyState } from '../components/Screen';
import { Chip } from '../components/BigButton';
import { TitleGrid } from '../components/Rails';
import { CATEGORIES, allTitles } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import type { CategoryId } from '../types';

export function ShowsScreen() {
  const { t, canWatch } = useApp();
  const nav = useNav();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');

  const visible = useMemo(() => allTitles.filter(canWatch), [canWatch]);
  const items = useMemo(
    () =>
      [...visible]
        .filter((title) => filter === 'all' || title.category === filter)
        .sort((a, b) => b.popularity - a.popularity),
    [visible, filter]
  );

  return (
    <Screen>
      <TopBar />
      <View style={styles.heading}>
        <Text style={styles.title}>Shows & movies</Text>
        <Text style={styles.subtitle}>Pick a world to dive into 🌈</Text>
      </View>

      <Pressable onPress={() => nav.push({ name: 'search' })} style={styles.searchBar} accessibilityRole="search">
        <Text style={{ fontSize: 18 }}>🔍</Text>
        <Text style={styles.searchText}>{t('searchPlaceholder')}</Text>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => nav.push({ name: 'category', category: cat.id })}
            style={({ pressed }) => [styles.catCard, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient colors={cat.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={{ fontSize: 26 }}>{cat.emoji}</Text>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catSub}>{cat.subcategories.length} collections ›</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <Chip label="Everything" emoji="✨" active={filter === 'all'} onPress={() => setFilter('all')} />
          {CATEGORIES.map((cat) => (
            <Chip key={cat.id} label={cat.name} emoji={cat.emoji} active={filter === cat.id} onPress={() => setFilter(cat.id)} />
          ))}
        </ScrollView>
      </View>

      <Text style={styles.count}>{items.length} titles for {filter === 'all' ? 'you' : CATEGORIES.find((c) => c.id === filter)?.name.toLowerCase()}</Text>

      <TitleGrid
        items={items}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        empty={<EmptyState emoji="🧸" title="Nothing here yet" body="Try another category." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  title: { fontFamily: font.display, fontSize: 32, color: colors.white },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.textDim, marginTop: 2 },
  searchBar: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 18,
  },
  searchText: { fontFamily: font.medium, fontSize: 14, color: colors.textFaint },
  catRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },
  catCard: { width: 160, height: 104, borderRadius: radius.lg, padding: 14, justifyContent: 'flex-end', overflow: 'hidden', gap: 2 },
  catName: { fontFamily: font.bold, fontSize: 13.5, color: colors.white },
  catSub: { fontFamily: font.semibold, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  filters: { marginBottom: 10 },
  count: { fontFamily: font.semibold, fontSize: 12, color: colors.textFaint, paddingHorizontal: 22, marginBottom: 12 },
});
