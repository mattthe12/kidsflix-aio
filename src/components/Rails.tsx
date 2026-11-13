import React from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Title } from '../types';
import { Poster } from './Poster';
import { SectionHeader } from './Logo';
import { colors, layoutFor, spacing } from '../theme';
import { useResponsive } from '../lib/responsive';
import { useApp } from '../state/AppProvider';

export function TitleRail({
  title,
  emoji,
  items,
  onPress,
  onSeeAll,
  progressFor,
  subtitleFor,
  seeAllLabel = 'See all',
}: {
  title: string;
  emoji?: string;
  items: Title[];
  onPress: (title: Title) => void;
  onSeeAll?: () => void;
  progressFor?: (title: Title) => number | undefined;
  subtitleFor?: (title: Title) => string | undefined;
  seeAllLabel?: string;
}) {
  const { width } = useWindowDimensions();
  const { settings } = useApp();
  const dims = layoutFor(width);
  const cardWidth = width < 380 ? 136 : dims.kind === 'tv' ? 218 : dims.kind === 'tablet' ? 180 : 148;
  if (!items.length) return null;

  return (
    <View style={styles.block}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} emoji={emoji} actionLabel={onSeeAll ? seeAllLabel : undefined} onAction={onSeeAll} />
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: spacing.sm }}
        initialNumToRender={5}
        windowSize={5}
        renderItem={({ item }) => (
          <Poster
            title={item}
            width={cardWidth}
            onPress={() => onPress(item)}
            progress={progressFor?.(item)}
            subtitle={subtitleFor?.(item)}
          />
        )}
      />
    </View>
  );
}

export function TitleGrid({
  items,
  onPress,
  empty,
}: {
  items: Title[];
  onPress: (title: Title) => void;
  empty?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const responsive = useResponsive();
  const horizontal = responsive.gutter;
  const gap = 12;
  const available = Math.max(0, responsive.contentWidth);
  const cols = width < 520 ? 2 : width < 760 ? 3 : width < 1024 ? 4 : width < 1440 ? 5 : 6;
  const cardWidth = Math.max(0, (available - gap * (cols - 1)) / cols);

  if (!items.length) return <>{empty ?? null}</>;

  return (
    <View style={[styles.grid, { paddingHorizontal: horizontal, gap }]}>
      {items.map((item) => (
        <Poster key={item.id} title={item} width={cardWidth} onPress={() => onPress(item)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 26 },
  headerPad: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  hint: { color: colors.textFaint, fontSize: 12 },
});
