/**
 * Today Tab — Daily Briefing Screen
 *
 * Shows the current cycle phase, daily briefing, recommendations,
 * streak info, and a check-in button.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, ModeColors, ModeNames, ModeEmojis } from '../../src/constants/theme';
import { useBriefingStore } from '../../src/stores/briefingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { PhaseIndicator } from '../../src/components/PhaseIndicator';
import { BriefingSkeleton } from '../../src/components/LoadingSkeleton';
import { Button } from '../../src/components/Button';

export default function TodayScreen() {
  const { briefing, isLoading, error, fetchBriefing } = useBriefingStore();
  const { user, streak } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchBriefing();
  }, []);

  const onRefresh = useCallback(() => {
    fetchBriefing(true);
  }, []);

  if (isLoading && !briefing) {
    return (
      <SafeAreaView style={styles.safe}>
        <BriefingSkeleton />
      </SafeAreaView>
    );
  }

  const phase = briefing?.phase || 'build';
  const phaseColor = ModeColors[phase] || Colors.teal;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.coral}
          />
        }
      >
        {/* Header — Dot greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
            </Text>
            <Text style={styles.date}>
              {formatDate(new Date())} {'\u00B7'} {'\u{1F4AC}'} from Dot
            </Text>
          </View>
          {streak && streak.current > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>{'\u{1F525}'}</Text>
              <Text style={styles.streakCount}>{streak.current}</Text>
            </View>
          )}
        </View>

        {error && !briefing ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Retry"
              onPress={() => fetchBriefing(true)}
              variant="outline"
              size="sm"
            />
          </View>
        ) : briefing ? (
          <>
            {/* Phase indicator — only show when phase is recognized */}
            {briefing.phase && ModeColors[briefing.phase] && (
              <PhaseIndicator
                phase={briefing.phase}
                cycleDay={briefing.cycleDay}
                totalDays={briefing.phaseTotalDays}
              />
            )}

            {/* Headline */}
            <View style={[styles.headlineCard, { borderLeftColor: phaseColor }]}>
              <Text style={styles.headline}>{briefing.headline}</Text>
              <Text style={styles.summary}>{briefing.summary}</Text>
            </View>

            {/* Energy forecast */}
            <View style={styles.forecastRow}>
              <View style={styles.forecastItem}>
                <Text style={styles.forecastLabel}>Energy</Text>
                <Text style={[styles.forecastValue, { color: phaseColor }]}>
                  {briefing.todayEnergy}
                </Text>
              </View>
              <View style={styles.forecastDivider} />
              <View style={styles.forecastItem}>
                <Text style={styles.forecastLabel}>Forecast</Text>
                <Text style={[styles.forecastValue, { color: phaseColor }]}>
                  {briefing.energyForecast}
                </Text>
              </View>
            </View>

            {/* Recommendations */}
            {briefing.recommendations && (
              <View style={styles.recsSection}>
                <Text style={styles.recsTitle}>Today's playbook</Text>
                {Object.entries(briefing.recommendations).map(([key, rec]) => (
                  <View key={key} style={styles.recCard}>
                    <Text style={styles.recCategory}>{rec.title}</Text>
                    <Text style={styles.recTip}>{rec.tip}</Text>
                    <View style={styles.recDetails}>
                      <View style={styles.recDetailItem}>
                        <Text style={styles.recDoLabel}>Do this</Text>
                        <Text style={styles.recDoText}>{rec.doThis}</Text>
                      </View>
                      <View style={styles.recDetailItem}>
                        <Text style={styles.recSkipLabel}>Skip this</Text>
                        <Text style={styles.recSkipText}>{rec.skipThis}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Fun fact */}
            {briefing.funFact && (
              <View style={styles.funFactCard}>
                <Text style={styles.funFactLabel}>Did you know?</Text>
                <Text style={styles.funFactText}>{briefing.funFact}</Text>
              </View>
            )}

            {/* Recent trend */}
            {briefing.recentTrend && briefing.recentTrend.checkinCount > 0 && (
              <View style={styles.trendCard}>
                <Text style={styles.trendTitle}>7-day averages</Text>
                <View style={styles.trendRow}>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendValue}>
                      {briefing.recentTrend.avgEnergy}
                    </Text>
                    <Text style={styles.trendLabel}>Energy</Text>
                  </View>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendValue}>
                      {briefing.recentTrend.avgConfidence}
                    </Text>
                    <Text style={styles.trendLabel}>Confidence</Text>
                  </View>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendValue}>
                      {briefing.recentTrend.checkinCount}
                    </Text>
                    <Text style={styles.trendLabel}>Check-ins</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Dot sign-off */}
            <Text style={styles.dotSignoff}>
              — Dot {briefing.phase ? (ModeEmojis[briefing.phase] || '') : '\u{2728}'}
            </Text>

            {/* Check-in CTA */}
            {!briefing.hasCheckedInToday && (
              <View style={styles.ctaContainer}>
                <Text style={styles.ctaPrompt}>
                  Haven't checked in yet — Dot needs your pulse.
                </Text>
                <Button
                  title="Check in now"
                  onPress={() => router.push('/(tabs)/checkin')}
                  size="lg"
                />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakCount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.coral,
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
  headlineCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  headline: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summary: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  forecastRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
  },
  forecastDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  forecastLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  forecastValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    textTransform: 'capitalize',
  },
  recsSection: {
    marginBottom: Spacing.base,
  },
  recsTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  recCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  recCategory: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  recTip: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  recDetails: {
    gap: Spacing.sm,
  },
  recDetailItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  recDoLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.rise,
    width: 64,
  },
  recDoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  recSkipLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.coral,
    width: 64,
  },
  recSkipText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  funFactCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  funFactLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
    marginBottom: Spacing.xs,
  },
  funFactText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  trendTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  trendLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  dotSignoff: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'right',
    fontStyle: 'italic',
    marginBottom: Spacing.xl,
  },
  ctaPrompt: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  ctaContainer: {
    marginTop: Spacing.lg,
  },
});
