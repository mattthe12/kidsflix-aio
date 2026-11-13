import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar } from '../components/Screen';
import { TitleRail, TitleGrid } from '../components/Rails';
import { CATEGORY_MAP, titlesInSub } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { columnsFor, useResponsive } from '../lib/responsive';

export function LearningScreen() {
  const { t, canWatch, profile } = useApp();
  const nav = useNav();
  const responsive = useResponsive();
  const pathColumns = columnsFor(responsive.contentWidth - 32, 104, 10, 3);
  const pathWidth = (responsive.contentWidth - 32 - 10 * (pathColumns - 1)) / pathColumns;
  const learning = CATEGORY_MAP.learning;
  const bedtime = CATEGORY_MAP.bedtime;

  const allowed = (titles: ReturnType<typeof titlesInSub>) => titles.filter(canWatch);

  const totals = useMemo(() => {
    const all = learning.subcategories.flatMap((sub) => allowed(titlesInSub('learning', sub.id)));
    return all.length;
  }, [canWatch]);

  return (
    <Screen>
      <TopBar />
      <View style={styles.heading}>
        <Text style={styles.title}>Learning Zone</Text>
        <Text style={styles.subtitle}>Little lessons, big discoveries 🧠</Text>
        {profile ? (
          <View style={styles.levelPill}>
            <Text style={styles.levelText}>
              {profile.ageGroup === 'toddler' ? '🐣 Little Explorer' : profile.ageGroup === 'kid' ? '🚀 Big Kid' : '⭐ Super Kid'} · {totals} lessons
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.paths}>
        {learning.subcategories.map((sub, i) => {
          const count = allowed(titlesInSub('learning', sub.id)).length;
          const palettes: readonly (readonly [string, string])[] = [
            ['#3EA8FF', '#7C4DFF'],
            ['#3FE0B0', '#3EA8FF'],
            ['#FF8A3D', '#FFD23F'],
            ['#FF5CA8', '#B14BFF'],
            ['#6C8CFF', '#3FE0B0'],
            ['#B14BFF', '#FF5CA8'],
          ];
          return (
            <Pressable
              key={sub.id}
              onPress={() => nav.push({ name: 'category', category: 'learning', subcategory: sub.id })}
              style={({ pressed }) => [styles.pathCard, { width: pathWidth, flexBasis: pathWidth, flexGrow: 0, opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient colors={palettes[i % palettes.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 30 }}>{sub.emoji}</Text>
              <Text style={styles.pathName}>{sub.name}</Text>
              <Text style={styles.pathCount}>{count} shows ›</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Reading & letters</Text>
        <TitleGrid items={allowed([...titlesInSub('learning', 'alphabet'), ...titlesInSub('learning', 'reading')])} onPress={(title) => nav.push({ name: 'title', titleId: title.id })} />
      </View>

      <TitleRail
        title="Numbers & science"
        emoji="🔬"
        items={allowed([...titlesInSub('learning', 'numbers'), ...titlesInSub('learning', 'science')])}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        onSeeAll={() => nav.push({ name: 'category', category: 'learning' })}
      />

      <TitleRail
        title="Explore the world"
        emoji="🌍"
        items={allowed([...titlesInSub('learning', 'geography'), ...titlesInSub('learning', 'quizzes')])}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
      />

      <View style={styles.bedtimeCard}>
        <LinearGradient colors={['#6C8CFF', '#B14BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, padding: 18 }}>
          <Text style={styles.bedtimeTitle}>🌙 Bedtime Zone</Text>
          <Text style={styles.bedtimeBody}>Stories and calm sounds for winding down.</Text>
          <Pressable onPress={() => nav.push({ name: 'category', category: 'bedtime' })} style={styles.bedtimeBtn}>
            <Text style={styles.bedtimeBtnText}>Open bedtime ›</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 72, marginRight: 14 }}>😴</Text>
      </View>

      <TitleRail
        title="Sleepy favourites"
        emoji="⭐"
        items={bedtime.subcategories.flatMap((sub) => allowed(titlesInSub('bedtime', sub.id))).slice(0, 10)}
        onPress={(title) => nav.push({ name: 'title', titleId: title.id })}
        onSeeAll={() => nav.push({ name: 'category', category: 'bedtime' })}
      />

      <Text style={styles.footnote}>{t('seeAll')} · Every lesson is ad-free and made for little learners.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: font.display, fontSize: 32, color: colors.white },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.textDim, marginTop: 2 },
  levelPill: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(63,224,176,0.16)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  levelText: { fontFamily: font.bold, fontSize: 11, color: colors.mint },
  paths: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  pathCard: { aspectRatio: 1.02, borderRadius: radius.lg, padding: 12, justifyContent: 'flex-end', overflow: 'hidden', gap: 1 },
  pathName: { fontFamily: font.bold, fontSize: 12.5, color: colors.white, lineHeight: 15 },
  pathCount: { fontFamily: font.semibold, fontSize: 9.5, color: 'rgba(255,255,255,0.85)' },
  section: { marginBottom: 26 },
  sectionTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, paddingHorizontal: 20, marginBottom: 12 },
  bedtimeCard: { marginHorizontal: 20, borderRadius: radius.xl, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  bedtimeTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white },
  bedtimeBody: { fontFamily: font.body, fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 3, maxWidth: 240 },
  bedtimeBtn: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  bedtimeBtnText: { fontFamily: font.bold, fontSize: 12, color: colors.white },
  footnote: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 4 },
});
