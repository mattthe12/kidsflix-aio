import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, font, radius } from '../theme';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secure,
  error,
  helper,
  style,
  ...rest
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: string;
  secure?: boolean;
  error?: string;
  helper?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused, error ? styles.fieldError : null]}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={10}>
            <Text style={{ fontSize: 17 }}>{hidden ? '👁️' : '🙈'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7, marginBottom: 14 },
  label: { fontFamily: font.bold, fontSize: 13, color: colors.textDim, marginLeft: 6, letterSpacing: 0.3 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  fieldFocused: { borderColor: colors.primarySoft, backgroundColor: 'rgba(255,255,255,0.1)' },
  fieldError: { borderColor: colors.danger },
  icon: { fontSize: 18 },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.white,
    paddingVertical: 14,
    outlineStyle: 'none',
  } as object,
  error: { fontFamily: font.semibold, fontSize: 12, color: colors.danger, marginLeft: 6 },
  helper: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint, marginLeft: 6, textAlign: 'right' },
});
