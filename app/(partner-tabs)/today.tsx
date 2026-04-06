/**
 * Partner Today Screen — Dot's daily intel for the partner.
 * Shows headline, intel sections (vibe, do/don't, snack, connection tip), sign-off.
 * Handles paused state gracefully.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, ModeColors } from '../../src/constants/theme';
import { usePartnerStore } from '../../src/stores/partnerStore';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/Button';

export default function PartnerTodayScreen() {
  const { briefing, isLoading, error, fetchBriefing } = usePartnerStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchBriefing();
  }, []);

  const onRefresh = useCallback(() => {
    fetchBriefing(true);
  }, []);

  const phase = briefing?.mode?.toLowerCase() || '';
  const phaseKey = phase === 'restore' ? 'restore' : phase === 'rise' ? 'rise' : phase === 'peak' ? 'peak' : phase === 'sustain' ? 'sustain' : '';
  const phaseColor = phaseKey ? (ModeColors[phaseKey] || Colors.teal) : Colors.teal;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.teal} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hey, {user?.name?.split(' ')[0] || 'there'}
          </Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' \u00B7 '}{'\u{1F4AC}'} Partner Intel from Dot
          </Text>
        </View>

        {error && !briefing ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={() => fetchBriefing(true)} variant="outline" size="sm" />
          </View>
        ) : briefing?.paused ? (
          /* Paused state */
          <View style={styles.pausedContainer}>
            <Text style={styles.pausedEmoji}>{'\u{1F512}'}</Text>
            <Text style={styles.pausedTitle}>Sharing paused</Text>
            <Text style={styles.pausedText}>
              {briefing.message || "She's pressed pause on sharing. This is healthy. She'll let you back in when she's ready."}
            </Text>
            <Text style={styles.pausedSignoff}>{'\u2014'} Dot</Text>
          </View>
        ) : briefing ? (
          <>
            {/* Mode badge */}
            {briefing.mode && (
              <View style={[styles.modeBadge, { borderColor: phaseColor }]}>
                <Text style={[styles.modeText, { color: phaseColor }]}>
                  {briefing.modeEmoji} {briefing.mode}
                </Text>
              </View>
            )}

            {/* Headline */}
            <View style={[styles.headlineCard, { borderLeftColor: phaseColor }]}>
              <Text style={styles.headline}>{briefing.headline}</Text>
            </View>

            {/* Intel sections */}
            {briefing.intel && (
              <>
                {/* Vibe */}
                <View style={styles.intelCard}>
                  <Text style={styles.intelLabel}>{'\u{1F3AF}'} The vibe</Text>
                  <Text style={styles.intelText}>{briefing.intel.vibe}</Text>
                </View>

                {/* Do this */}
                <View style={styles.intelCard}>
                  <Text style={[styles.intelLabel, { color: Colors.rise }]}>
                    {'\u2705'} Do this
                  </Text>
                  <Text style={styles.intelText}>{briefing.intel.doThis}</Text>
                </View>

                {/* Don't do this */}
                <View style={styles.intelCard}>
                  <Text style={[styles.intelLabel, { color: Colors.sustain }]}>
                    {'\u{1F6D1}'} Don't do this
                  </Text>
                  <Text style={styles.intelText}>{briefing.intel.dontDoThis}</Text>
                </View>

                {/* Snack Intel */}
                <View style={styles.intelCard}>
                  <Text style={[styles.intelLabel, { color: Colors.peak }]}>
                    {'\u{1F36B}'} Snack intel
                  </Text>
                  <Text style={styles.intelText}>{briefing.intel.snackIntel}</Text>
                </View>

                {/* Connection tip */}
                <View style={[styles.intelCard, { borderWidth: 1, borderColor: Colors.teal + '30' }]}>
                  <Text style={[styles.intelLabel, { color: Colors.teal }]}>
                    {'\u{1F49C}'} How to connect
                  </Text>
                  <Text style={styles.intelText}>{briefing.intel.connectionTip}</Text>
                </View>

                {/* From Her — personal message */}
                {briefing.intel.fromHer && (
                  <View style={[styles.fromHerCard, { borderLeftColor: phaseColor }]}>
                    <Text style={styles.fromHerLabel}>{'\u{1F48C}'} From her</Text>
                    <Text style={styles.fromHerText}>{briefing.intel.fromHer}</Text>
                  </View>
                )}
              </>
            )}

            {/* Dot sign-off */}
            <Text style={[styles.signoff, { color: phaseColor }]}>
              {'\u2014'} Dot: {briefing.dotSignoff || 'You got this.'}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.base,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    textAlign: 'center',
  },
  pausedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  pausedEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  pausedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  pausedText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  pausedSignoff: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  modeBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.base,
  },
  modeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  headlineCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  headline: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  intelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  intelLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  intelText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  fromHerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  fromHerLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.coral,
    marginBottom: Spacing.sm,
  },
  fromHerText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  signoff: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
