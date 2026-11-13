import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PINPad } from '../components/PINPad';
import { Logo } from '../components/Logo';
import { BigButton } from '../components/BigButton';
import { Sheet } from '../components/Sheet';
import { TextField } from '../components/TextField';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { authApi } from '../lib/auth';
import { pinSecurity } from '../lib/pinSecurity';
import { attemptsUntilLockout, lockoutSecondsForAttempts } from '../lib/pinLockout';

export function ParentGateScreen({ then }: { then: 'dashboard' | 'settings' | 'subscription' }) {
  const { t, unlockParent, lockParent, account, settings } = useApp();
  const nav = useNav();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [securityLoading, setSecurityLoading] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [checking, setChecking] = useState(false);

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - nowTick) / 1000)) : 0;
  const locked = secondsLeft > 0;
  const triesLeft = attemptsUntilLockout(attempts);
  const nextLockout = lockoutSecondsForAttempts(attempts + triesLeft);

  // The backend (or the device mirror in demo mode) owns this state, so a
  // reload, a new screen instance or a restarted app sees the same lockout.
  const refreshSecurity = useCallback(async () => {
    if (!account?.id) {
      setSecurityLoading(false);
      return;
    }
    setSecurityLoading(true);
    const state = await pinSecurity.status(account.id);
    setAttempts(state.failedAttempts);
    setLockedUntil(state.lockedUntil);
    setNowTick(Date.now());
    if (state.remainingSeconds > 0) {
      lockParent();
      setPin('');
    }
    setSecurityLoading(false);
  }, [account?.id, lockParent]);

  useEffect(() => {
    void refreshSecurity();
  }, [refreshSecurity, settings.pinHash]);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const now = Date.now();
      setNowTick(now);
      if (now >= lockedUntil) setLockedUntil(null);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const target = then === 'dashboard' ? 'parent' : then === 'settings' ? 'settings' : 'subscription';

  const verify = async (entered: string) => {
    if (securityLoading || locked) {
      setPin('');
      return;
    }
    const result = await unlockParent(entered);
    if (result.ok) {
      nav.replace({ name: target } as never);
      return;
    }

    setAttempts(result.failedAttempts);
    setLockedUntil(result.lockedUntil);
    setNowTick(Date.now());
    setError(true);
    setPin('');
    if (result.locked) lockParent();
    setTimeout(() => setError(false), 900);
  };

  const setValue = (v: string) => {
    if (locked) return;
    setPin(v);
  };

  if (!settings.pinHash) {
    return (
      <View style={styles.root}>
        <Text style={{ fontSize: 54 }}>🔐</Text>
        <Text style={styles.title}>No PIN set yet</Text>
        <BigButton label="Create a PIN" onPress={() => nav.replace({ name: 'parentSetup' })} full={false} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1B0E3C', '#2E155F', '#150C31']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Logo size={24} />
          <Pressable onPress={() => nav.back()} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={[styles.lockCircle, locked && styles.lockCircleLocked]}>
            <Text style={{ fontSize: 40 }}>{locked ? '⏳' : '🛡️'}</Text>
          </View>
          <Text style={styles.title}>{locked ? 'Parent area locked' : t('parentOnly')}</Text>

          {locked ? (
            <View style={styles.lockoutBox}>
              <Text style={styles.lockoutLabel}>TOO MANY INCORRECT PINS</Text>
              <Text style={styles.lockoutTimer} accessibilityLabel={`Locked for ${secondsLeft} more seconds`}>
                {secondsLeft}s
              </Text>
              <Text style={styles.lockoutHint}>
                Try again when the timer reaches zero. This lockout stays active across screens and app restarts.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>{t('enterPin')}</Text>
              {attempts > 0 ? (
                <Text style={styles.attempts}>
                  {attempts} incorrect attempt{attempts === 1 ? '' : 's'} · {triesLeft} more before a {nextLockout}s lockout
                </Text>
              ) : null}
            </>
          )}

          <PINPad
            value={pin}
            onChange={setValue}
            onComplete={verify}
            error={error}
            disabled={locked || securityLoading}
          />

          {securityLoading ? <Text style={styles.checking}>Checking security status…</Text> : null}

          <Text style={styles.hint}>Signed in as {account?.email}</Text>
          <Pressable
            onPress={() => {
              if (!locked) setForgot(true);
            }}
            disabled={locked}
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            hitSlop={8}
          >
            <Text style={[styles.forgot, locked && styles.forgotDisabled]}>Forgot the PIN?</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Sheet visible={forgot && !locked} onClose={() => setForgot(false)} title="Reset the parent PIN">
        <Text style={styles.sheetBody}>
          For safety, only the grown-up account password can reset the PIN. Your kids’ profiles and watch history stay exactly as they are.
        </Text>
        <TextField
          label="Account password"
          icon="🔒"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPwError('');
          }}
          secure
          placeholder="Your KidsFlix password"
          autoCapitalize="none"
        />
        {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
        <BigButton
          label="Verify and set a new PIN"
          icon="🔑"
          onPress={async () => {
            if (!account) return;
            setChecking(true);
            const res = await authApi.signIn(account.email, password);
            if (res.user) {
              // A password recovery is not a shortcut around an active PIN
              // lockout. Keep the wait enforced before opening PIN setup.
              const state = await pinSecurity.status(res.user.id);
              if (state.remainingSeconds > 0) {
                setPwError(`PIN reset is paused for ${state.remainingSeconds}s while the security lockout is active.`);
                setChecking(false);
                return;
              }
              setChecking(false);
              setForgot(false);
              nav.replace({ name: 'parentSetup' });
            } else {
              setChecking(false);
              setPwError('That password does not match this account.');
            }
          }}
          disabled={checking || password.length < 6}
        />
        <View style={{ height: 10 }} />
        <BigButton label="Cancel" variant="ghost" onPress={() => setForgot(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, width: '100%', paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  close: { color: colors.textDim, fontSize: 22, fontFamily: font.bold, padding: 6 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 30 },
  lockCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,210,63,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.35)',
  },
  lockCircleLocked: { backgroundColor: 'rgba(255,94,108,0.16)', borderColor: 'rgba(255,94,108,0.45)' },
  title: { fontFamily: font.display, fontSize: 30, color: colors.white, textAlign: 'center' },
  subtitle: { fontFamily: font.body, fontSize: 14, color: colors.textDim, textAlign: 'center' },
  attempts: { fontFamily: font.semibold, fontSize: 12, color: colors.yellow, textAlign: 'center', marginTop: -6 },
  lockoutBox: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: 'rgba(255,94,108,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,94,108,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  lockoutLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: '#FFB3B9' },
  lockoutTimer: { fontFamily: font.display, fontSize: 42, color: colors.white, lineHeight: 48 },
  lockoutHint: { fontFamily: font.body, fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 17 },
  checking: { fontFamily: font.medium, fontSize: 11.5, color: colors.textFaint, marginTop: -6 },
  hint: { fontFamily: font.body, fontSize: 11, color: colors.textFaint, marginTop: 4 },
  forgot: { fontFamily: font.bold, fontSize: 13, color: colors.primarySoft },
  forgotDisabled: { color: colors.textFaint, opacity: 0.6 },
  sheetBody: { fontFamily: font.body, fontSize: 13.5, color: colors.textDim, lineHeight: 20, marginBottom: 16 },
  pwError: { fontFamily: font.semibold, fontSize: 12, color: colors.danger, marginBottom: 10 },
});
