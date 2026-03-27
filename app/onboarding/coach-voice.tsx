/**
 * Onboarding Step 2: Coach Voice Selection
 * Choose the AI coach personality that resonates most.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';

const VOICES = [
  {
    id: 'sassy',
    name: 'Sassy Bestie',
    emoji: '\u{1F485}',
    preview:
      '"Girl, your energy is through the roof this week. Let\'s channel that into something that actually moves the needle."',
    color: Colors.coral,
  },
  {
    id: 'scientific',
    name: 'Science Brain',
    emoji: '\u{1F9EA}',
    preview:
      '"Your cortisol-to-DHEA ratio is favorable today. Based on your data, this is an optimal window for high-cognitive-load tasks."',
    color: Colors.reflect,
  },
  {
    id: 'spiritual',
    name: 'Spiritual Guide',
    emoji: '\u{2728}',
    preview:
      '"You\'re in your reflective phase \u2014 a sacred time for inner wisdom. Trust what surfaces today. Your intuition is sharp."',
    color: Colors.complete,
  },
  {
    id: 'hype',
    name: 'Hype Motivator',
    emoji: '\u{1F525}',
    preview:
      '"YOU ARE ON FIRE TODAY! Peak performance window is OPEN. Go crush that presentation. You were literally BUILT for this moment!"',
    color: Colors.build,
  },
];

export default function CoachVoiceScreen() {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  function handleNext() {
    router.push({
      pathname: '/onboarding/cycle-info',
      params: {
        personas: params.personas as string,
        coachVoice: selectedVoice || 'sassy',
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

        <Text style={styles.heading}>Pick your coach voice</Text>
        <Text style={styles.subtext}>
          How do you want your daily briefings to sound?
        </Text>

        {VOICES.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          return (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.card,
                isSelected && { borderColor: voice.color },
              ]}
              onPress={() => setSelectedVoice(voice.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{voice.emoji}</Text>
                <Text
                  style={[
                    styles.cardName,
                    isSelected && { color: voice.color },
                  ]}
                >
                  {voice.name}
                </Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: voice.color }]}>
                    <Text style={styles.checkMark}>{'\u2713'}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardPreview}>{voice.preview}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottom}>
          <Button
            title="Next"
            onPress={handleNext}
            size="lg"
            disabled={!selectedVoice}
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
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
    fontSize: 22,
  },
  cardName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
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
