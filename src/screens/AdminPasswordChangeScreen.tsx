import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { BigButton } from '../components/BigButton';
import { TextField } from '../components/TextField';
import { colors, font, gradients, radius } from '../theme';
import { adminPasswordError } from '../lib/authRules';
import { useApp } from '../state/AppProvider';

export function AdminPasswordChangeScreen() {
  const { account, admin, finishAdminBootstrap, signOut } = useApp();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    const validation = adminPasswordError(password, confirmation);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setBusy(true);
    const result = await finishAdminBootstrap(password);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.safe}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔐 ADMINISTRATOR SETUP</Text>
            </View>
            <Logo size={34} />
            <Text style={styles.title}>Replace the temporary password</Text>
            <Text style={styles.subtitle}>
              {account?.email ?? admin?.username ?? 'Administrator'} is signed in with a one-time
              bootstrap credential. Choose a new password before opening the admin dashboard.
            </Text>

            <View style={styles.form}>
              <TextField
                label="New administrator password"
                icon="🔒"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError('');
                }}
                placeholder="At least 8 characters"
                secure
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TextField
                label="Confirm new password"
                icon="🔐"
                value={confirmation}
                onChangeText={(value) => {
                  setConfirmation(value);
                  setError('');
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
                label={busy ? 'Setting password…' : 'Set password and continue'}
                icon={busy ? undefined : '✨'}
                onPress={submit}
                disabled={busy || !password || !confirmation}
                size="lg"
              />

              <Pressable onPress={() => void signOut()} accessibilityRole="button" style={styles.cancel}>
                <Text style={styles.cancelText}>Sign out instead</Text>
              </Pressable>
            </View>

            <Text style={styles.note}>
              The temporary credential is disabled after this step. Nobody can see the new password
              from the admin dashboard.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingVertical: 26, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,210,63,0.16)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)' },
  badgeText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, color: colors.yellow },
  title: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: colors.white, marginTop: 20 },
  subtitle: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: colors.textDim, marginTop: 10, marginBottom: 22 },
  form: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 18 },
  errorBox: { backgroundColor: 'rgba(255,94,108,0.16)', borderRadius: radius.sm, padding: 12, marginBottom: 12 },
  errorText: { fontFamily: font.semibold, fontSize: 13, color: '#FFB3B9', lineHeight: 18 },
  cancel: { alignItems: 'center', paddingVertical: 16 },
  cancelText: { fontFamily: font.bold, fontSize: 14, color: colors.textDim },
  note: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: colors.textFaint, textAlign: 'center', marginTop: 20 },
});
