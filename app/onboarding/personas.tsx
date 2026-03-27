/**
 * Onboarding Step 1: Persona Selection
 * "What hats do you wear?" — grid of selectable tiles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/Button';

const PERSONAS = [
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '\u{1F4BC}' },
  { id: 'saleswoman', label: 'Saleswoman', emoji: '\u{1F4B0}' },
  { id: 'athlete', label: 'Athlete', emoji: '\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}' },
  { id: 'mom', label: 'Mom', emoji: '\u{1F469}\u{200D}\u{1F467}' },
  { id: 'executive', label: 'Executive', emoji: '\u{1F451}' },
  { id: 'creative', label: 'Creative', emoji: '\u{1F3A8}' },
  { id: 'student', label: 'Student', emoji: '\u{1F4DA}' },
  { id: 'caretaker', label: 'Caretaker', emoji: '\u{1F49C}' },
  { id: 'partner', label: 'Partner', emoji: '\u{1F46B}' },
];

export default function PersonasScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function togglePersona(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleNext() {
    // Store selected personas in memory for now; they'll be sent during final onboarding step
    router.push({
      pathname: '/onboarding/coach-voice',
      params: { personas: JSON.stringify(selected) },
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
              style={[styles.dot, step <= 1 && styles.dotActive]}
            />
          ))}
        </View>

        <Text style={styles.heading}>What hats do you wear?</Text>
        <Text style={styles.subtext}>
          Select all that apply. This helps us personalize your experience.
        </Text>

        <View style={styles.grid}>
          {PERSONAS.map((p) => {
            const isSelected = selected.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.tile, isSelected && styles.tileSelected]}
                onPress={() => togglePersona(p.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.tileEmoji}>{p.emoji}</Text>
                <Text
                  style={[
                    styles.tileLabel,
                    isSelected && styles.tileLabelSelected,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottom}>
          <Button
            title={selected.length > 0 ? 'Next' : 'Skip'}
            onPress={handleNext}
            size="lg"
            variant={selected.length > 0 ? 'primary' : 'outline'}
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
    marginBottom: Spacing['2xl'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  tile: {
    width: '30%',
    minWidth: 100,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  tileSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealLight,
  },
  tileEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  tileLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: Colors.teal,
  },
  bottom: {
    marginTop: 'auto',
  },
});
