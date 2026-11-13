import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

/** A quiet shimmer used while a screen is still assembling its content. */
export function Skeleton({ width = '100%', height = 16, style }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[styles.block, { width, height, opacity: pulse }, style]} />;
}

export function SkeletonRail({ cardWidth = 142, count = 4 }: { cardWidth?: number; count?: number }) {
  return (
    <View style={styles.rail}>
      <Skeleton width={170} height={20} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} width={cardWidth} height={cardWidth / 0.66} style={{ borderRadius: radius.md }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.cardStrong, borderRadius: 10 },
  rail: { paddingHorizontal: 20, marginBottom: 26 },
});
