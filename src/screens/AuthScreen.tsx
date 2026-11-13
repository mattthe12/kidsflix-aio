import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { BigButton } from '../components/BigButton';
import { TextField } from '../components/TextField';
import { colors, font, gradients, radius } from '../theme';
import { useApp } from '../state/AppProvider';

type Mode = 'login' | 'signup' | 'recover';

export function AuthScreen({ initialMode, onBack }: { initialMode: Mode; onBack: () => void }) {
  const { t, signIn, signUp, resetPassword, isDemo } = useApp();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'recover') {
        const res = await resetPassword(email);
        if (res.ok) setInfo(res.message);
        else setError(res.message);
        return;
      }
      const res = mode === 'signup' ? await signUp(email, password, name) : await signIn(email, password);
      if (res.needsEmailConfirm) {
        setInfo('Almost there! Check your email to confirm your account, then sign in.');
        setMode('login');
        return;
      }
      if (res.error) {
        const messages: Record<string, string> = {
          'invalid-email': t('badEmail'),
          'short-password': t('shortPassword'),
          'wrong-password': 'That email and password do not match. Try again.',
          'no-account': 'We could not find an account with that email.',
          duplicate: 'That email already has a KidsFlix account. Try signing in.',
          unknown: 'Something went wrong. Please try again.',
        };
        setError(messages[res.error] ?? messages.unknown);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const isRecover = mode === 'recover';

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(124,77,255,0.5)', 'rgba(255,92,168,0.15)']}
        style={styles.topGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
                <Text style={styles.back}>←</Text>
              </Pressable>
              <View style={styles.parentBadge}>
                <Text style={styles.parentBadgeText}>👨‍👩‍👧 {t('parentOnly')}</Text>
              </View>
            </View>

            <View style={styles.brandRow}>
              <Logo size={32} />
            </View>

            <Text style={styles.title}>
              {isRecover ? 'Reset your password' : mode === 'signup' ? 'Create your family account' : 'Welcome back!'}
            </Text>
            <Text style={styles.subtitle}>
              {isRecover
                ? 'Enter the grown-up email for your KidsFlix account and we will send a reset link.'
                : mode === 'signup'
                  ? 'One grown-up account holds every kid profile, parental control and download.'
                  : 'Sign in to manage profiles, screen time and your kids’ favourites.'}
            </Text>

            <View style={styles.form}>
              {mode === 'signup' ? (
                <TextField
                  label={t('parentName')}
                  icon="🙋"
                  value={name}
                  onChangeText={setName}
                  placeholder="Alex"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              ) : null}
              <TextField
                label={t('email')}
                icon="✉️"
                value={email}
                onChangeText={setEmail}
                placeholder="grownup@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {!isRecover ? (
                <TextField
                  label={t('password')}
                  icon="🔒"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secure
                  autoCapitalize="none"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>😕 {error}</Text>
                </View>
              ) : null}
              {info ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>💌 {info}</Text>
                </View>
              ) : null}

              <BigButton
                label={isRecover ? 'Send reset link' : mode === 'signup' ? t('createAccount') : t('signIn')}
                icon={busy ? undefined : mode === 'signup' ? '✨' : '🔑'}
                onPress={submit}
                disabled={busy || !email.trim() || (!isRecover && password.length < 6)}
                size="lg"
              />
              {busy ? <ActivityIndicator color={colors.white} style={{ marginTop: 12 }} /> : null}

              <View style={styles.links}>
                {mode === 'login' ? (
                  <>
                    <Pressable onPress={() => { setMode('signup'); setError(null); }} accessibilityRole="button">
                      <Text style={styles.linkStrong}>New here? Create an account</Text>
                    </Pressable>
                    <Pressable onPress={() => { setMode('recover'); setError(null); }} accessibilityRole="button">
                      <Text style={styles.link}>{t('forgotPassword')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => { setMode('login'); setError(null); setInfo(null); }} accessibilityRole="button">
                    <Text style={styles.linkStrong}>← Back to sign in</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.privacy}>
              <Text style={styles.privacyText}>
                🔐 Kids never create accounts, share email addresses or see ads. A parent or guardian manages every profile.
                {isDemo ? ' Demo mode stores accounts on this device until Supabase is connected.' : ' Secured by Supabase Auth.'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  topGlow: { position: 'absolute', top: -180, right: -120, width: 420, height: 420, borderRadius: 210 },
  scroll: { paddingHorizontal: 24, paddingVertical: 18, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { fontSize: 26, color: colors.white, fontFamily: font.bold },
  parentBadge: {
    backgroundColor: 'rgba(255,210,63,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.4)',
  },
  parentBadgeText: { fontFamily: font.bold, fontSize: 12, color: colors.yellow },
  brandRow: { marginBottom: 22 },
  title: { fontFamily: font.display, fontSize: 34, color: colors.white, lineHeight: 40 },
  subtitle: { fontFamily: font.body, fontSize: 15, color: colors.textDim, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  form: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  errorBox: { backgroundColor: 'rgba(255,94,108,0.16)', borderRadius: radius.sm, padding: 12, marginBottom: 12 },
  errorText: { fontFamily: font.semibold, fontSize: 13, color: '#FFB3B9', lineHeight: 18 },
  infoBox: { backgroundColor: 'rgba(63,224,176,0.14)', borderRadius: radius.sm, padding: 12, marginBottom: 12 },
  infoText: { fontFamily: font.semibold, fontSize: 13, color: '#9BF0D8', lineHeight: 18 },
  links: { gap: 14, marginTop: 16, alignItems: 'center', paddingBottom: 4 },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors.textDim },
  linkStrong: { fontFamily: font.bold, fontSize: 14, color: colors.primarySoft },
  privacy: { marginTop: 22, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.22)' },
  privacyText: { fontFamily: font.body, fontSize: 12, color: colors.textFaint, lineHeight: 18, textAlign: 'center' },
});
