import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import { tap } from '../lib/haptics';

export function PINPad({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  maxLength = 4,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shake, { toValue: -1, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shake, { toValue: 0.6, duration: 70, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [error, shake]);

  const press = (digit: string) => {
    if (disabled) return;
    tap();
    if (value.length >= maxLength) return;
    const next = value + digit;
    onChange(next);
    if (next.length === maxLength) setTimeout(() => onComplete(next), 120);
  };

  const del = () => {
    if (disabled) return;
    tap();
    onChange(value.slice(0, -1));
  };

  return (
    <View style={[styles.wrap, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Animated.View style={[styles.dots, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] }]}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              value.length > i && styles.dotFilled,
              error && { backgroundColor: colors.danger, borderColor: colors.danger },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => {
          if (key === '') return <View key={idx} style={styles.key} />;
          const isDelete = key === '⌫';
          return (
            <Pressable
              key={idx}
              accessibilityRole="button"
              accessibilityLabel={isDelete ? 'Delete digit' : `Digit ${key}`}
              onPress={() => (isDelete ? del() : press(key))}
              disabled={disabled}
              accessibilityState={{ disabled }}
              style={({ pressed }) => [styles.key, styles.keyFace, isDelete && styles.keySoft, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.keyText, isDelete && { fontSize: 22 }]}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 24 },
  disabled: { opacity: 0.45 },
  dots: { flexDirection: 'row', gap: 16 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.white, borderColor: colors.white },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center' },
  key: { width: 78, height: 66, alignItems: 'center', justifyContent: 'center' },
  keyFace: { backgroundColor: colors.cardStrong, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  keySoft: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontFamily: font.displaySoft, fontSize: 28, color: colors.white },
});
