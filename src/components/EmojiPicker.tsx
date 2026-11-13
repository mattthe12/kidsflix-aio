import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AVATARS, type AvatarOption } from '../data/avatars';
import { colors, font, radius } from '../theme';
import { columnsFor } from '../lib/responsive';
import { tap } from '../lib/haptics';

/**
 * A measured emoji grid: the number of columns and the tile size are derived
 * from the actual container width, so glyphs never spill off a narrow phone.
 */
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatarId: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const gap = 10;
  const available = gridWidth > 0 ? gridWidth : Math.max(0, Math.min(screenWidth - 44, 560));
  const columns = columnsFor(available, 58, gap, 8);
  const tile = Math.max(44, Math.min(72, (available - gap * (columns - 1)) / columns));

  const pick = useCallback(
    (option: AvatarOption) => {
      tap();
      onChange(option.id);
    },
    [onChange]
  );

  return (
    <View
      style={styles.grid}
      onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel="Choose a cartoon buddy"
    >
      {AVATARS.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => pick(option)}
            accessibilityRole="radio"
            accessibilityLabel={`Buddy ${option.label}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.tile,
              {
                width: tile,
                height: tile,
                borderRadius: Math.max(14, tile * 0.28),
                opacity: pressed ? 0.78 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
              selected && styles.tileOn,
            ]}
          >
            <LinearGradient colors={option.colors} style={StyleSheet.absoluteFill} />
            <Text
              style={{
                fontSize: Math.max(22, tile * 0.5),
                lineHeight: Math.max(28, tile * 0.62),
                textAlign: 'center',
              }}
            >
              {option.emoji}
            </Text>
            {selected ? (
              <View style={[styles.check, { width: Math.max(16, tile * 0.26), height: Math.max(16, tile * 0.26), borderRadius: 999 }]}>
                <Text style={{ fontSize: Math.max(9, tile * 0.14) }}>✓</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignContent: 'center',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: colors.white },
  check: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
