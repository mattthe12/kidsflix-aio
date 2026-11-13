import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, layout, radius } from '../theme';
import { useNav } from '../nav';
import { useApp } from '../state/AppProvider';
import type { TabName } from '../types';
import { tap } from '../lib/haptics';

const TABS: { id: TabName; emoji: string; labelKey: string }[] = [
  { id: 'home', emoji: '🏠', labelKey: 'home' },
  { id: 'shows', emoji: '📺', labelKey: 'shows' },
  { id: 'learning', emoji: '🧠', labelKey: 'learning' },
  { id: 'favorites', emoji: '💖', labelKey: 'favorites' },
  { id: 'profile', emoji: '😊', labelKey: 'profile' },
];

export function TabBar() {
  const nav = useNav();
  const { t, settings } = useApp();
  const insets = useSafeAreaInsets();
  const big = settings.bigText;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = nav.tab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                tap();
                nav.setTab(tab.id);
              }}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}
            >
              {active ? (
                <LinearGradient
                  colors={['rgba(255,92,168,0.95)', 'rgba(124,77,255,0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.emoji, active && styles.emojiActive]}>{tab.emoji}</Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  active && styles.labelActive,
                  big && { fontSize: 12 },
                ]}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 720,
    height: layout.tabBarHeight,
    backgroundColor: 'rgba(28,15,56,0.96)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 1,
  },
  emoji: { fontSize: 21, opacity: 0.72 },
  emojiActive: { opacity: 1 },
  label: { fontFamily: font.bold, fontSize: 11, color: colors.textDim },
  labelActive: { color: colors.white },
});

