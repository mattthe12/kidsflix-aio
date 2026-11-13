import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, PageHeader, SettingRow, Card } from '../components/Screen';
import { Chip, IconSwitch, BigButton } from '../components/BigButton';
import { TextField } from '../components/TextField';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { AGE_GROUPS } from '../data/avatars';

export function SettingsScreen() {
  const { t, settings, updateSettings, account, family, setParentName, signOut, isDemo, profiles } = useApp();
  const nav = useNav();
  const [name, setName] = useState(family?.parentName ?? '');
  const [saved, setSaved] = useState(false);

  return (
    <Screen>
      <PageHeader title={t('settings')} subtitle="Grown-up account and accessibility" onBack={() => nav.back()} />

      <View style={{ paddingHorizontal: 20 }}>
        <Card style={{ marginBottom: 18 }}>
          <Text style={styles.cardLabel}>ACCOUNT HOLDER</Text>
          <Text style={styles.email}>{account?.email}</Text>
          <TextField label={t('parentName')} icon="🙋" value={name} onChangeText={(v) => { setName(v); setSaved(false); }} placeholder="Your name" />
          <BigButton
            label={saved ? '✓ Saved' : t('save')}
            size="sm"
            full={false}
            onPress={() => {
              setParentName(name);
              setSaved(true);
            }}
          />
          <Text style={styles.meta}>
            {profiles.length} kid profile{profiles.length === 1 ? '' : 's'} ·{' '}
            {profiles.map((p) => `${p.name} (${AGE_GROUPS.find((g) => g.id === p.ageGroup)?.ages})`).join(', ') || 'no profiles yet'}
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>🌍 {t('language')}</Text>
        <View style={styles.chips}>
          {[
            { id: 'en' as const, label: 'English', flag: '🇬🇧' },
            { id: 'es' as const, label: 'Español', flag: '🇪🇸' },
            { id: 'fr' as const, label: 'Français', flag: '🇫🇷' },
          ].map((l) => (
            <Chip key={l.id} label={l.label} emoji={l.flag} active={settings.language === l.id} onPress={() => updateSettings({ language: l.id })} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>♿ {t('accessibility')}</Text>
        <SettingRow
          icon="🔠"
          label={t('bigText')}
          subtitle="Larger text for little readers"
          right={<IconSwitch label={t('bigText')} value={settings.bigText} onChange={(v) => updateSettings({ bigText: v })} />}
        />
        <SettingRow
          icon="🌿"
          label={t('reduceMotion')}
          subtitle="Turn down bouncing animations"
          right={<IconSwitch label={t('reduceMotion')} value={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />}
        />
        <SettingRow
          icon="🔤"
          label={t('captions')}
          subtitle="Start every video with English captions"
          right={<IconSwitch label={t('captions')} value={settings.captionsAlways} onChange={(v) => updateSettings({ captionsAlways: v })} />}
        />

        <Text style={styles.sectionLabel}>🔐 {t('signsOut')}</Text>
        <SettingRow icon="🔑" label={t('changePin')} subtitle="4-digit PIN for this parent area" onPress={() => nav.push({ name: 'parentSetup' })} />
        <SettingRow icon="💳" label={t('subscription')} subtitle="Plan, trial and billing" onPress={() => nav.push({ name: 'subscription' })} />
        <SettingRow icon="📥" label="Download permission" subtitle={settings.downloadsAllowed ? 'Allowed' : 'Blocked'} onPress={() => nav.push({ name: 'parent' })} />

        <Card style={{ marginTop: 8, marginBottom: 16 }}>
          <Text style={styles.cardLabel}>PRIVACY & LEGAL</Text>
          <Text style={styles.legal}>
            KidsFlix does not serve targeted advertising to children and has no public messaging, comments or social profiles.
            Kid profiles collect only a first name, a cartoon avatar and an age band. Watch history and favourites are visible only
            to the parent account and can be deleted from the dashboard.
          </Text>
          <Text style={styles.legal}>
            For a public deployment, complete your COPPA (US) or GDPR-K / Age Appropriate Design Code (EU/UK) review, publish a
            privacy policy and configure data-retention limits in Supabase.
          </Text>
          <Text style={styles.legal}>
            Demo videos are open-licensed: Blender Foundation films (CC BY 3.0 / 4.0), Ub Iwerks
            ComiColor cartoons, NASA, NOAA and Prelinger Archives (public domain). The player shows
            the exact clip credit.
          </Text>
          <Text style={styles.version}>KidsFlix v2.0.0 · Expo SDK 58 · {isDemo ? 'local demo mode' : 'Supabase connected'}</Text>
        </Card>

        <BigButton label={t('signOut')} variant="ghost" onPress={signOut} />
        <View style={{ height: 20 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: colors.textFaint, marginBottom: 6 },
  email: { fontFamily: font.bold, fontSize: 16, color: colors.white, marginBottom: 14 },
  meta: { fontFamily: font.body, fontSize: 11.5, color: colors.textFaint, marginTop: 10, lineHeight: 17 },
  sectionLabel: { fontFamily: font.bold, fontSize: 12, color: colors.textFaint, marginLeft: 4, marginBottom: 8, letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  legal: { fontFamily: font.body, fontSize: 11.5, color: colors.textDim, lineHeight: 17, marginBottom: 8 },
  version: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint, marginTop: 4 },
});
