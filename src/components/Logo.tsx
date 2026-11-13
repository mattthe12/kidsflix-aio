import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '../theme';

export function Logo({ size = 30, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.mark, { width: size * 1.15, height: size * 1.15, borderRadius: size * 0.34 }]}>
        <LinearGradient colors={['#FF5CA8', '#7C4DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: size * 0.62 }}>⭐</Text>
      </View>
      {!compact && (
        <Text style={[styles.word, { fontSize: size }]}>
          Kids<Text style={styles.wordAccent}>Flix</Text>
        </Text>
      )}
    </View>
  );
}

export function RoundIconButton({
  icon,
  onPress,
  size = 46,
  tint = colors.cardStrong,
  accessibilityLabel,
  style,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  tint?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const content = typeof icon === 'string' ? <Text style={{ fontSize: size * 0.44 }}>{icon}</Text> : icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundIcon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tint,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Pill({ label, color = colors.cardStrong, textColor = colors.white }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  emoji,
  actionLabel,
  onAction,
}: {
  title: string;
  emoji?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {emoji ? `${emoji}  ` : ''}
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  word: {
    fontFamily: font.display,
    color: colors.white,
    letterSpacing: 0.3,
    ...(Platform.OS === 'web' ? { lineHeight: 40 } : null),
  },
  wordAccent: { color: colors.pink },
  roundIcon: { alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, flexShrink: 1 },
  sectionAction: { fontFamily: font.bold, fontSize: 14, color: colors.primarySoft },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
});
