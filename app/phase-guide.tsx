/**
 * Phase Guide — "What should I eat / do / know right now?"
 *
 * Addresses Amanda's core pain points:
 * - Forgets when to eat more meat, fasting timing per phase
 * - Forgets which tasks fit better at which time based on cycle
 * - "When I want to burn it all down" — mood management per phase
 *
 * All content local — no API call needed. Dot's voice throughout.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  ModeColors,
  ModeNames,
  ModeEmojis,
} from '../src/constants/theme';

// ---------------------------------------------------------------------------
// Phase guide data — all in Dot's irreverent, science-backed voice
// ---------------------------------------------------------------------------

interface PhaseSection {
  icon: string;
  title: string;
  items: string[];
  dotNote?: string;
}

interface PhaseGuideData {
  key: string;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  duration: string;
  hormoneContext: string;
  sections: PhaseSection[];
  moodRescue: string;
  dotSignoff: string;
}

const PHASE_GUIDES: PhaseGuideData[] = [
  {
    key: 'restore',
    name: 'Restore',
    emoji: '\u{1F319}',
    color: Colors.restore,
    tagline: 'Rest is the strategy.',
    duration: 'Days 1\u20135 (menstrual phase)',
    hormoneContext:
      'Estrogen and progesterone are at their lowest. Your body is shedding the uterine lining. Energy, mood, and motivation dip \u2014 this is biology, not weakness.',
    sections: [
      {
        icon: '\u{1F372}',
        title: 'What to eat',
        items: [
          'Iron-rich foods: red meat, spinach, lentils, dark leafy greens \u2014 you\u2019re literally losing iron right now',
          'Warm, cooked foods over raw \u2014 soups, stews, bone broth',
          'Magnesium-rich: dark chocolate, pumpkin seeds, almonds (yes, the chocolate craving is real and valid)',
          'Omega-3s: salmon, sardines, walnuts \u2014 anti-inflammatory support',
          'Hydrate extra \u2014 your body is working overtime',
        ],
        dotNote: 'That chocolate craving? It\u2019s your body asking for magnesium. It\u2019s right. Give it what it wants.',
      },
      {
        icon: '\u{23F0}',
        title: 'Fasting window',
        items: [
          'Shorter fasts: 12\u201314 hours max',
          'Don\u2019t push it \u2014 cortisol is already elevated',
          'If you normally do 16:8, scale back to 12:12 or 13:11',
          'Prioritize eating when hungry \u2014 your metabolism needs fuel to rebuild',
        ],
      },
      {
        icon: '\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}',
        title: 'Workout',
        items: [
          'Gentle movement only: walks, stretching, restorative yoga',
          'Skip HIIT and heavy lifting \u2014 your recovery capacity is lowest',
          'Light swimming or pilates if you have energy',
          'Rest days are not lazy days \u2014 they\u2019re strategic',
        ],
        dotNote: 'Your uterus has been doing the heavy lifting all month. She deserves a rest day and so do you.',
      },
      {
        icon: '\u{1F4CB}',
        title: 'Schedule & tasks',
        items: [
          'Reflect and review \u2014 what worked last cycle? What didn\u2019t?',
          'Journal, plan, strategize \u2014 your intuition is sharpest right now',
          'Cancel or reschedule non-essential meetings',
          'Don\u2019t start new projects \u2014 evaluate existing ones',
          'Low-key social only \u2014 skip networking events',
        ],
      },
      {
        icon: '\u{1F9E0}',
        title: 'What\u2019s happening in your brain',
        items: [
          'Left and right brain hemispheres communicate more during this phase',
          'Heightened intuition and pattern recognition',
          'Great for strategic thinking, not execution',
          'You may feel withdrawn \u2014 that\u2019s your nervous system asking for space',
        ],
      },
    ],
    moodRescue:
      'Feeling like hiding under a blanket and canceling everything? That\u2019s not depression \u2014 that\u2019s your hormones saying "go inward." Honor it. Watch the comfort show, eat the soup, skip the party. You\u2019ll be back with a vengeance in 3 days.',
    dotSignoff: 'Rest now. Rise soon.',
  },
  {
    key: 'rise',
    name: 'Rise',
    emoji: '\u{1F525}',
    color: Colors.rise,
    tagline: 'Start messy. Start now.',
    duration: 'Days 6\u201313 (follicular phase)',
    hormoneContext:
      'Estrogen is climbing fast. Energy, creativity, and optimism are rising. Your brain is primed for novelty and new ideas. This is your creative beast mode.',
    sections: [
      {
        icon: '\u{1F372}',
        title: 'What to eat',
        items: [
          'Fermented foods: kimchi, sauerkraut, yogurt, kombucha \u2014 gut diversity peaks now',
          'Light proteins: chicken, fish, eggs, tofu',
          'Fresh vegetables and salads \u2014 your digestion handles raw food better now',
          'Sprouted grains and seeds',
          'Lighter meals, more frequent \u2014 your metabolism is speeding up',
        ],
        dotNote: 'Your gut microbiome is extra receptive right now. Feed it the good stuff and it\u2019ll return the favor.',
      },
      {
        icon: '\u{23F0}',
        title: 'Fasting window',
        items: [
          'This is your best phase for longer fasts: 14\u201316 hours',
          'Your body handles caloric restriction better with rising estrogen',
          'If you do intermittent fasting, lean into it now',
          'Morning workouts fasted can feel great during Rise',
        ],
      },
      {
        icon: '\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}',
        title: 'Workout',
        items: [
          'Go hard: HIIT, running, dance cardio, CrossFit',
          'Try something new \u2014 your brain craves novelty right now',
          'Strength training with progressive overload',
          'Energy is climbing daily \u2014 match your intensity to it',
          'This is the phase where PRs happen',
        ],
        dotNote: 'Your body is basically saying "challenge accepted" to everything right now. Listen to it.',
      },
      {
        icon: '\u{1F4CB}',
        title: 'Schedule & tasks',
        items: [
          'Start new projects, brainstorm, pitch ideas',
          'Schedule creative work and strategy sessions',
          'Network, take meetings, collaborate \u2014 you\u2019re social and sharp',
          'Learn new skills \u2014 your brain absorbs information faster',
          'Plan your month \u2014 you have the optimism and clarity for it',
        ],
      },
      {
        icon: '\u{1F9E0}',
        title: 'What\u2019s happening in your brain',
        items: [
          'Estrogen boosts serotonin and dopamine \u2014 natural mood lift',
          'Increased verbal fluency and creative problem-solving',
          'Higher pain tolerance \u2014 good time for dental work or waxing (seriously)',
          'Risk tolerance increases \u2014 use it wisely',
        ],
      },
    ],
    moodRescue:
      'Feeling scattered with too many ideas? That\u2019s the dopamine talking. Pick ONE thing that excites you most and go all in on it for 48 hours. You can revisit the rest during Sustain when your brain switches to execution mode.',
    dotSignoff: 'Build the thing. Worry about perfection later.',
  },
  {
    key: 'peak',
    name: 'Peak',
    emoji: '\u{1F451}',
    color: Colors.peak,
    tagline: 'You\u2019re magnetic. Use it.',
    duration: 'Days 14\u201316 (ovulatory phase)',
    hormoneContext:
      'Estrogen peaks. Testosterone surges briefly. Luteinizing hormone triggers ovulation. You\u2019re at maximum confidence, verbal fluency, and physical attractiveness \u2014 scientifically.',
    sections: [
      {
        icon: '\u{1F372}',
        title: 'What to eat',
        items: [
          'Anti-inflammatory foods: berries, turmeric, leafy greens',
          'Raw vegetables and lighter meals \u2014 metabolism is fastest',
          'Cruciferous veggies (broccoli, cauliflower, Brussels sprouts) help metabolize excess estrogen',
          'Lean proteins: fish, chicken, legumes',
          'Reduce alcohol \u2014 liver is busy processing peak estrogen',
        ],
        dotNote: 'Your metabolism is running hot. You literally burn more calories right now. Eat to fuel performance, not restrict.',
      },
      {
        icon: '\u{23F0}',
        title: 'Fasting window',
        items: [
          'Moderate fasts work: 14\u201315 hours',
          'Your body is efficient right now but don\u2019t overdo it',
          'Eat enough to support the energy output you\u2019re capable of',
          'Post-workout nutrition matters more now \u2014 refuel within 30 min',
        ],
      },
      {
        icon: '\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}',
        title: 'Workout',
        items: [
          'Peak performance: heavy lifting, competitive sports, group fitness',
          'Testosterone boost = strength gains window',
          'High-intensity interval training at max effort',
          'Sprint work, plyometrics, athletic training',
          'Your pain tolerance is highest \u2014 push through plateaus',
        ],
        dotNote: 'This is the 2\u20133 day window where your body is basically a Ferrari. Don\u2019t drive it like a minivan.',
      },
      {
        icon: '\u{1F4CB}',
        title: 'Schedule & tasks',
        items: [
          'The BIG conversations: salary negotiations, sales pitches, board presentations',
          'Date nights, social events, networking \u2014 you\u2019re charismatic AF right now',
          'Record content, film videos \u2014 you\u2019ll come across as confident and articulate',
          'Difficult conversations you\u2019ve been avoiding \u2014 now\u2019s the time',
          'Interviews, public speaking, leadership moments',
        ],
      },
      {
        icon: '\u{1F9E0}',
        title: 'What\u2019s happening in your brain',
        items: [
          'Verbal fluency at its absolute peak \u2014 words come easier',
          'Facial recognition and social reading skills enhanced',
          'Increased libido (testosterone surge)',
          'You literally look different \u2014 slight facial changes increase perceived attractiveness',
          'Confidence is hormonal, not delusional. Trust it.',
        ],
      },
    ],
    moodRescue:
      'Feeling overstimulated or like everyone wants a piece of you? Peak energy attracts attention. It\u2019s okay to set boundaries even when you\u2019re at your most social. "I\u2019m at capacity" is a full sentence.',
    dotSignoff: 'Crown\u2019s on. Go make your move.',
  },
  {
    key: 'sustain',
    name: 'Sustain',
    emoji: '\u{1F3AF}',
    color: Colors.sustain,
    tagline: 'Finish what you started.',
    duration: 'Days 17\u201328 (luteal phase)',
    hormoneContext:
      'Progesterone rises and dominates. Estrogen dips then has a small secondary rise. Energy gradually declines. Your brain shifts from creation to execution and detail work. Cravings, bloating, and mood shifts are progesterone doing its job.',
    sections: [
      {
        icon: '\u{1F372}',
        title: 'What to eat',
        items: [
          'Complex carbs: sweet potatoes, brown rice, quinoa, oats \u2014 progesterone demands more fuel',
          'Magnesium-rich: dark chocolate, avocados, nuts, bananas',
          'B6-rich foods: salmon, chickpeas, potatoes \u2014 supports serotonin production',
          'More calories (100\u2013300 extra/day) \u2014 your basal metabolic rate actually increases',
          'Reduce caffeine and sugar \u2014 both amplify PMS symptoms',
          'Increase fiber \u2014 digestion slows in this phase',
        ],
        dotNote: 'Those cravings? Your body literally needs 100\u2013300 more calories per day right now. You\u2019re not "being bad." You\u2019re being biological.',
      },
      {
        icon: '\u{23F0}',
        title: 'Fasting window',
        items: [
          'Shorter fasts: 12\u201313 hours max',
          'DO NOT do extended fasts \u2014 elevated cortisol + progesterone = stress on stress',
          'Eat breakfast. Seriously. Your blood sugar is less stable now.',
          'Frequent smaller meals beat long gaps between eating',
          'Night snack before bed can actually help sleep quality',
        ],
        dotNote: 'This is not the phase to prove how disciplined you are with fasting. Eat the food. Your hormones will thank you.',
      },
      {
        icon: '\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{FE0F}',
        title: 'Workout',
        items: [
          'Early Sustain (days 17\u201321): moderate intensity still works \u2014 strength training, steady-state cardio',
          'Late Sustain (days 22\u201328): scale way back \u2014 pilates, yoga, walking, swimming',
          'STOP doing HIIT every day \u2014 your cortisol is already elevated, intense workouts ADD stress',
          'Walks are underrated \u2014 30 min walk beats a forced gym session',
          'Listen to your body \u2014 if it says rest, rest',
        ],
        dotNote: 'That brutal workout you forced yourself through? It spiked your cortisol and made your PMS worse. A walk would have been 10x more beneficial. I said what I said.',
      },
      {
        icon: '\u{1F4CB}',
        title: 'Schedule & tasks',
        items: [
          'Detail work, admin, finishing tasks \u2014 your brain wants closure, not novelty',
          'Edit, review, organize \u2014 attention to detail is actually higher',
          'DON\u2019T start new projects \u2014 save those for Rise',
          'Reduce meeting load \u2014 social energy is declining',
          'Batch process: emails, invoices, filing, cleanup',
          'Nest: clean your space, meal prep, organize your life',
        ],
      },
      {
        icon: '\u{1F9E0}',
        title: 'What\u2019s happening in your brain',
        items: [
          'Progesterone has a calming/sedating effect \u2014 you\u2019re not tired, you\u2019re progesterone\u2019d',
          'Serotonin drops \u2014 explains mood dips, irritability, and that "everything is annoying" feeling',
          'Your brain is better at analysis and detail than creativity right now',
          'Sleep may be disrupted \u2014 progesterone affects body temperature',
          'PMS symptoms peak in the last 5\u20137 days \u2014 they\u2019re temporary',
        ],
      },
    ],
    moodRescue:
      'Want to quit everything and burn it all down? That\u2019s your serotonin dropping, not your life falling apart. Before you send that text, make that decision, or torch that relationship \u2014 wait 72 hours. If you still feel the same way in Rise, THEN act on it. 90% of the time, Sustain-phase rage doesn\u2019t survive the transition.',
    dotSignoff: 'Close the loops. The fire comes back. It always does.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhaseGuideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialPhase = (params.phase as string)?.toLowerCase() || 'restore';
  const [activePhase, setActivePhase] = useState(initialPhase);

  const guide = PHASE_GUIDES.find((g) => g.key === activePhase) || PHASE_GUIDES[0];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phase Guide</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Phase tabs */}
      <View style={styles.tabRow}>
        {PHASE_GUIDES.map((g) => {
          const isActive = g.key === activePhase;
          return (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.tab,
                isActive && { backgroundColor: g.color + '20', borderColor: g.color },
              ]}
              onPress={() => setActivePhase(g.key)}
            >
              <Text style={styles.tabEmoji}>{g.emoji}</Text>
              <Text style={[styles.tabLabel, isActive && { color: g.color }]}>
                {g.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Phase header */}
        <View style={[styles.phaseHeader, { borderLeftColor: guide.color }]}>
          <Text style={[styles.phaseName, { color: guide.color }]}>
            {guide.emoji} {guide.name}
          </Text>
          <Text style={styles.phaseTagline}>{guide.tagline}</Text>
          <Text style={styles.phaseDuration}>{guide.duration}</Text>
        </View>

        {/* Hormone context */}
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>What\u2019s happening in your body</Text>
          <Text style={styles.contextText}>{guide.hormoneContext}</Text>
        </View>

        {/* Sections */}
        {guide.sections.map((section, idx) => (
          <View key={idx} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={[styles.itemBullet, { backgroundColor: guide.color }]} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
            {section.dotNote && (
              <View style={styles.dotNoteCard}>
                <Text style={styles.dotNoteLabel}>{'\u{1F4AC}'} Dot says</Text>
                <Text style={styles.dotNoteText}>{section.dotNote}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Mood rescue */}
        <View style={[styles.moodCard, { borderLeftColor: guide.color }]}>
          <Text style={styles.moodTitle}>
            {'\u{1F6A8}'} When you want to burn it all down
          </Text>
          <Text style={styles.moodText}>{guide.moodRescue}</Text>
        </View>

        {/* Dot sign-off */}
        <Text style={[styles.signoff, { color: guide.color }]}>
          \u2014 Dot: {guide.dotSignoff}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backText: {
    fontSize: 22,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  tabEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  phaseHeader: {
    borderLeftWidth: 4,
    paddingLeft: Spacing.base,
    marginBottom: Spacing.xl,
  },
  phaseName: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['2xl'],
    marginBottom: Spacing.xs,
  },
  phaseTagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  phaseDuration: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  contextCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  contextLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  contextText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  itemText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  dotNoteCard: {
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  dotNoteLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.teal,
    marginBottom: Spacing.xs,
  },
  dotNoteText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  moodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  moodTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  moodText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  signoff: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    textAlign: 'right',
    fontStyle: 'italic',
    marginBottom: Spacing.xl,
  },
});
