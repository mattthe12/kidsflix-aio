import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { colors, font, radius } from '../theme';
import { columnsFor, useResponsive } from '../lib/responsive';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { AGE_GROUPS } from '../data/avatars';
import { tap } from '../lib/haptics';

export function ProfilePickerScreen({ onSelect }: { onSelect?: () => void } = {}) {
  const { profiles, selectProfile, account, signOut, t, settings } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const responsive = useResponsive();
  const gap = 14;
  const columns = columnsFor(Math.max(0, width - responsive.gutter * 2), 156, gap, 4);
  const cardWidth = Math.max(138, Math.min(220, (Math.max(0, width - responsive.gutter * 2) - gap * (columns - 1)) / columns));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0E3D', '#3A1A72', '#151030']} style={StyleSheet.absoluteFill} />
      <View style={styles.halo} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Logo size={26} />
          <Pressable onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })} hitSlop={8} accessibilityRole="button">
            <Text style={styles.parentLink}>🔐 {t('parents')}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: responsive.gutter }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Who's watching?</Text>
          <Text style={styles.subtitle}>Tap your buddy to start the magic ✨</Text>

          <View style={[styles.grid, { gap }] }>
            {profiles.map((p) => {
              const age = AGE_GROUPS.find((g) => g.id === p.ageGroup);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    tap();
                    selectProfile(p.id);
                    onSelect?.();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Profile ${p.name}`}
                  style={({ pressed }) => [styles.card, { width: cardWidth, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                >
                  <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.04)']} style={StyleSheet.absoluteFill} />
                  <Avatar avatarId={p.avatar} size={cardWidth * 0.52} />
                  <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{p.name}</Text>
                  <Text style={styles.age}>{age?.emoji} {age?.ages}</Text>
                  <View style={styles.playPill}>
                    <Text style={styles.playText}>Let's go ▶</Text>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })}
              accessibilityRole="button"
              accessibilityLabel="Add or manage profiles"
              style={({ pressed }) => [styles.addCard, { width: cardWidth, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={{ fontSize: 38 }}>➕</Text>
              <Text style={styles.addLabel}>Add or edit a kid</Text>
              <Text style={styles.addHint}>Grown-ups only</Text>
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.account}>{account?.email}</Text>
            <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.signOut}>{t('signOut')}</Text>
            </Pressable>
          </View>
          {settings.bigText ? <Text style={styles.bigHint}>Bigger text is on</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  halo: { position: 'absolute', top: -120, left: -80, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,92,168,0.18)' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10 },
  parentLink: { fontFamily: font.bold, fontSize: 12, color: colors.yellow, backgroundColor: 'rgba(255,210,63,0.12)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  scroll: { paddingTop: 34, paddingBottom: 40, alignItems: 'center' },
  title: { fontFamily: font.display, fontSize: 38, color: colors.white, textAlign: 'center' },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.textDim, marginTop: 4, marginBottom: 28, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    borderRadius: radius.xl,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  name: { fontFamily: font.displaySoft, fontSize: 19, color: colors.white, marginTop: 4, maxWidth: '100%', textAlign: 'center' },
  age: { fontFamily: font.semibold, fontSize: 11, color: colors.textDim },
  playPill: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  playText: { fontFamily: font.bold, fontSize: 11, color: colors.white },
  addCard: {
    borderRadius: radius.xl,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.24)',
    minHeight: 200,
  },
  addLabel: { fontFamily: font.bold, fontSize: 14, color: colors.textDim, textAlign: 'center' },
  addHint: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' },
  account: { fontFamily: font.body, fontSize: 11, color: colors.textFaint },
  signOut: { fontFamily: font.bold, fontSize: 12, color: colors.textDim },
  bigHint: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint, marginTop: 14 },
});
