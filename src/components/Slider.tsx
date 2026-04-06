import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';

export interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
  showValue?: boolean;
}

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 28;

export function Slider({
  label,
  value,
  onValueChange,
  min = 1,
  max = 10,
  step = 1,
  color = Colors.coral,
  showValue = true,
}: SliderProps) {
  const trackWidth = useSharedValue(0);
  const fraction = (value - min) / (max - min);

  // Keep latest callback in a ref so the gesture always calls the current one
  const onChangeRef = useRef(onValueChange);
  onChangeRef.current = onValueChange;

  const clampAndSnap = useCallback(
    (v: number) => {
      const snapped = Math.round(v / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, step],
  );

  const updateValue = useCallback(
    (x: number) => {
      const w = trackWidth.value;
      if (w <= 0) return;
      const frac = Math.max(0, Math.min(1, x / w));
      const newVal = clampAndSnap(min + frac * (max - min));
      onChangeRef.current(newVal);
    },
    [min, max, clampAndSnap],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .failOffsetY([-20, 20])
    .onStart((e) => {
      runOnJS(updateValue)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(updateValue)(e.x);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(updateValue)(e.x);
  });

  const gesture = Gesture.Race(pan, tap);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue && (
          <Text style={[styles.valueText, { color }]}>{value}</Text>
        )}
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.trackContainer}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.track}>
            <View
              style={[
                styles.trackFill,
                { width: `${fraction * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              {
                left: `${fraction * 100}%`,
                marginLeft: -(THUMB_SIZE / 2),
                backgroundColor: color,
              },
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <View style={styles.minMaxRow}>
        <Text style={styles.minMaxText}>{min}</Text>
        <Text style={styles.minMaxText}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  valueText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
  },
  trackContainer: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: Colors.surfaceLight,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (THUMB_SIZE + 16 - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  minMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  minMaxText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
});
