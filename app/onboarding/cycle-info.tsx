/**
 * Onboarding Step 3: Cycle Information
 * Date picker for last period, cycle length slider, option to skip.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';
import { Slider } from '../../src/components/Slider';

export default function CycleInfoScreen() {
  const [trackCycle, setTrackCycle] = useState(true);
  const [cycleLength, setCycleLength] = useState(28);
  const [lastPeriodDay, setLastPeriodDay] = useState<number | null>(null);
  const [showEstimateHelp, setShowEstimateHelp] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Simple date selector — days ago
  const dayOptions = Array.from({ length: 35 }, (_, i) => i);

  function handleNext() {
    const cycleProfile = trackCycle
      ? {
          trackingEnabled: true,
          averageCycleLength: cycleLength,
          lastPeriodStart: lastPeriodDay != null
            ? getDateDaysAgo(lastPeriodDay)
            : undefined,
        }
      : { trackingEnabled: false };

    router.push({
      pathname: '/onboarding/first-checkin',
      params: {
        personas: params.personas as string,
        coachVoice: params.coachVoice as string,
        cycleProfile: JSON.stringify(cycleProfile),
      },
    });
  }

  function getDateDaysAgo(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress dots */}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[styles.dot, step <= 3 && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Cycle tracking</Text>
        <Text style={styles.subtext}>
          This unlocks phase-based insights — your energy, confidence, and
          performance mapped to your cycle.
        </Text>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Track my cycle</Text>
          <Switch
            value={trackCycle}
            onValueChange={setTrackCycle}
            trackColor={{ false: Colors.surfaceLight, true: Colors.teal }}
            thumbColor={Colors.white}
          />
        </View>

        {trackCycle && (
          <>
            {/* Cycle Length */}
            <View style={styles.section}>
              <Slider
                label="Average cycle length"
                value={cycleLength}
                onValueChange={(v) => setCycleLength(Math.round(v))}
                min={21}
                max={40}
                step={1}
                color={Colors.teal}
              />
              <Text style={styles.hint}>
                Most cycles are 26-32 days. Don't worry if you're not sure —
                the app learns over time.
              </Text>
            </View>

            {/* Last Period Start */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                When did your last period start?
              </Text>

              {!showEstimateHelp ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dayScroll}
                    contentContainerStyle={styles.dayScrollContent}
                  >
                    {dayOptions.map((day) => {
                      const isSelected = lastPeriodDay === day;
                      const dateLabel =
                        day === 0
                          ? 'Today'
                          : day === 1
                            ? 'Yesterday'
                            : `${day}d ago`;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayChip,
                            isSelected && styles.dayChipSelected,
                          ]}
                          onPress={() => setLastPeriodDay(day)}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              isSelected && styles.dayChipTextSelected,
                            ]}
                          >
                            {dateLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    onPress={() => setShowEstimateHelp(true)}
                    style={styles.estimateLink}
                  >
                    <Text style={styles.estimateLinkText}>
                      Help me estimate
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.estimateBox}>
                  <Text style={styles.estimateText}>
                    No worries! Just start tracking and we'll figure it out
                    together. You can always update this later in Settings.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEstimateHelp(false)}
                    style={styles.estimateLink}
                  >
                    <Text style={styles.estimateLinkText}>
                      I know the date
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.bottom}>
          <Button
            title={trackCycle ? 'Next' : 'Skip cycle tracking'}
            onPress={handleNext}
            size="lg"
            variant={trackCycle ? 'primary' : 'outline'}
          />
        </View>
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
    paddingBottom: Spacing['4xl'],
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    backgroundColor: Colors.teal,
  },
  back: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.xl,
    padding: Spacing.xs,
    zIndex: 2,
  },
  backText: {
    fontSize: 22,
    color: Colors.textSecondary,
  },
  heading: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  toggleLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  hint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  dayScroll: {
    marginBottom: Spacing.md,
  },
  dayScrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dayChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  dayChipSelected: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  dayChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dayChipTextSelected: {
    color: Colors.teal,
  },
  estimateLink: {
    paddingVertical: Spacing.sm,
  },
  estimateLinkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  estimateBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  estimateText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  bottom: {
    marginTop: Spacing.lg,
  },
});
