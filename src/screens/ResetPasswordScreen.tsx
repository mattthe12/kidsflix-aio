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

export function ResetPasswordScreen() {
  const { account, finishPasswordReset, signOut } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await finishPasswordReset(password);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
    // On success the provider clears recovery mode and opens the app.
  };

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
            <View style={styles.brandRow}>
              <Logo size={32} />
            </View>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>
              {account?.email
                ? `You are resetting the password for ${account.email}. Use at least 6 characters.`
                : 'Use at least 6 characters for your new password.'}
            </Text>

            <View style={styles.form}>
              <TextField
                label="New password"
                icon="🔒"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder="At least 6 characters"
                secure
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TextField
                label="Confirm new password"
                icon="🔐"
                value={confirm}
                onChangeText={(v) => {
                  setConfirm(v);
                  setError(null);
                }}
                placeholder="Type it again"
                secure
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>😕 {error}</Text>
                </View>
              ) : null}

              <BigButton
                label="Set new password"
                icon={busy ? undefined : '✨'}
                onPress={submit}
                disabled={busy || password.length < 6 || confirm.length < 6}
                size="lg"
              />
              {busy ? <ActivityIndicator color={colors.white} style={{ marginTop: 12 }} /> : null}

              <Pressable
                onPress={() => {
                  void signOut();
                }}
                accessibilityRole="button"
                style={styles.backLink}
              >
                <Text style={styles.link}>Cancel and go back</Text>
              </Pressable>
            </View>

            <View style={styles.privacy}>
              <Text style={styles.privacyText}>
                🔐 Your kids’ profiles, viewing history and parent PIN are not changed by a password reset.
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
  scroll: { paddingHorizontal: 24, paddingVertical: 24, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brandRow: { marginBottom: 28 },
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
  backLink: { alignItems: 'center', marginTop: 18 },
  link: { fontFamily: font.bold, fontSize: 14, color: colors.primarySoft },
  privacy: { marginTop: 22, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.22)' },
  privacyText: { fontFamily: font.body, fontSize: 12, color: colors.textFaint, lineHeight: 18, textAlign: 'center' },
});
