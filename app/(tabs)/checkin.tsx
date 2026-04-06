/**
 * Check-In Tab
 *
 * Energy slider (1-10), Confidence slider (1-10),
 * optional fields (sleep, stress, cycle day, notes), submit button.
 * Haptic feedback on submit.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, ModeColors, ModeNames, ModeEmojis } from '../../src/constants/theme';
import { Slider } from '../../src/components/Slider';
import { Button } from '../../src/components/Button';
import { submitCheckin, CheckinData } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/authStore';
import { useBriefingStore } from '../../src/stores/briefingStore';

export default function CheckinScreen() {
  const [energy, setEnergy] = useState(5);
  const [confidence, setConfidence] = useState(5);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinData | null>(null);

  const { setStreak, setCheckinCount, checkinCount } = useAuthStore();
  const { fetchBriefing } = useBriefingStore();

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await submitCheckin({
        date: today,
        energy,
        confidence,
        sleepQuality: sleepQuality ?? undefined,
        stressLevel: stressLevel ?? undefined,
        notes: notes.trim() || undefined,
      });
      setCheckinResult(result);

      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local state
      setCheckinCount(checkinCount + 1);
      setSubmitted(true);

      // Refresh briefing in background
      fetchBriefing(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [energy, confidence, sleepQuality, stressLevel, notes]);

  function resetForm() {
    setEnergy(5);
    setConfidence(5);
    setSleepQuality(null);
    setStressLevel(null);
    setNotes('');
    setShowOptional(false);
    setSubmitted(false);
    setCheckinResult(null);
  }

  if (submitted) {
    const phase = checkinResult?.cyclePhase || null;
    const phaseColor = phase ? (ModeColors[phase] || Colors.teal) : Colors.teal;
    const phaseName = phase ? (ModeNames[phase] || phase) : null;
    const phaseEmoji = phase ? (ModeEmojis[phase] || '') : '';
    const dotInsight = getDotInsight(energy, confidence, phase);
    const dotTip = getDotTip(energy, confidence, phase);

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          {/* Dot's response */}
          <View style={[styles.dotResponseCard, { borderLeftColor: phaseColor }]}>
            <Text style={styles.dotAvatar}>{'\u{1F4AC}'}</Text>
            <Text style={styles.dotLabel}>Dot says</Text>
            <Text style={styles.dotInsight}>{dotInsight}</Text>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: Colors.rise }]}>{energy}</Text>
              <Text style={styles.statChipLabel}>Energy</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: Colors.teal }]}>{confidence}</Text>
              <Text style={styles.statChipLabel}>Confidence</Text>
            </View>
            {phaseName && (
              <View style={styles.statChip}>
                <Text style={[styles.statValue, { color: phaseColor }]}>{phaseEmoji}</Text>
                <Text style={styles.statChipLabel}>{phaseName}</Text>
              </View>
            )}
          </View>

          {/* Actionable tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>Your move</Text>
            <Text style={styles.tipText}>{dotTip}</Text>
          </View>

          {/* Progress nudge */}
          {checkinCount < 14 && (
            <View style={styles.progressNudge}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min((checkinCount / 14) * 100, 100)}%`, backgroundColor: phaseColor },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {14 - checkinCount} more check-in{14 - checkinCount !== 1 ? 's' : ''} until Dot starts spotting your patterns
              </Text>
            </View>
          )}

          {/* Dot sign-off */}
          <Text style={styles.dotSignoff}>
            — Dot {phaseEmoji || '\u{2728}'}
          </Text>

          <Button
            title="Done"
            onPress={resetForm}
            variant="outline"
            size="md"
            style={styles.resetButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Hey, how are we doing?</Text>
          <Text style={styles.subtitle}>
            {formatDate(new Date())} {'\u00B7'} Quick pulse check for Dot
          </Text>

          {/* Core sliders */}
          <View style={styles.card}>
            <Slider
              label="Energy"
              value={energy}
              onValueChange={setEnergy}
              min={1}
              max={10}
              color={Colors.rise}
            />
            <Slider
              label="Confidence"
              value={confidence}
              onValueChange={setConfidence}
              min={1}
              max={10}
              color={Colors.teal}
            />
          </View>

          {/* Optional fields toggle */}
          <TouchableOpacity
            style={styles.optionalToggle}
            onPress={() => setShowOptional(!showOptional)}
          >
            <Text style={styles.optionalToggleText}>
              {showOptional ? 'Hide optional fields' : 'Add sleep, stress & notes'}
            </Text>
            <Text style={styles.optionalChevron}>
              {showOptional ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>

          {showOptional && (
            <View style={styles.card}>
              <Slider
                label="Sleep quality"
                value={sleepQuality ?? 5}
                onValueChange={(v) => setSleepQuality(Math.round(v))}
                min={1}
                max={10}
                color={Colors.restore}
              />
              <Slider
                label="Stress level"
                value={stressLevel ?? 5}
                onValueChange={(v) => setStressLevel(Math.round(v))}
                min={1}
                max={10}
                color={Colors.sustain}
              />

              <Text style={styles.notesLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How are you feeling? What's on your mind?"
                placeholderTextColor={Colors.gray400}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Submit */}
          <Button
            title="Send it to Dot"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Dot's instant insight based on energy, confidence, and phase.
 * No API call — generates locally for instant gratification.
 */
function getDotInsight(energy: number, confidence: number, phase: string | null): string {
  const p = phase?.toLowerCase() || '';
  // Phase-specific openers
  if (p === 'restore' || p === 'reflect') {
    if (energy <= 4) return "Your body is doing the heavy lifting right now — literally shedding and rebuilding. Low energy isn't laziness, it's biology. Rest is the move today.";
    if (energy >= 7) return "Interesting — you're in Restore but running hotter than expected. Your body might be bouncing back early. Don't push it though. Ride the wave, don't force it.";
    return "Restore mode. Your intuition is sharpest this week. If something feels off about a decision, trust that gut hit. It's probably right.";
  }
  if (p === 'rise' || p === 'build') {
    if (energy >= 7 && confidence >= 7) return "You're firing on all cylinders. This is your creative beast mode — new ideas, bold moves, start the thing you've been overthinking. Your brain is literally primed for it right now.";
    if (energy >= 7) return "Energy is up and climbing. Your Rise phase is kicking in — this is when new projects, brainstorms, and big ideas have the best shot. Go start something.";
    if (confidence <= 4) return "Energy's building but confidence is lagging — totally normal early in Rise. Your body's ahead of your brain. Give it 24-48 hours and watch that confidence catch up.";
    return "Rise phase energy is coming online. Start messy, start now. Perfection is a Sustain-phase problem. Right now you just need momentum.";
  }
  if (p === 'peak' || p === 'perform') {
    if (confidence >= 8) return "You are MAGNETIC today. Schedule the pitch, the date, the hard conversation. Your communication skills are literally at their biological peak. Words hit different right now.";
    if (energy >= 8) return "Peak energy + Peak phase = go time. This is the window to tackle the thing that scares you. Your body has the horsepower and your brain has the verbal fluency. Use it.";
    return "You're in Peak — your communication and confidence are at their highest point this cycle. Even if the numbers don't feel wild, your biology is giving you an edge. Lean in.";
  }
  if (p === 'sustain' || p === 'complete') {
    if (energy <= 4 && confidence <= 4) return "Sustain phase + low everything = your body is telling you to close loops, not open new ones. Cancel what you can. Eat the carbs. This is not the week to prove anything.";
    if (energy <= 4) return "Your energy is winding down — that's Sustain doing its thing. Switch to detail work, admin, finishing tasks. Don't start anything new. Your brain wants closure right now, not novelty.";
    return "Sustain mode: execution over creation. Finish what you started during Rise and Peak. Your attention to detail is actually better right now than when your energy was higher.";
  }
  // No phase data — general insight based on scores
  if (energy >= 8 && confidence >= 8) return "Look at you — energy AND confidence both through the roof. Whatever you've been doing, keep doing it. Today is a green-light day. Go make moves.";
  if (energy <= 3) return "Low energy day. That's data, not a diagnosis. Rest if you can, lighten the load if you can't. Tomorrow's a different equation.";
  if (confidence <= 3) return "Confidence is low today — and that's okay. Some days the inner critic is louder. Don't make big decisions when you're feeling small. Give it a day.";
  return "Logged and noted. Every check-in makes Dot smarter about YOUR patterns. Keep showing up and I'll start connecting the dots (pun intended).";
}

function getDotTip(energy: number, confidence: number, phase: string | null): string {
  const p = phase?.toLowerCase() || '';
  if (p === 'restore' || p === 'reflect') {
    return energy <= 5
      ? "Gentle movement only. Think walks, stretching, or restorative yoga. Eat iron-rich foods (red meat, spinach, lentils). Your body is replenishing."
      : "Light journaling or reflection today. Review last cycle's wins. What worked? What didn't? Your strategic brain is online.";
  }
  if (p === 'rise' || p === 'build') {
    return energy >= 6
      ? "Try a challenging workout — HIIT, running, or something new. Eat fermented foods and lean protein. Start that project you've been sitting on."
      : "Ease into it. Your energy is still building. Light cardio + planning mode. Map out what you want to tackle this week.";
  }
  if (p === 'peak' || p === 'perform') {
    return confidence >= 6
      ? "Book the meeting, make the call, have the conversation. Eat anti-inflammatory foods and lighter meals. Your metabolism is fastest right now."
      : "Even if confidence doesn't feel high, your verbal skills are peaking. Write that important email or record that content — you'll sound better than you think.";
  }
  if (p === 'sustain' || p === 'complete') {
    return energy >= 6
      ? "Use this energy for finishing, not starting. Tackle your to-do list backlog. Complex carbs and magnesium-rich foods (dark chocolate, nuts) are your friends."
      : "Lower intensity today — pilates, swimming, long walks. Your cortisol is already elevated, so intense workouts add stress instead of relieving it.";
  }
  // No phase
  if (energy >= 7) return "High energy day — channel it into your hardest task before noon. You've got the horsepower. Don't waste it on email.";
  if (energy <= 4) return "Low energy? Start with one small win. Just one. Momentum builds from there. And drink water — dehydration makes everything feel worse.";
  return "Middle-of-the-road day. Perfect for steady progress. Pick 2-3 things to move forward, skip the heroics, and call it a win.";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  optionalToggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  optionalChevron: {
    fontSize: 10,
    color: Colors.teal,
  },
  notesLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  // Dot response success state
  successScroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  dotResponseCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  dotAvatar: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  dotLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  dotInsight: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    marginBottom: Spacing.xs,
  },
  statChipLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tipLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.rise,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  progressNudge: {
    marginBottom: Spacing.xl,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  dotSignoff: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  resetButton: {
    alignSelf: 'center',
    minWidth: 160,
  },
});
