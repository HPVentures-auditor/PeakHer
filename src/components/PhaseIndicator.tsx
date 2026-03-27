import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, ModeColors, ModeNames, ModeEmojis, Typography, BorderRadius, Spacing } from '../constants/theme';

interface PhaseIndicatorProps {
  phase: string;
  cycleDay?: number | null;
  totalDays?: number | null;
  compact?: boolean;
}

export function PhaseIndicator({ phase, cycleDay, totalDays, compact = false }: PhaseIndicatorProps) {
  const color = ModeColors[phase] || Colors.teal;
  const name = ModeNames[phase] || phase;
  const emoji = ModeEmojis[phase] || '';

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: color }]}>
        <Text style={[styles.compactText, { color }]}>
          {emoji} {name}
          {cycleDay ? ` \u00B7 Day ${cycleDay}` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <Text style={[styles.emoji]}>{emoji}</Text>
        <Text style={[styles.phaseName, { color }]}>{name}</Text>
      </View>
      {cycleDay != null && (
        <Text style={styles.cycleDay}>
          Cycle Day {cycleDay}
          {totalDays ? ` of ${totalDays}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 20,
  },
  phaseName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
  },
  cycleDay: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  compactContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
});
