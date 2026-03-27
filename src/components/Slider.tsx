import React, { useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';

interface SliderProps {
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
  const [trackWidth, setTrackWidth] = React.useState(0);
  const fraction = (value - min) / (max - min);

  const clamp = useCallback(
    (v: number) => {
      const snapped = Math.round(v / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, step],
  );

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (trackWidth > 0) {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / trackWidth));
          onValueChange(clamp(min + frac * (max - min)));
        }
      },
      onPanResponderMove: (evt) => {
        if (trackWidth > 0) {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / trackWidth));
          onValueChange(clamp(min + frac * (max - min)));
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue && (
          <Text style={[styles.valueText, { color }]}>{value}</Text>
        )}
      </View>
      <View
        style={styles.trackContainer}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
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
              left: fraction * (trackWidth - THUMB_SIZE),
              backgroundColor: color,
            },
          ]}
        />
      </View>
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
    height: THUMB_SIZE + 8,
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
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
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
