import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function BriefingSkeleton() {
  return (
    <View style={styles.container}>
      <LoadingSkeleton width={120} height={14} style={styles.gap} />
      <LoadingSkeleton width="80%" height={28} style={styles.gap} />
      <LoadingSkeleton height={60} style={styles.gap} />
      <LoadingSkeleton height={100} borderRadius={BorderRadius.lg} style={styles.gap} />
      <LoadingSkeleton height={100} borderRadius={BorderRadius.lg} style={styles.gap} />
      <LoadingSkeleton height={80} borderRadius={BorderRadius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  gap: {
    marginBottom: 16,
  },
});
