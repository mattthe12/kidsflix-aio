import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Title } from '../types';
import { PALETTES } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { BigButton } from './BigButton';

export function HeroBanner({
  title,
  width,
  favorite,
  onPlay,
  onList,
  resume,
}: {
  title: Title;
  width: number;
  favorite?: boolean;
  onPlay: () => void;
  onList?: () => void;
  resume?: boolean;
}) {
  const small = width < 400;
  const height = small ? 238 : width > 720 ? 330 : width > 460 ? 290 : 262;
  const palette = PALETTES[title.palette % PALETTES.length];
  const emojiSize = Math.min(width * (small ? 0.29 : 0.36), height * 1.05);
  const titleSize = small ? 26 : width > 720 ? 36 : 32;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { width: height * 1.1, height: height * 1.1, borderRadius: height }]} />
      <View style={styles.ring} />
      <View style={styles.emojiLayer} pointerEvents="none">
        <Text style={{ fontSize: emojiSize }}>{title.emoji}</Text>
      </View>
      <LinearGradient
        colors={['rgba(10,4,26,0.88)', 'rgba(10,4,26,0.55)', 'rgba(10,4,26,0.05)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, small && { padding: 16, maxWidth: '78%' }]}>
        <View style={styles.badgeRow}>
          <View style={styles.originalBadge}>
            <Text style={styles.originalText}>
              {title.category === 'cartoons' || title.category === 'movies' ? '🌟 OPEN CARTOON' : '🌟 KIDSFLIX SHOW'}
            </Text>
          </View>
          <View style={styles.rating}>
            <Text style={styles.ratingText}>{title.rating}</Text>
          </View>
        </View>
        <Text style={[styles.name, { fontSize: titleSize, lineHeight: titleSize + 4 }]} numberOfLines={2}>
          {title.name}
        </Text>
        <Text style={styles.meta}>
          {title.year} · {title.episodes.length > 1 ? `${title.episodes.length} episodes` : title.category === 'movies' ? 'Short film' : 'Cartoon'} · {title.minutes} min
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {title.description}
        </Text>
        <View style={styles.buttons}>
          <BigButton label={resume ? 'Resume' : 'Play'} icon="▶" onPress={onPlay} full={false} size={small ? 'sm' : 'md'} variant="sun" />
          {onList ? (
            <BigButton label={favorite ? 'In my list' : 'My list'} icon={favorite ? '💖' : '＋'} onPress={onList} full={false} variant="ghost" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: 'hidden', alignSelf: 'center' },
  blob: { position: 'absolute', right: -80, top: -30, backgroundColor: 'rgba(255,255,255,0.14)' },
  ring: {
    position: 'absolute',
    right: 60,
    bottom: -90,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 22,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emojiLayer: { position: 'absolute', right: 8, bottom: 6, opacity: 0.96 },
  content: { flex: 1, padding: 22, justifyContent: 'flex-end', maxWidth: '72%' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  originalBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  originalText: { fontFamily: font.bold, fontSize: 9.5, color: colors.yellow, letterSpacing: 0.4 },
  rating: { backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ratingText: { fontFamily: font.bold, fontSize: 10, color: colors.white },
  name: { fontFamily: font.display, fontSize: 34, color: colors.white, lineHeight: 38 },
  meta: { fontFamily: font.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  desc: { fontFamily: font.body, fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 18, marginTop: 6, maxWidth: 420 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
});
