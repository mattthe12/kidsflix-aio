import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { BigButton } from '../components/BigButton';
import { colors, font, gradients, radius } from '../theme';
import { useApp } from '../state/AppProvider';

export function WelcomeScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const { t, settings } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const float = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settings.reduceMotion) {
      pop.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(float, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float, pop, settings.reduceMotion]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#2A1157', '#7C4DFF', '#FF5CA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.halo} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>
            <View style={styles.logoCard}>
              <Logo size={compact ? 32 : 40} />
              <Text style={styles.logoTag}>{t('tagline')}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.mascots, { transform: [{ translateY }] }]}>
            <Text style={styles.mascotBig}>🦊</Text>
            <Text style={styles.mascotSmall}>🐼</Text>
            <Text style={styles.mascotBig}>🦄</Text>
            <Text style={styles.mascotSmall}>🐙</Text>
          </Animated.View>

          <View style={styles.sparkles} pointerEvents="none">
            <Text style={[styles.sparkle, { top: 10, left: '12%', fontSize: 22 }]}>✨</Text>
            <Text style={[styles.sparkle, { top: 120, right: '8%', fontSize: 28 }]}>⭐</Text>
            <Text style={[styles.sparkle, { bottom: 40, left: '18%', fontSize: 18 }]}>🌈</Text>
          </View>

          <View style={styles.actions}>
            <BigButton label={t('getStarted')} icon="🚀" onPress={onStart} size="lg" />
            <BigButton label={t('haveAccount')} variant="ghost" onPress={onSignIn} />
            <Text style={styles.legal}>
              👨‍👩‍👧 Grown-ups create the account. Kids never see ads, comments or chat.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  halo: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -180,
    left: -160,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 26, justifyContent: 'space-between' },
  logoCard: {
    backgroundColor: 'rgba(12,6,30,0.35)',
    borderRadius: radius.xl,
    padding: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-start',
    maxWidth: 380,
  },
  logoTag: { fontFamily: font.medium, fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 20, maxWidth: 300 },
  mascots: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  mascotBig: { fontSize: 66 },
  mascotSmall: { fontSize: 46, marginBottom: 8 },
  sparkles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sparkle: { position: 'absolute', opacity: 0.9 },
  actions: { gap: 12, width: '100%', maxWidth: 440, alignSelf: 'center' },
  legal: {
    fontFamily: font.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
    ...(Platform.OS === 'web' ? { maxWidth: 380, alignSelf: 'center' } : null),
  },
});
