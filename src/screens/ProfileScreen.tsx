import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar, SettingRow } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { Chip, IconSwitch } from '../components/BigButton';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { AGE_GROUPS } from '../data/avatars';
import type { Lang } from '../lib/i18n';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
];

export function ProfileScreen() {
  const {
    profile,
    t,
    settings,
    updateSettings,
    favorites,
    downloads,
    watchedMinutesToday,
    history,
    isDemo,
    signOut,
    account,
    profiles,
  } = useApp();
  const nav = useNav();

  if (!profile) return null;
  const age = AGE_GROUPS.find((g) => g.id === profile.ageGroup);
  const readyDownloads = downloads.filter((d) => d.status === 'ready').length;

  return (
    <Screen>
      <TopBar />
      <View style={styles.hero}>
        <View style={styles.avatarHalo}>
          <Avatar avatarId={profile.avatar} size={104} />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.agePill}>
          <Text style={styles.ageText}>
            {age?.emoji} {age?.label} · {age?.ages} · up to {profile.ageLimit}
          </Text>
        </View>
        <Text style={styles.hello}>So happy you're here! 🌟</Text>
      </View>

      <View style={styles.stats}>
        <Stat emoji="⏱️" value={`${watchedMinutesToday}m`} label={t('watchTimeToday')} />
        <Stat emoji="💖" value={`${favorites.length}`} label={t('favoritesCount')} />
        <Stat emoji="📥" value={`${readyDownloads}`} label={t('downloads')} />
      </View>

      <Text style={styles.sectionLabel}>🎛️ My screen</Text>
      <View style={styles.section}>
        <SettingRow icon="🌈" label="My Cartoon World" subtitle="Your buddy, favourite worlds and watchlist" onPress={() => nav.push({ name: 'world' })} />
        <SettingRow icon="🎬" label={t('switchProfile')} subtitle={`${profiles.length} kid profile${profiles.length === 1 ? '' : 's'}`} onPress={() => nav.push({ name: 'profiles' })} />
        <SettingRow icon="📥" label={t('downloads')} subtitle={settings.downloadsAllowed ? 'Watch without internet' : 'Grown-ups turned downloads off'} onPress={() => nav.push({ name: 'downloads' })} />
        <SettingRow
          icon="🔤"
          label={t('captions')}
          subtitle={settings.captionsAlways ? 'Always on' : 'Turn on in the player'}
          right={<IconSwitch label={t('captions')} value={settings.captionsAlways} onChange={(v) => updateSettings({ captionsAlways: v })} />}
        />
        <SettingRow
          icon="🔠"
          label={t('bigText')}
          subtitle="Bigger words everywhere"
          right={<IconSwitch label={t('bigText')} value={settings.bigText} onChange={(v) => updateSettings({ bigText: v })} />}
        />
        <SettingRow
          icon="🌿"
          label={t('reduceMotion')}
          subtitle="Fewer bouncy animations"
          right={<IconSwitch label={t('reduceMotion')} value={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />}
        />
      </View>

      <Text style={styles.sectionLabel}>🌍 {t('language')}</Text>
      <View style={styles.langRow}>
        {LANGS.map((lang) => (
          <Chip
            key={lang.id}
            label={lang.label}
            emoji={lang.flag}
            active={settings.language === lang.id}
            onPress={() => updateSettings({ language: lang.id })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>🔐 {t('parents')}</Text>
      <View style={styles.section}>
        <Pressable
          onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })}
          style={({ pressed }) => [styles.parentCard, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <LinearGradient colors={['#FFD23F', '#FF8A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 30 }}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.parentTitle}>{t('parentDashboard')}</Text>
            <Text style={styles.parentSub}>{history.length} watched · {settings.dailyLimitMinutes || '∞'} min daily limit</Text>
          </View>
          <Text style={styles.parentLock}>🔒</Text>
        </Pressable>
        <SettingRow icon="⚙️" label={t('settings')} subtitle={account?.email} onPress={() => nav.push({ name: 'parentGate', then: 'settings' })} />
        <SettingRow icon="💳" label={t('subscription')} subtitle={settings.subscriptionStatus === 'trialing' ? 'Free trial active' : settings.plan} onPress={() => nav.push({ name: 'parentGate', then: 'subscription' })} />
      </View>

      {isDemo ? (
        <View style={styles.demo}>
          <Text style={styles.demoTitle}>🧪 {t('demoMode')}</Text>
          <Text style={styles.demoBody}>{t('demoModeBody')} Accounts and watch data are stored on this device.</Text>
        </View>
      ) : null}

      <Pressable onPress={signOut} style={styles.signOut} accessibilityRole="button">
        <Text style={styles.signOutText}>👋 {t('signOut')}</Text>
      </Pressable>
      <Text style={styles.footer}>KidsFlix · no ads for kids, ever 💜</Text>
    </Screen>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 18, gap: 8 },
  avatarHalo: {
    padding: 6,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontFamily: font.display, fontSize: 30, color: colors.white },
  agePill: { backgroundColor: colors.cardStrong, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  ageText: { fontFamily: font.bold, fontSize: 11, color: colors.textDim },
  hello: { fontFamily: font.medium, fontSize: 13, color: colors.textFaint },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 22 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white },
  statLabel: { fontFamily: font.semibold, fontSize: 10.5, color: colors.textDim, textAlign: 'center', paddingHorizontal: 4 },
  sectionLabel: { fontFamily: font.bold, fontSize: 13, color: colors.textFaint, marginLeft: 24, marginBottom: 8, letterSpacing: 0.4 },
  section: { paddingHorizontal: 20, marginBottom: 18 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 18 },
  parentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
  },
  parentTitle: { fontFamily: font.bold, fontSize: 16, color: '#3B1A00' },
  parentSub: { fontFamily: font.semibold, fontSize: 11.5, color: 'rgba(59,26,0,0.75)', marginTop: 2 },
  parentLock: { fontSize: 20 },
  demo: { marginHorizontal: 20, backgroundColor: 'rgba(62,168,255,0.12)', borderRadius: radius.md, padding: 14, gap: 4, marginBottom: 16 },
  demoTitle: { fontFamily: font.bold, fontSize: 13, color: '#9FD6FF' },
  demoBody: { fontFamily: font.body, fontSize: 12, color: colors.textDim, lineHeight: 17 },
  signOut: { alignSelf: 'center', padding: 14, marginBottom: 8 },
  signOutText: { fontFamily: font.bold, fontSize: 13, color: colors.textFaint },
  footer: { textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.textFaint, marginBottom: 12 },
});
