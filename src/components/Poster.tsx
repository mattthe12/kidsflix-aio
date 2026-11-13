import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Title } from '../types';
import { PALETTES } from '../data/catalog';
import { colors, font, radius, ratingColor } from '../theme';
import { tap } from '../lib/haptics';

type Variant = 'poster' | 'wide' | 'square';

export function Poster({
  title,
  width,
  variant = 'poster',
  progress,
  subtitle,
  onPress,
  style,
}: {
  title: Title;
  width: number;
  variant?: Variant;
  progress?: number;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const aspect = variant === 'poster' ? 0.66 : variant === 'wide' ? 1.6 : 1;
  const height = width / aspect;
  const colors2 = PALETTES[title.palette % PALETTES.length];
  const emojiSize = variant === 'poster' ? width * 0.42 : height * 0.44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title.name}, rated ${title.rating}`}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.975 : 1 }] }, style]}
    >
      <View style={[styles.art, { width, height, borderRadius: variant === 'poster' ? radius.md : radius.lg }]}>
        <LinearGradient colors={colors2} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.blob, styles.blobOne]} />
        <View style={[styles.blob, styles.blobTwo]} />
        <View style={styles.emojiWrap}>
          <Text style={{ fontSize: emojiSize }}>{title.emoji}</Text>
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(10,5,25,0.15)', 'rgba(10,5,25,0.88)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={styles.ratingBadge}>
          <View style={[styles.ratingDot, { backgroundColor: ratingColor(title.rating) }]} />
          <Text style={styles.ratingText}>{title.rating}</Text>
        </View>
        <View style={styles.meta}>
          <Text numberOfLines={2} style={[styles.name, { fontSize: variant === 'poster' ? 15 : 17 }]}>
            {title.name}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
          {typeof progress === 'number' ? (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: { overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  blobOne: { width: '80%', aspectRatio: 1, top: '-20%', right: '-25%' },
  blobTwo: { width: '55%', aspectRatio: 1, bottom: '8%', left: '-18%', backgroundColor: 'rgba(255,255,255,0.1)' },
  emojiWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,4,24,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  ratingDot: { width: 6, height: 6, borderRadius: 3 },
  ratingText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  meta: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 4 },
  name: { color: colors.white, fontFamily: font.bold, lineHeight: 19 },
  subtitle: { color: colors.textDim, fontFamily: font.semibold, fontSize: 11 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 3 },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.pink },
});
