/**
 * Onboarding Step 2: Meet Dot
 * Introduces Dot — the AI companion with phase-adjusted tone.
 * Replaces the old 4-voice picker. One voice, four moods.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';

const PHASE_PREVIEWS = [
  {
    phase: 'Restore',
    emoji: '\u{1F319}',
    color: Colors.restore,
    dotSays:
      '"Hey. Today is not the day to prove anything to anyone. Rest is the strategy. I cleared your calendar for heroics — you can be a legend again Thursday."',
  },
  {
    phase: 'Rise',
    emoji: '\u{1F525}',
    color: Colors.rise,
    dotSays:
      '"Your brain just entered creative beast mode. That idea you shelved last week? Today\'s the day. Start messy. Start now. I\'ll remind you to eat."',
  },
  {
    phase: 'Peak',
    emoji: '\u{1F451}',
    color: Colors.peak,
    dotSays:
      '"You\'re magnetic today — like, scientifically. Schedule the pitch, the date, the hard conversation. Your words hit different right now. Use it."',
  },
  {
    phase: 'Sustain',
    emoji: '\u{1F3AF}',
    color: Colors.sustain,
    dotSays:
      '"Finish mode: activated. Don\'t start anything new. Wrap up what\'s open, eat the carbs your body is literally asking for, and stop saying yes to things."',
  },
];

export default function MeetDotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  function handleNext() {
    router.push({
      pathname: '/onboarding/cycle-info',
      params: {
        personas: params.personas as string,
        coachVoice: 'dot',
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress dots */}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[styles.dot, step <= 2 && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Meet Dot</Text>
        <Text style={styles.subtext}>
          Your AI companion who actually gets it.{'\n'}
          One voice. Four moods. Zero judgment.
        </Text>

        <View style={styles.dotIntro}>
          <Text style={styles.dotEmoji}>{'\u{1F4AC}'}</Text>
          <Text style={styles.dotDescription}>
            Dot adjusts her tone to match your phase — not a personality swap,
            just the right energy at the right time. Like a best friend who
            actually read the science.
          </Text>
        </View>

        <Text style={styles.previewLabel}>Here's how Dot shows up:</Text>

        {PHASE_PREVIEWS.map((item) => (
          <View key={item.phase} style={[styles.card, { borderLeftColor: item.color }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={[styles.cardPhase, { color: item.color }]}>
                {item.phase}
              </Text>
            </View>
            <Text style={styles.cardPreview}>{item.dotSays}</Text>
          </View>
        ))}

        <View style={styles.bottom}>
          <Button title="I'm into it" onPress={handleNext} size="lg" />
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
  dotIntro: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  dotEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  dotDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  previewLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardPhase: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
  },
  cardPreview: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  bottom: {
    marginTop: Spacing.lg,
  },
});
