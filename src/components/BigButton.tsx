import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '../theme';
import { tap } from '../lib/haptics';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'sun';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  full = true,
  size = 'md',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  disabled?: boolean;
  full?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const heights = { sm: 42, md: 54, lg: 62 };
  const fontSizes = { sm: 14, md: 17, lg: 20 };
  const palette: readonly [string, string] =
    variant === 'sun'
      ? (['#FFD23F', '#FF8A3D'] as const)
      : variant === 'secondary'
        ? (['#3EA8FF', '#7C4DFF'] as const)
        : variant === 'danger'
          ? (['#FF5E6C', '#B14BFF'] as const)
          : (['#7C4DFF', '#B14BFF'] as const);

  const textColor =
    variant === 'sun' ? '#3B1A00' : variant === 'ghost' || variant === 'soft' ? colors.white : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {variant === 'ghost' || variant === 'soft' ? (
        <View
          style={[
            styles.base,
            { height: heights[size], backgroundColor: variant === 'soft' ? colors.cardStrong : 'transparent' },
            variant === 'ghost' && styles.ghostBorder,
          ]}
        >
          <ButtonLabel label={label} icon={icon} color={textColor} size={fontSizes[size]} />
        </View>
      ) : (
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.shadow, { height: heights[size] }]}
        >
          <ButtonLabel label={label} icon={icon} color={textColor} size={fontSizes[size]} />
        </LinearGradient>
      )}
    </Pressable>
  );
}

function ButtonLabel({ label, icon, color, size }: { label: string; icon?: string; color: string; size: number }) {
  return (
    <View style={styles.labelRow}>
      {icon ? <Text style={{ fontSize: size * 0.95, color }}>{icon}</Text> : null}
      <Text style={{ fontFamily: font.bold, fontSize: size, color, textAlign: 'center', flexShrink: 1 }} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  emoji,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  emoji?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, { opacity: pressed ? 0.8 : 1 }]}
    >
      {emoji ? <Text style={{ fontSize: 15 }}>{emoji}</Text> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function IconSwitch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      accessibilityValue={{ text: value ? 'On' : 'Off' }}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={[styles.switchTrack, value && styles.switchTrackOn]}
    >
      <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  shadow: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 20px rgba(5,2,16,0.35)' }
      : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }),
  } as object,
  ghostBorder: { borderWidth: 1.5, borderColor: colors.border },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.textDim },
  chipTextActive: { color: '#2A1259' },
  switchTrack: {
    width: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: { backgroundColor: colors.mint },
  switchKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  switchKnobOn: { alignSelf: 'flex-end' },
});
