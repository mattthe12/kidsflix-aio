import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, PageHeader, EmptyState } from '../components/Screen';
import { Chip } from '../components/BigButton';
import { TitleGrid } from '../components/Rails';
import { CATEGORIES, searchCatalog, suggestedQueries } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { storage } from '../lib/storage';
import { useResponsive } from '../lib/responsive';
import type { CategoryId } from '../types';

export function SearchScreen() {
  const { t, canWatch, profile } = useApp();
  const nav = useNav();
  const responsive = useResponsive();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const historyKey = `@kidsflixaio/search-history/${profile?.id ?? 'guest'}`;

  useEffect(() => {
    let alive = true;
    storage.get<string[]>(historyKey).then((saved) => {
      if (alive && Array.isArray(saved)) setRecentSearches(saved.slice(0, 8));
    });
    return () => {
      alive = false;
    };
  }, [historyKey]);

  const remember = useCallback(
    (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      setRecentSearches((current) => {
        const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
        storage.set(historyKey, next);
        return next;
      });
    },
    [historyKey]
  );

  const results = useMemo(
    () => searchCatalog(query, category).filter(canWatch),
    [query, category, canWatch]
  );

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return results.slice(0, 5).map((r) => r.name);
  }, [query, results]);

  return (
    <Screen>
      <PageHeader title={t('search')} subtitle="Movies, shows, songs and lessons" onBack={() => nav.back()} />

      <View style={[styles.searchWrap, { paddingHorizontal: responsive.gutter }]}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            accessibilityLabel={t('search')}
            onSubmitEditing={() => remember(query)}
          />
          {query ? (
            <Text
              onPress={() => setQuery('')}
              style={styles.clear}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              ✕
            </Text>
          ) : null}
        </View>
      </View>

      {!query.trim() ? (
        <View style={styles.suggestions}>
          {recentSearches.length ? (
            <>
              <View style={styles.historyHeader}>
                <Text style={styles.suggestLabel}>🕒 Recent searches</Text>
                <Pressable
                  onPress={() => {
                    setRecentSearches([]);
                    storage.remove(historyKey);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                  hitSlop={8}
                >
                  <Text style={styles.clearHistory}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {recentSearches.map((search) => (
                  <Chip key={search} label={search} onPress={() => setQuery(search)} />
                ))}
              </View>
            </>
          ) : null}
          <Text style={styles.suggestLabel}>✨ Try searching for</Text>
          <View style={styles.chips}>
            {suggestedQueries().map((s) => (
              <Chip key={s} label={s} onPress={() => { remember(s); setQuery(s); }} />
            ))}
          </View>
        </View>
      ) : suggestions.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} active={s === query} onPress={() => { remember(s); setQuery(s); }} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="All" active={category === 'all'} onPress={() => setCategory('all')} />
        {CATEGORIES.map((cat) => (
          <Chip key={cat.id} label={cat.name} emoji={cat.emoji} active={category === cat.id} onPress={() => setCategory(cat.id)} />
        ))}
      </ScrollView>

      <Text style={styles.count}>
        {query.trim() ? `${results.length} result${results.length === 1 ? '' : 's'} for “${query.trim()}”` : `${results.length} titles to explore`}
      </Text>

      <TitleGrid
        items={results}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        empty={<EmptyState emoji="🔎" title={t('noResults')} body="Try a shorter word, or pick a category above." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { marginBottom: 16 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearHistory: { fontFamily: font.bold, fontSize: 12, color: colors.textFaint, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    paddingHorizontal: 18,
    height: 56,
  },
  input: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.white, outlineStyle: 'none' } as object,
  clear: { color: colors.textDim, fontSize: 18, padding: 4 },
  suggestLabel: { fontFamily: font.bold, fontSize: 13, color: colors.textFaint, marginBottom: 10 },
  suggestions: { paddingHorizontal: 20, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionRow: { paddingHorizontal: 20, marginBottom: 8 },
  filters: { paddingHorizontal: 20, paddingVertical: 10 },
  count: { fontFamily: font.semibold, fontSize: 12, color: colors.textFaint, paddingHorizontal: 22, marginBottom: 12 },
});
