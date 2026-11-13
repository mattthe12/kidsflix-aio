import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PINPad } from '../components/PINPad';
import { Logo } from '../components/Logo';
import { BigButton } from '../components/BigButton';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';

export function PinSetupScreen({ onDone }: { onDone?: () => void }) {
  const { t, setPin, account, signOut } = useApp();
  const [stage, setStage] = useState<'create' | 'confirm'>('create');
  const [first, setFirst] = useState('');
  const [pin, setValue] = useState('');
  const [error, setError] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const onComplete = async (entered: string) => {
    if (stage === 'create') {
      setFirst(entered);
      setValue('');
      setStage('confirm');
      return;
    }
    if (entered !== first) {
      setMismatch(true);
      setError(true);
      setValue('');
      setStage('create');
      setFirst('');
      setTimeout(() => setError(false), 700);
      return;
    }
    setSaving(true);
    await setPin(entered);
    setSaving(false);
    onDone?.();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1B0E3C', '#2E155F']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Logo size={26} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔐 {t('parentOnly')}</Text>
          </View>
          {onDone ? (
            <Pressable onPress={onDone} accessibilityRole="button" hitSlop={10}>
              <Text style={{ color: colors.textDim, fontSize: 20, fontFamily: font.bold }}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.lockCircle}>
            <Text style={{ fontSize: 46 }}>🔒</Text>
          </View>
          <Text style={styles.title}>{stage === 'create' ? t('setPin') : t('confirmPin')}</Text>
          <Text style={styles.subtitle}>
            {mismatch ? t('pinMismatch') : stage === 'create' ? t('pinInfo') : 'Enter the same 4 digits one more time.'}
          </Text>

          <PINPad
            value={pin}
            onChange={(v) => {
              setValue(v);
              if (error) setError(false);
            }}
            onComplete={onComplete}
            error={error}
          />

          {mismatch ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>🙈 {t('pinMismatch')}</Text>
            </View>
          ) : null}

          <Text style={styles.account}>{account?.email}</Text>
          <BigButton label={t('signOut')} variant="ghost" size="sm" full={false} onPress={signOut} />
        </View>
        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  badge: { backgroundColor: 'rgba(255,210,63,0.15)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: colors.yellow, fontFamily: font.bold, fontSize: 11 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 40 },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: font.display, fontSize: 30, color: colors.white, textAlign: 'center' },
  subtitle: { fontFamily: font.body, fontSize: 14, color: colors.textDim, textAlign: 'center', maxWidth: 340, lineHeight: 21, marginTop: -6 },
  errorBox: { backgroundColor: 'rgba(255,94,108,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.sm },
  errorText: { fontFamily: font.bold, fontSize: 13, color: '#FFC2C7' },
  account: { fontFamily: font.body, fontSize: 12, color: colors.textFaint, marginTop: 10 },
  saving: { position: 'absolute', bottom: 24, alignSelf: 'center', color: colors.textDim, fontFamily: font.semibold },
});
