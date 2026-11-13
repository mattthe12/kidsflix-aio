import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader } from '../components/Screen';
import { Chip } from '../components/BigButton';
import { TitleRail, TitleGrid } from '../components/Rails';
import { SectionHeader } from '../components/Logo';
import { CATEGORY_MAP, titlesInCategory, titlesInSub } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import type { CategoryId, SubcategoryId } from '../types';

export function CategoryScreen({ category, subcategory }: { category: CategoryId; subcategory?: SubcategoryId }) {
  const { t, canWatch } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const small = width < 430;
  const cat = CATEGORY_MAP[category];
  const [activeSub, setActiveSub] = useState<SubcategoryId | 'all'>(subcategory ?? 'all');

  const all = useMemo(() => titlesInCategory(category).filter(canWatch), [category, canWatch]);
  const filtered = useMemo(
    () => (activeSub === 'all' ? all : titlesInSub(category, activeSub).filter(canWatch)),
    [activeSub, all, category, canWatch]
  );

  const hero = filtered[0];

  return (
    <Screen>
      <PageHeader title={cat.name} subtitle={cat.blurb} onBack={() => nav.back()} />

      <View style={[styles.banner, { width: Math.min(width - 40, 1180), height: small ? 126 : 150 }]}>
        <LinearGradient colors={cat.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerEmoji}>{cat.emoji}</Text>
          <Text style={[styles.bannerTitle, small && { fontSize: 24, lineHeight: 28 }]} numberOfLines={2}>{cat.name}</Text>
          <Text style={styles.bannerSub}>{all.length} titles · {cat.subcategories.length} collections</Text>
        </View>
        <Text style={[styles.bannerArt, { fontSize: small ? 48 : 78 }]}>{hero?.emoji ?? cat.emoji}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t('allShows')} active={activeSub === 'all'} onPress={() => setActiveSub('all')} />
        {cat.subcategories.map((sub) => (
          <Chip key={sub.id} label={sub.name} emoji={sub.emoji} active={activeSub === sub.id} onPress={() => setActiveSub(sub.id)} />
        ))}
      </ScrollView>

      {activeSub !== 'all' ? (
        <View style={styles.gridWrap}>
          <TitleGrid items={filtered} onPress={(title) => nav.push({ name: 'title', titleId: title.id })} />
        </View>
      ) : (
        <View>
          {cat.subcategories.map((sub) => {
            const items = titlesInSub(category, sub.id).filter(canWatch);
            if (!items.length) return null;
            return (
              <TitleRail
                key={sub.id}
                title={sub.name}
                emoji={sub.emoji}
                items={items}
                onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
                onSeeAll={() => setActiveSub(sub.id)}
              />
            );
          })}
        </View>
      )}

      {!filtered.length ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 50 }}>🧸</Text>
          <Text style={styles.emptyText}>Nothing here for this age level yet.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    height: 150,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  bannerText: { gap: 3, flex: 1 },
  bannerEmoji: { fontSize: 26 },
  bannerTitle: { fontFamily: font.display, fontSize: 30, color: colors.white },
  bannerSub: { fontFamily: font.semibold, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  bannerArt: { fontSize: 78 },
  chips: { paddingHorizontal: 20, paddingBottom: 18 },
  gridWrap: { marginBottom: 20 },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontFamily: font.semibold, fontSize: 14, color: colors.textDim },
});
