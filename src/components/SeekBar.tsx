import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { clamp } from '../lib/format';
import { colors } from '../theme';

export function SeekBar({
  value,
  max,
  onSeek,
  onScrubStart,
  onScrubEnd,
  color = colors.pink,
  trackColor = 'rgba(255,255,255,0.28)',
  height = 6,
  thumb = true,
  disabled,
  style,
}: {
  value: number;
  max: number;
  onSeek: (next: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: (next: number) => void;
  color?: string;
  trackColor?: string;
  height?: number;
  thumb?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const maxRef = useRef(max);
  maxRef.current = max;
  const seekRef = useRef(onSeek);
  seekRef.current = onSeek;
  const scrubStartRef = useRef(onScrubStart);
  scrubStartRef.current = onScrubStart;
  const scrubEndRef = useRef(onScrubEnd);
  scrubEndRef.current = onScrubEnd;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const respond = (x: number) => {
    if (disabledRef.current || widthRef.current <= 0) return;
    const ratio = clamp(x / widthRef.current, 0, 1);
    seekRef.current(ratio * maxRef.current);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (evt) => {
        scrubStartRef.current?.();
        respond(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => respond(evt.nativeEvent.locationX),
      onPanResponderRelease: (evt) => {
        scrubEndRef.current?.(clamp(evt.nativeEvent.locationX / Math.max(widthRef.current, 1), 0, 1) * maxRef.current);
      },
    })
  ).current;

  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        widthRef.current = w;
        setWidth(w);
      }}
      style={[styles.touch, { opacity: disabled ? 0.5 : 1 }, style]}
      accessibilityRole="adjustable"
      accessibilityLabel="Seek bar"
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}
    >
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
        {thumb ? (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: color,
                left: Math.max(0, Math.min(width - 14, ratio * width - 7)),
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { paddingVertical: 12, justifyContent: 'center', width: '100%' },
  track: { width: '100%', overflow: 'visible' },
  fill: { height: '100%' },
  thumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
