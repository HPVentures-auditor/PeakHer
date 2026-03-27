/**
 * Patterns Tab
 *
 * Shows detected patterns after 14+ check-ins.
 * Before that, shows progress toward unlocking.
 * After 25+, also shows AI insights.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import * as api from '../../src/services/api';
import { Button } from '../../src/components/Button';

const PATTERNS_REQUIRED = 14;
const INSIGHTS_REQUIRED = 25;

export default function PatternsScreen() {
  const { checkinCount } = useAuthStore();
  const [patterns, setPatterns] = useState<api.PatternsResponse | null>(null);
  const [insights, setInsights] = useState<api.InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [patternsData, insightsData] = await Promise.all([
        api.getPatterns(),
        checkinCount >= INSIGHTS_REQUIRED ? api.getInsights() : Promise.resolve(null),
      ]);
      setPatterns(patternsData);
      if (insightsData) setInsights(insightsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load patterns';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [checkinCount]);

  useEffect(() => {
    fetchData();
  }, []);

  // Not enough check-ins yet
  if (checkinCount < PATTERNS_REQUIRED && !patterns?.ready) {
    const progress = checkinCount / PATTERNS_REQUIRED;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedEmoji}>{'\u{1F512}'}</Text>
          <Text style={styles.lockedTitle}>Patterns unlock soon</Text>
          <Text style={styles.lockedSubtext}>
            Complete {PATTERNS_REQUIRED - checkinCount} more check-in
            {PATTERNS_REQUIRED - checkinCount !== 1 ? 's' : ''} to start seeing
            your performance patterns.
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {checkinCount} / {PATTERNS_REQUIRED} check-ins
            </Text>
          </View>

          {checkinCount < INSIGHTS_REQUIRED && (
            <View style={styles.insightsPreview}>
              <Text style={styles.insightsPreviewTitle}>
                {'\u{2728}'} AI Insights unlock at {INSIGHTS_REQUIRED} check-ins
              </Text>
              <Text style={styles.insightsPreviewText}>
                Personalized pattern analysis, week-ahead predictions, and
                actionable recommendations powered by AI.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor={Colors.coral}
          />
        }
      >
        <Text style={styles.title}>Your Patterns</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={fetchData} variant="outline" size="sm" />
          </View>
        ) : null}

        {/* Statistical patterns */}
        {patterns?.ready && patterns.patterns && patterns.patterns.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected patterns</Text>
            <Text style={styles.sectionSubtitle}>
              Based on {patterns.summary?.totalCheckins} check-ins
            </Text>
            {patterns.patterns.map((p, index) => (
              <View
                key={index}
                style={[
                  styles.patternCard,
                  {
                    borderLeftColor: p.positive ? Colors.build : Colors.coral,
                  },
                ]}
              >
                <View style={styles.patternHeader}>
                  <Text style={styles.patternType}>
                    {p.type.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.patternConfidence,
                      {
                        color: p.positive ? Colors.build : Colors.coral,
                      },
                    ]}
                  >
                    {Math.round(p.confidenceScore * 100)}% confidence
                  </Text>
                </View>
                <Text style={styles.patternDescription}>{p.description}</Text>
              </View>
            ))}
          </View>
        ) : patterns?.ready ? (
          <View style={styles.emptyPatterns}>
            <Text style={styles.emptyText}>
              No statistically significant patterns detected yet. Keep checking
              in — they'll emerge as more data comes in.
            </Text>
          </View>
        ) : null}

        {/* AI Insights */}
        {insights?.ready && insights.patternInsights ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{'\u{2728}'} AI Insights</Text>
            {insights.patternInsights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View
                    style={[
                      styles.sentimentDot,
                      {
                        backgroundColor:
                          insight.sentiment === 'positive'
                            ? Colors.build
                            : insight.sentiment === 'negative'
                              ? Colors.coral
                              : Colors.gray400,
                      },
                    ]}
                  />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description}
                </Text>
                {insight.actionTip && (
                  <View style={styles.actionTipContainer}>
                    <Text style={styles.actionTipLabel}>Action tip</Text>
                    <Text style={styles.actionTipText}>
                      {insight.actionTip}
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {/* Week ahead */}
            {insights.weekAheadNarrative?.summary && (
              <View style={styles.weekAheadCard}>
                <Text style={styles.weekAheadTitle}>Week Ahead</Text>
                <Text style={styles.weekAheadSummary}>
                  {insights.weekAheadNarrative.summary}
                </Text>
                {insights.weekAheadNarrative.bestDayTip && (
                  <Text style={styles.weekAheadDetail}>
                    {'\u{1F31F}'} {insights.weekAheadNarrative.bestDayTip}
                  </Text>
                )}
                {insights.weekAheadNarrative.watchOut && (
                  <Text style={styles.weekAheadDetail}>
                    {'\u{26A0}\uFE0F'} {insights.weekAheadNarrative.watchOut}
                  </Text>
                )}
              </View>
            )}

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <View style={styles.recsContainer}>
                <Text style={styles.recsTitle}>Recommendations</Text>
                {insights.recommendations.map((rec) => (
                  <View key={rec.id} style={styles.recItem}>
                    <View
                      style={[
                        styles.recPriority,
                        {
                          backgroundColor:
                            rec.priority === 'high'
                              ? Colors.coral
                              : rec.priority === 'medium'
                                ? Colors.complete
                                : Colors.gray400,
                        },
                      ]}
                    />
                    <Text style={styles.recText}>{rec.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : checkinCount >= PATTERNS_REQUIRED && checkinCount < INSIGHTS_REQUIRED ? (
          <View style={styles.insightsLockNotice}>
            <Text style={styles.insightsLockText}>
              {'\u{2728}'} AI Insights unlock after{' '}
              {INSIGHTS_REQUIRED - checkinCount} more check-in
              {INSIGHTS_REQUIRED - checkinCount !== 1 ? 's' : ''}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(checkinCount / INSIGHTS_REQUIRED) * 100}%`,
                      backgroundColor: Colors.teal,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {checkinCount} / {INSIGHTS_REQUIRED}
              </Text>
            </View>
          </View>
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
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  // Locked state
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockedEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  lockedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  lockedSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.coral,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  insightsPreview: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  insightsPreviewTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
    marginBottom: Spacing.xs,
  },
  insightsPreviewText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  // Patterns
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.base,
  },
  patternCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  patternType: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  patternConfidence: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
  },
  patternDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyPatterns: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // AI Insights
  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  insightDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  actionTipContainer: {
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  actionTipLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionTipText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  weekAheadCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.tealLight,
  },
  weekAheadTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.teal,
    marginBottom: Spacing.sm,
  },
  weekAheadSummary: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  weekAheadDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  recsContainer: {
    marginTop: Spacing.md,
  },
  recsTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recPriority: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  recText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  insightsLockNotice: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  insightsLockText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.base,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    textAlign: 'center',
  },
});
