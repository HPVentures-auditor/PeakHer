/**
 * Today Tab — Daily Briefing Screen
 *
 * Shows the current cycle phase, daily briefing, recommendations,
 * streak info, and a check-in button.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, ModeColors, ModeNames, ModeEmojis } from '../../src/constants/theme';
import { useBriefingStore } from '../../src/stores/briefingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { PhaseIndicator } from '../../src/components/PhaseIndicator';
import { BriefingSkeleton } from '../../src/components/LoadingSkeleton';
import { Button } from '../../src/components/Button';
import { getDailyMode, DailyModeResponse } from '../../src/services/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TodayScreen() {
  const { briefing, isLoading, error, fetchBriefing } = useBriefingStore();
  const { user, streak } = useAuthStore();
  const router = useRouter();

  const [dailyMode, setDailyMode] = useState<DailyModeResponse | null>(null);
  const [dailyModeExpanded, setDailyModeExpanded] = useState(false);

  useEffect(() => {
    fetchBriefing();
    getDailyMode()
      .then(setDailyMode)
      .catch(() => setDailyMode(null));
  }, []);

  const onRefresh = useCallback(() => {
    fetchBriefing(true);
    getDailyMode()
      .then(setDailyMode)
      .catch(() => setDailyMode(null));
  }, []);

  const toggleDailyModeExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDailyModeExpanded((prev) => !prev);
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
  const ai = briefing?.aiBriefing || null;

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

            {/* Daily Mode — traffic-light card */}
            {dailyMode && (
              <TouchableOpacity
                style={[
                  styles.dailyModeCard,
                  {
                    borderLeftColor:
                      dailyMode.mode === 'green'
                        ? '#00E5A0'
                        : dailyMode.mode === 'yellow'
                        ? '#FFD700'
                        : '#FF6B6B',
                  },
                ]}
                onPress={toggleDailyModeExpanded}
                activeOpacity={0.8}
              >
                {/* Top row: emoji + label + score */}
                <View style={styles.dailyModeHeader}>
                  <Text style={styles.dailyModeEmoji}>{dailyMode.emoji}</Text>
                  <View style={styles.dailyModeHeaderText}>
                    <Text
                      style={[
                        styles.dailyModeLabel,
                        {
                          color:
                            dailyMode.mode === 'green'
                              ? '#00E5A0'
                              : dailyMode.mode === 'yellow'
                              ? '#FFD700'
                              : '#FF6B6B',
                        },
                      ]}
                    >
                      {dailyMode.label}
                    </Text>
                    <View style={styles.dailyModeScoreRow}>
                      <View
                        style={[
                          styles.dailyModeScoreBar,
                          {
                            backgroundColor:
                              dailyMode.mode === 'green'
                                ? 'rgba(0, 229, 160, 0.15)'
                                : dailyMode.mode === 'yellow'
                                ? 'rgba(255, 215, 0, 0.15)'
                                : 'rgba(255, 107, 107, 0.15)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.dailyModeScoreFill,
                            {
                              width: `${dailyMode.score}%`,
                              backgroundColor:
                                dailyMode.mode === 'green'
                                  ? '#00E5A0'
                                  : dailyMode.mode === 'yellow'
                                  ? '#FFD700'
                                  : '#FF6B6B',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dailyModeScoreText}>{dailyMode.score}</Text>
                    </View>
                  </View>
                  <Text style={styles.dailyModeChevron}>
                    {dailyModeExpanded ? '\u25B2' : '\u25BC'}
                  </Text>
                </View>

                {/* Headline from Dot */}
                <Text style={styles.dailyModeHeadline}>{dailyMode.headline}</Text>

                {/* Factor chips */}
                <View style={styles.dailyModeFactors}>
                  {dailyMode.factors.phase && (
                    <View style={styles.dailyModeChip}>
                      <View
                        style={[
                          styles.dailyModeChipDot,
                          {
                            backgroundColor:
                              dailyMode.factors.phase.contribution === 'positive'
                                ? '#00E5A0'
                                : dailyMode.factors.phase.contribution === 'neutral'
                                ? '#FFD700'
                                : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={styles.dailyModeChipText}>
                        {dailyMode.factors.phase.label}
                      </Text>
                    </View>
                  )}
                  {dailyMode.factors.energy && (
                    <View style={styles.dailyModeChip}>
                      <View
                        style={[
                          styles.dailyModeChipDot,
                          {
                            backgroundColor:
                              dailyMode.factors.energy.contribution === 'positive'
                                ? '#00E5A0'
                                : dailyMode.factors.energy.contribution === 'neutral'
                                ? '#FFD700'
                                : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={styles.dailyModeChipText}>
                        {dailyMode.factors.energy.label}
                      </Text>
                    </View>
                  )}
                  {dailyMode.factors.recovery && (
                    <View style={styles.dailyModeChip}>
                      <View
                        style={[
                          styles.dailyModeChipDot,
                          {
                            backgroundColor:
                              dailyMode.factors.recovery.contribution === 'positive'
                                ? '#00E5A0'
                                : dailyMode.factors.recovery.contribution === 'neutral'
                                ? '#FFD700'
                                : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={styles.dailyModeChipText}>
                        {dailyMode.factors.recovery.label}
                      </Text>
                    </View>
                  )}
                  {dailyMode.factors.calendar && (
                    <View style={styles.dailyModeChip}>
                      <View
                        style={[
                          styles.dailyModeChipDot,
                          {
                            backgroundColor:
                              dailyMode.factors.calendar.contribution === 'positive'
                                ? '#00E5A0'
                                : dailyMode.factors.calendar.contribution === 'neutral'
                                ? '#FFD700'
                                : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={styles.dailyModeChipText}>
                        {dailyMode.factors.calendar.label}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Expandable action items */}
                {dailyModeExpanded && (
                  <View style={styles.dailyModeActions}>
                    <View style={styles.dailyModeActionRow}>
                      <View style={[styles.dailyModeActionIcon, { backgroundColor: 'rgba(0, 229, 160, 0.15)' }]}>
                        <Text style={styles.dailyModeActionEmoji}>{'\u26A1'}</Text>
                      </View>
                      <View style={styles.dailyModeActionContent}>
                        <Text style={[styles.dailyModeActionLabel, { color: '#00E5A0' }]}>
                          Tackle
                        </Text>
                        <Text style={styles.dailyModeActionText}>
                          {dailyMode.actions.tackle}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dailyModeActionRow}>
                      <View style={[styles.dailyModeActionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                        <Text style={styles.dailyModeActionEmoji}>{'\u23F3'}</Text>
                      </View>
                      <View style={styles.dailyModeActionContent}>
                        <Text style={[styles.dailyModeActionLabel, { color: '#FFD700' }]}>
                          Defer
                        </Text>
                        <Text style={styles.dailyModeActionText}>
                          {dailyMode.actions.defer}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dailyModeActionRow}>
                      <View style={[styles.dailyModeActionIcon, { backgroundColor: 'rgba(255, 107, 107, 0.15)' }]}>
                        <Text style={styles.dailyModeActionEmoji}>{'\u{1F6E1}\u{FE0F}'}</Text>
                      </View>
                      <View style={styles.dailyModeActionContent}>
                        <Text style={[styles.dailyModeActionLabel, { color: '#FF6B6B' }]}>
                          Protect
                        </Text>
                        <Text style={styles.dailyModeActionText}>
                          {dailyMode.actions.protect}
                        </Text>
                      </View>
                    </View>

                    {/* Dot note */}
                    <Text style={styles.dailyModeDotNote}>
                      {'\u{1F4AC}'} {dailyMode.dotNote}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Phase Guide quick access */}
            {briefing.phase && (
              <TouchableOpacity
                style={[styles.guideCard, { borderColor: phaseColor + '40' }]}
                onPress={() => {
                  const phaseKey =
                    briefing.phase === 'reflect' ? 'restore' :
                    briefing.phase === 'build' ? 'rise' :
                    briefing.phase === 'perform' ? 'peak' :
                    briefing.phase === 'complete' ? 'sustain' :
                    briefing.phase;
                  router.push({ pathname: '/phase-guide', params: { phase: phaseKey } });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.guideCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guideCardTitle}>
                      {ModeEmojis[briefing.phase]} What to eat, do & know right now
                    </Text>
                    <Text style={styles.guideCardSubtext}>
                      Nutrition, workouts, fasting & schedule tips for {ModeNames[briefing.phase]}
                    </Text>
                  </View>
                  <Text style={[styles.guideCardArrow, { color: phaseColor }]}>{'\u203A'}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* AI + not-medical-advice disclosure pill */}
            <View style={styles.aiDisclosurePill}>
              <Text style={styles.aiDisclosurePillEmoji}>{'\u{1F4AC}'}</Text>
              <Text style={styles.aiDisclosurePillText}>
                Dot's brief is AI-generated (Anthropic Claude) from what you've shared. <Text style={styles.aiDisclosurePillBold}>Not medical advice.</Text>
              </Text>
            </View>

            {/* Headline — from AI or static */}
            <View style={[styles.headlineCard, { borderLeftColor: phaseColor }]}>
              <Text style={styles.headline}>
                {ai?.phaseOverview?.headline || briefing.headline}
              </Text>
              <Text style={styles.summary}>
                {ai?.phaseOverview?.summary || briefing.summary}
              </Text>
            </View>

            {/* Key Insight — screenshot-worthy one-liner */}
            {ai?.keyInsight && (
              <View style={[styles.keyInsightCard, { borderColor: phaseColor + '40' }]}>
                <Text style={styles.keyInsightLabel}>{'\u{1F4F8}'} Today's key insight</Text>
                <Text style={styles.keyInsightText}>{ai.keyInsight}</Text>
              </View>
            )}

            {/* AI-enriched sections (v2) — or fallback to v1 recs */}
            {ai ? (
              <View style={styles.recsSection}>
                {/* Nutrition */}
                <View style={styles.aiSectionCard}>
                  <Text style={styles.aiSectionIcon}>{'\u{1F372}'}</Text>
                  <Text style={[styles.aiSectionTitle, { color: Colors.rise }]}>
                    {ai.nutrition?.headline || 'Nutrition'}
                  </Text>
                  <Text style={styles.aiSectionBody}>{ai.nutrition?.body}</Text>
                </View>

                {/* Movement */}
                <View style={styles.aiSectionCard}>
                  <Text style={styles.aiSectionIcon}>{'\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}'}</Text>
                  <Text style={[styles.aiSectionTitle, { color: Colors.peak }]}>
                    {ai.movement?.headline || 'Movement'}
                  </Text>
                  <Text style={styles.aiSectionBody}>{ai.movement?.body}</Text>
                </View>

                {/* Focus / Schedule */}
                <View style={styles.aiSectionCard}>
                  <Text style={styles.aiSectionIcon}>{'\u{1F4CB}'}</Text>
                  <Text style={[styles.aiSectionTitle, { color: Colors.teal }]}>
                    {ai.focus?.headline || 'Focus'}
                  </Text>
                  <Text style={styles.aiSectionBody}>{ai.focus?.body}</Text>
                </View>

                {/* Emotional Weather */}
                <View style={styles.aiSectionCard}>
                  <Text style={styles.aiSectionIcon}>{'\u{1F326}\u{FE0F}'}</Text>
                  <Text style={[styles.aiSectionTitle, { color: Colors.restore }]}>
                    {ai.emotionalWeather?.headline || 'Emotional Weather'}
                  </Text>
                  <Text style={styles.aiSectionBody}>{ai.emotionalWeather?.body}</Text>
                </View>

                {/* Schedule Insight (if calendar connected) */}
                {ai.scheduleInsight && (
                  <View style={[styles.scheduleCard, { borderLeftColor: phaseColor }]}>
                    <Text style={styles.scheduleLabel}>{'\u{1F4C5}'} Schedule intel</Text>
                    <Text style={styles.scheduleText}>{ai.scheduleInsight}</Text>
                  </View>
                )}
              </View>
            ) : briefing.recommendations ? (
              /* v1 static fallback */
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
            ) : null}

            {/* Fun fact (v1 only — AI briefing replaces this) */}
            {!ai && briefing.funFact && (
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
              {briefing.dotSignoff || ai?.dotSignoff
                ? `\u2014 Dot: ${briefing.dotSignoff || ai?.dotSignoff}`
                : `\u2014 Dot ${briefing.phase ? (ModeEmojis[briefing.phase] || '') : '\u{2728}'}`}
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
  guideCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  guideCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  guideCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  guideCardSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  guideCardArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
  keyInsightCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  keyInsightLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  keyInsightText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  aiSectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  aiSectionIcon: {
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  aiSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  aiSectionBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  scheduleLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    marginBottom: Spacing.sm,
  },
  scheduleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  aiDisclosurePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(45, 138, 138, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 138, 138, 0.3)',
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: Spacing.base,
  },
  aiDisclosurePillEmoji: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 1,
  },
  aiDisclosurePillText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  aiDisclosurePillBold: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
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

  // ---------------------------------------------------------------------------
  // Daily Mode card
  // ---------------------------------------------------------------------------
  dailyModeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  dailyModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dailyModeEmoji: {
    fontSize: 36,
  },
  dailyModeHeaderText: {
    flex: 1,
  },
  dailyModeLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    marginBottom: Spacing.xs,
  },
  dailyModeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dailyModeScoreBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyModeScoreFill: {
    height: 6,
    borderRadius: 3,
  },
  dailyModeScoreText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    width: 24,
    textAlign: 'right',
  },
  dailyModeChevron: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  dailyModeHeadline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  dailyModeFactors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dailyModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  dailyModeChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dailyModeChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  dailyModeActions: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  dailyModeActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  dailyModeActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyModeActionEmoji: {
    fontSize: 14,
  },
  dailyModeActionContent: {
    flex: 1,
  },
  dailyModeActionLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  dailyModeActionText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  dailyModeDotNote: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
