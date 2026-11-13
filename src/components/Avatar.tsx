import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { avatarFor } from '../data/avatars';
import { colors } from '../theme';

export function Avatar({
  avatarId,
  size = 52,
  ring = true,
  style,
}: {
  avatarId: string;
  size?: number;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const avatar = avatarFor(avatarId);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring ? 3 : 0,
          borderColor: 'rgba(255,255,255,0.75)',
        },
        style,
      ]}
    >
      <LinearGradient colors={avatar.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={{ fontSize: size * 0.5 }}>{avatar.emoji}</Text>
    </View>
  );
}

export function AvatarBadge({ avatarId, size = 70 }: { avatarId: string; size?: number }) {
  return (
    <View>
      <Avatar avatarId={avatarId} size={size} />
      <View style={styles.sparkle}>
        <Text style={{ fontSize: size * 0.2 }}>✨</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  sparkle: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
