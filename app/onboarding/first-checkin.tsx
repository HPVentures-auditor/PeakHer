/**
 * Onboarding Step 4: First Check-In
 * A quick energy + confidence check-in to get started.
 * Also finishes onboarding by calling updateProfile.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';
import { Slider } from '../../src/components/Slider';
import { useAuthStore } from '../../src/stores/authStore';
import { submitCheckin } from '../../src/services/api';

export default function FirstCheckinScreen() {
  const [energy, setEnergy] = useState(5);
  const [confidence, setConfidence] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateProfile, loadProfile } = useAuthStore();

  async function handleFinish() {
    setLoading(true);
    setError('');

    try {
      // 1. Update profile with onboarding data
      const personas = params.personas
        ? JSON.parse(params.personas as string)
        : [];
      const cycleProfile = params.cycleProfile
        ? JSON.parse(params.cycleProfile as string)
        : { trackingEnabled: false };
      const coachVoice = (params.coachVoice as string) || 'dot';

      await updateProfile({ personas, cycleProfile, coachVoice });

      // 2. Submit first check-in
      const today = new Date().toISOString().split('T')[0];
      await submitCheckin({ date: today, energy, confidence });

      // 3. Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 4. Reload profile and go to main app
      await loadProfile();
      router.replace('/(tabs)/today');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress dots */}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[styles.dot, styles.dotActive]}
            />
          ))}
        </View>

        <Text style={styles.heading}>Quick pulse check</Text>
        <Text style={styles.subtext}>
          10 seconds. Two sliders. Dot starts learning your patterns
          immediately — and you get your first insight right away.
        </Text>

        <View style={styles.card}>
          <Slider
            label="Energy level"
            value={energy}
            onValueChange={setEnergy}
            min={1}
            max={10}
            color={Colors.rise}
          />

          <Slider
            label="Confidence level"
            value={confidence}
            onValueChange={setConfidence}
            min={1}
            max={10}
            color={Colors.teal}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.bottom}>
          <Button
            title="Show me what Dot's got"
            onPress={handleFinish}
            loading={loading}
            size="lg"
          />
          <Text style={styles.note}>
            Sleep, stress, and notes unlock in future check-ins.
            The more you share, the smarter Dot gets.
          </Text>
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
    flexGrow: 1,
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  errorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  bottom: {
    marginTop: 'auto',
  },
  note: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
