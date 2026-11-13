import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BigButton } from '../components/BigButton';
import { TextField } from '../components/TextField';
import { Logo } from '../components/Logo';
import { EmojiPicker } from '../components/EmojiPicker';
import { Sheet } from '../components/Sheet';
import { AVATARS, AGE_GROUPS, avatarFor } from '../data/avatars';
import { maxRatingForAge } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import type { AgeGroup } from '../types';
import { tap } from '../lib/haptics';

const NAME_LIMIT = 24;

export function ProfileFormScreen({
  profileId,
  onDone,
  standalone,
}: {
  profileId?: string;
  onDone?: () => void;
  standalone?: boolean;
}) {
  const { t, addProfile, updateProfile, profiles, profile: activeProfile, deleteProfile } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const editing = profileId ? profiles.find((p) => p.id === profileId) : undefined;
  const [name, setName] = useState(editing?.name ?? '');
  const [avatar, setAvatar] = useState(editing?.avatar ?? AVATARS[0].id);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(editing?.ageGroup ?? 'kid');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const compact = width < 380;
  const selected = useMemo(() => avatarFor(avatar), [avatar]);
  const finish = () => {
    if (onDone) onDone();
    else nav.back();
  };

  const save = () => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) {
      setError('Please add a name (or a fun nickname).');
      return;
    }
    if (clean.length > NAME_LIMIT) {
      setError(`Names can be up to ${NAME_LIMIT} characters.`);
      return;
    }
    setError(null);
    tap('success');
    if (editing) {
      updateProfile(editing.id, {
        name: clean,
        avatar,
        ageGroup,
        ageLimit: ageGroup === editing.ageGroup ? editing.ageLimit : maxRatingForAge(ageGroup),
      });
    } else {
      addProfile({ name: clean, avatar, ageGroup });
    }
    finish();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={standalone ? ['#2A1157', '#7C4DFF'] : ['#1B0F3B', '#241447']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 18) + 28 }]}
          >
            <View style={[styles.content, { maxWidth: 660 }]}>
              <View style={styles.header}>
                <Logo size={compact ? 24 : 28} />
                {!standalone ? (
                  <Pressable onPress={() => nav.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={styles.close}>
                    <Text style={styles.closeText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.intro, compact && { flexDirection: 'column', alignItems: 'center' }]}>
                <View style={styles.avatarPreview}>
                  <LinearGradient colors={selected.colors} style={StyleSheet.absoluteFill} />
                  <Text style={{ fontSize: compact ? 42 : 50, lineHeight: compact ? 54 : 64 }}>{selected.emoji}</Text>
                </View>
                <View style={[styles.introText, compact && { alignItems: 'center' }]}>
                  <Text style={[styles.title, { fontSize: compact ? 26 : 32 }]} numberOfLines={2}>
                    {editing ? 'Edit kid profile' : standalone ? 'Who is watching?' : t('addProfile')}
                  </Text>
                  <Text style={[styles.subtitle, compact && { textAlign: 'center' }]}>
                    {standalone
                      ? 'Create the first profile so KidsFlix knows what to recommend.'
                      : 'Each kid gets their own favourites, history and age level.'}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <TextField
                  label={t('kidName')}
                  icon="😊"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    setError(null);
                  }}
                  placeholder="e.g. Mia"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={NAME_LIMIT}
                  helper={`${name.length}/${NAME_LIMIT} characters · long names stay on one line`}
                  returnKeyType="done"
                  onSubmitEditing={save}
                />

                <Text style={styles.sectionLabel}>Pick a buddy</Text>
                <EmojiPicker value={avatar} onChange={setAvatar} />
              </View>

              <Text style={styles.sectionLabel}>Age group</Text>
              <View style={styles.ageList}>
                {AGE_GROUPS.map((group) => {
                  const active = group.id === ageGroup;
                  return (
                    <Pressable
                      key={group.id}
                      onPress={() => {
                        tap();
                        setAgeGroup(group.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={`${group.label}, ages ${group.ages}, up to ${group.maxRating}`}
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [styles.ageCard, active && styles.ageSelected, { opacity: pressed ? 0.82 : 1 }]}
                    >
                      <Text style={{ fontSize: 24 }}>{group.emoji}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.ageTitle}>{group.label}</Text>
                        <Text style={styles.ageAges} numberOfLines={1}>Ages {group.ages} · up to {group.maxRating}</Text>
                      </View>
                      <View style={[styles.radio, active && styles.radioOn]}>{active ? <View style={styles.radioDot} /> : null}</View>
                    </Pressable>
                  );
                })}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>😕 {error}</Text>
                </View>
              ) : null}

              <BigButton
                label={editing ? t('save') : standalone ? "Let's go!" : t('createProfile')}
                icon="✨"
                onPress={save}
                size="lg"
              />

              {editing && profiles.length > 1 ? (
                <BigButton label="Delete this profile" variant="ghost" size="sm" onPress={() => setConfirmDelete(true)} />
              ) : null}

              {!standalone && profiles.length === 0 ? (
                <Text style={styles.hint}>You can add more kids later from the parent dashboard.</Text>
              ) : null}
              {standalone && profiles.length === 0 ? (
                <Text style={styles.hint}>A grown-up can add more profiles in the parent dashboard.</Text>
              ) : null}
              {activeProfile ? <Text style={styles.hint}>Tip: switch profiles any time from the top-right avatar.</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this profile?">
        <Text style={styles.sheetBody}>
          {editing?.name ?? 'This kid'}’s favourites, history and downloads will be removed. This cannot be undone.
        </Text>
        <BigButton
          label="Yes, delete profile"
          variant="danger"
          onPress={() => {
            if (editing) deleteProfile(editing.id);
            setConfirmDelete(false);
            finish();
          }}
        />
        <View style={{ height: 10 }} />
        <BigButton label={t('cancel')} variant="ghost" onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10 },
  content: { width: '100%', alignSelf: 'center', gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textDim, fontSize: 18, fontFamily: font.bold },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  introText: { flex: 1, minWidth: 0, gap: 4 },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  title: { fontFamily: font.display, color: colors.white, lineHeight: 36 },
  subtitle: { fontFamily: font.body, fontSize: 13.5, color: colors.textDim, lineHeight: 19 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  sectionLabel: { fontFamily: font.bold, fontSize: 12.5, color: colors.textDim, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  ageList: { gap: 9 },
  ageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ageSelected: { borderColor: colors.primarySoft, backgroundColor: 'rgba(124,77,255,0.22)' },
  ageTitle: { fontFamily: font.bold, fontSize: 15, color: colors.white },
  ageAges: { fontFamily: font.medium, fontSize: 12, color: colors.textDim, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.white },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.white },
  errorBox: { backgroundColor: 'rgba(255,94,108,0.16)', borderRadius: radius.sm, padding: 12 },
  errorText: { fontFamily: font.semibold, fontSize: 13, color: '#FFB3B9', textAlign: 'center' },
  hint: { fontFamily: font.body, fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 17, marginTop: 2, paddingHorizontal: 8 },
  sheetBody: { fontFamily: font.body, fontSize: 14, color: colors.textDim, lineHeight: 21, marginBottom: 18 },
});
