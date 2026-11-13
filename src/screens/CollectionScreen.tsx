import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader, EmptyState } from '../components/Screen';
import { TitleGrid } from '../components/Rails';
import { COLLECTION_MAP, collectionTitles } from '../data/collections';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { useResponsive } from '../lib/responsive';

export function CollectionScreen({ collectionId }: { collectionId: string }) {
  const collection = COLLECTION_MAP[collectionId];
  const { canWatch } = useApp();
  const nav = useNav();
  const responsive = useResponsive();

  const items = useMemo(
    () => (collection ? collectionTitles(collection).filter(canWatch) : []),
    [collection, canWatch]
  );

  if (!collection) {
    return (
      <Screen>
        <PageHeader title="Collection" onBack={() => nav.back()} />
        <EmptyState emoji="🧺" title="This collection has wandered off" body="Pick another collection from home." />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={collection.name} subtitle={collection.blurb} onBack={() => nav.back()} />
      <View style={[styles.banner, { width: responsive.contentWidth }]}>
        <LinearGradient colors={collection.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerText}>
          <Text style={{ fontSize: 34 }}>{collection.emoji}</Text>
          <Text style={styles.bannerTitle} numberOfLines={2}>{collection.name}</Text>
          <Text style={styles.bannerMeta}>{items.length} titles for this profile</Text>
        </View>
        <Text style={styles.bannerArt}>{collection.emoji}</Text>
      </View>

      <TitleGrid
        items={items}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        empty={<EmptyState emoji="🔒" title="Nothing here for this age level" body="A grown-up can change the content level in the parent dashboard." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    minHeight: 142,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 18,
  },
  bannerText: { flex: 1, minWidth: 0, gap: 4 },
  bannerTitle: { fontFamily: font.display, fontSize: 27, color: colors.white, lineHeight: 32 },
  bannerMeta: { fontFamily: font.semibold, fontSize: 12, color: 'rgba(255,255,255,0.86)' },
  bannerArt: { fontSize: 64, opacity: 0.9, marginLeft: 8 },
});
