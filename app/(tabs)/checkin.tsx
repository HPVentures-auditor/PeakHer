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
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Slider } from '../../src/components/Slider';
import { Button } from '../../src/components/Button';
import { submitCheckin } from '../../src/services/api';
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

  const { setStreak, setCheckinCount, checkinCount } = useAuthStore();
  const { fetchBriefing } = useBriefingStore();

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await submitCheckin({
        date: today,
        energy,
        confidence,
        sleepQuality: sleepQuality ?? undefined,
        stressLevel: stressLevel ?? undefined,
        notes: notes.trim() || undefined,
      });

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
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>{'\u2728'}</Text>
          <Text style={styles.successTitle}>Check-in recorded!</Text>
          <Text style={styles.successSubtext}>
            Energy: {energy}/10 {'\u00B7'} Confidence: {confidence}/10
          </Text>
          <Text style={styles.successNote}>
            Keep it up! Patterns unlock after 14 check-ins, and AI insights
            unlock after 25.
          </Text>
          <Button
            title="Check in again"
            onPress={resetForm}
            variant="outline"
            size="md"
            style={styles.resetButton}
          />
        </View>
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
          <Text style={styles.title}>Daily check-in</Text>
          <Text style={styles.subtitle}>
            {formatDate(new Date())}
          </Text>

          {/* Core sliders */}
          <View style={styles.card}>
            <Slider
              label="Energy"
              value={energy}
              onValueChange={setEnergy}
              min={1}
              max={10}
              color={Colors.build}
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
                color={Colors.reflect}
              />
              <Slider
                label="Stress level"
                value={stressLevel ?? 5}
                onValueChange={(v) => setStressLevel(Math.round(v))}
                min={1}
                max={10}
                color={Colors.complete}
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
            title="Submit check-in"
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
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  successTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successSubtext: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.teal,
    marginBottom: Spacing.xl,
  },
  successNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  resetButton: {
    minWidth: 160,
  },
});
