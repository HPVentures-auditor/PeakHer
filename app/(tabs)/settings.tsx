/**
 * Settings Tab
 *
 * Profile info, coach voice, notification preferences, cycle settings,
 * logout, delete account.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useBriefingStore } from '../../src/stores/briefingStore';
import { deleteAccount, exportData } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Slider } from '../../src/components/Slider';

const DOT_PHASES = [
  { phase: 'Restore', emoji: '\u{1F319}', color: Colors.restore },
  { phase: 'Rise', emoji: '\u{1F525}', color: Colors.rise },
  { phase: 'Peak', emoji: '\u{1F451}', color: Colors.peak },
  { phase: 'Sustain', emoji: '\u{1F3AF}', color: Colors.sustain },
];

function getDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getDaysAgo(dateStr: string): number | null {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff < 35 ? diff : null;
}

export default function SettingsScreen() {
  const { user, cycleProfile, streak, checkinCount, updateProfile, logout, loadProfile } =
    useAuthStore();
  const { clear: clearBriefing } = useBriefingStore();
  const router = useRouter();

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [editingCycle, setEditingCycle] = useState(false);
  const [cycleEnabled, setCycleEnabled] = useState(
    cycleProfile?.trackingEnabled ?? false,
  );
  const [cycleLength, setCycleLength] = useState(
    cycleProfile?.averageCycleLength ?? 28,
  );
  const [lastPeriodDay, setLastPeriodDay] = useState<number | null>(
    cycleProfile?.lastPeriodStart ? getDaysAgo(cycleProfile.lastPeriodStart) : null,
  );
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  async function handleSaveName() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: newName.trim() });
      setEditingName(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCycle() {
    setSaving(true);
    try {
      await updateProfile({
        cycleProfile: {
          trackingEnabled: cycleEnabled,
          averageCycleLength: cycleLength,
          lastPeriodStart: lastPeriodDay != null ? getDateDaysAgo(lastPeriodDay) : null,
        },
      });
      setEditingCycle(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          clearBriefing();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.\n\nType your email to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Show a second confirmation with email input
            Alert.prompt(
              'Confirm Delete',
              `Type "${user?.email}" to confirm deletion:`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async (email?: string) => {
                    if (!email) return;
                    try {
                      await deleteAccount(email);
                      clearBriefing();
                      await logout();
                      router.replace('/(auth)/login');
                    } catch (err) {
                      Alert.alert(
                        'Error',
                        err instanceof Error ? err.message : 'Failed to delete account',
                      );
                    }
                  },
                },
              ],
              'plain-text',
            );
          },
        },
      ],
    );
  }

  async function handleExport() {
    try {
      const data = await exportData();
      Alert.alert('Export Complete', 'Your data export has been generated.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Export failed');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.coral}
          />
        }
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.card}>
            {/* Name */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Name</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <Input
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Your name"
                    style={styles.editInput}
                  />
                  <View style={styles.editButtons}>
                    <Button
                      title="Save"
                      onPress={handleSaveName}
                      loading={saving}
                      size="sm"
                    />
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setEditingName(false);
                        setNewName(user?.name || '');
                      }}
                      variant="ghost"
                      size="sm"
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingName(true)}
                  style={styles.settingValue}
                >
                  <Text style={styles.valueText}>{user?.name}</Text>
                  <Text style={styles.editIcon}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Email */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.valueText}>{user?.email}</Text>
            </View>

            {/* Personas */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Personas</Text>
              <Text style={styles.valueText}>
                {user?.personas?.length
                  ? user.personas.join(', ')
                  : 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Dot — AI Companion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your AI companion</Text>
          <View style={styles.card}>
            <View style={styles.dotHeader}>
              <Text style={styles.dotEmoji}>{'\u{1F4AC}'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dotName}>Dot</Text>
                <Text style={styles.dotSubtext}>
                  One voice, four moods. Adjusts to your phase automatically.
                </Text>
              </View>
            </View>
            <View style={styles.dotPhases}>
              {DOT_PHASES.map((p) => (
                <View key={p.phase} style={styles.dotPhaseChip}>
                  <Text style={styles.dotPhaseEmoji}>{p.emoji}</Text>
                  <Text style={[styles.dotPhaseLabel, { color: p.color }]}>
                    {p.phase}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{checkinCount}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.coral }]}>
                {streak?.current || 0}
              </Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streak?.longest || 0}</Text>
              <Text style={styles.statLabel}>Best streak</Text>
            </View>
          </View>
        </View>

        {/* Cycle Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle tracking</Text>
          <View style={styles.card}>
            {editingCycle ? (
              <>
                <View style={styles.toggleRow}>
                  <Text style={styles.settingLabel}>Track cycle</Text>
                  <Switch
                    value={cycleEnabled}
                    onValueChange={setCycleEnabled}
                    trackColor={{
                      false: Colors.surfaceLight,
                      true: Colors.teal,
                    }}
                    thumbColor={Colors.white}
                  />
                </View>
                {cycleEnabled && (
                  <>
                    <Slider
                      label="Cycle length"
                      value={cycleLength}
                      onValueChange={(v) => setCycleLength(Math.round(v))}
                      min={21}
                      max={40}
                      step={1}
                      color={Colors.teal}
                    />
                    <Text style={styles.settingLabel}>When did your last period start?</Text>
                    <Text style={styles.dateHint}>
                      Day 1 = first day of full flow (not spotting)
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dayScroll}
                      contentContainerStyle={styles.dayScrollContent}
                    >
                      {Array.from({ length: 35 }, (_, i) => i).map((day) => {
                        const isSelected = lastPeriodDay === day;
                        const label =
                          day === 0 ? 'Today' : day === 1 ? 'Yesterday' : `${day}d ago`;
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                            onPress={() => setLastPeriodDay(day)}
                          >
                            <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
                <View style={styles.editButtons}>
                  <Button
                    title="Save"
                    onPress={handleSaveCycle}
                    loading={saving}
                    size="sm"
                  />
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setEditingCycle(false);
                      setCycleEnabled(cycleProfile?.trackingEnabled ?? false);
                      setCycleLength(cycleProfile?.averageCycleLength ?? 28);
                    }}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              </>
            ) : (

              <>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Tracking</Text>
                  <Text style={styles.valueText}>
                    {cycleProfile?.trackingEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                {cycleProfile?.trackingEnabled && (
                  <>
                    <View style={styles.settingRow}>
                      <Text style={styles.settingLabel}>Cycle length</Text>
                      <Text style={styles.valueText}>
                        {cycleProfile.averageCycleLength} days
                      </Text>
                    </View>
                    {cycleProfile.lastPeriodStart && (
                      <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>
                          Last period start
                        </Text>
                        <Text style={styles.valueText}>
                          {cycleProfile.lastPeriodStart}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                <TouchableOpacity
                  onPress={() => setEditingCycle(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit cycle settings</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your data</Text>
          <View style={styles.card}>
            <TouchableOpacity
              onPress={handleExport}
              style={styles.actionRow}
            >
              <Text style={styles.actionText}>Export my data</Text>
              <Text style={styles.actionChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            size="md"
            style={styles.logoutButton}
          />

          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PeakHer v1.0.0</Text>
          <Text style={styles.footerText}>
            {'\u00A9'} 2026 High Performance Ventures LLC
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
    paddingBottom: Spacing['5xl'],
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
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
    padding: Spacing.base,
  },
  settingRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  settingLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  settingValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  dotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dotEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  dotName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  dotSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  dotPhases: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dotPhaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dotPhaseEmoji: {
    fontSize: 14,
  },
  dotPhaseLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  editIcon: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  editRow: {
    marginTop: Spacing.sm,
  },
  editInput: {
    marginBottom: 0,
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  editButton: {
    paddingVertical: Spacing.md,
  },
  editButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  dateHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.darkNavy,
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  actionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  actionChevron: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  logoutButton: {
    marginBottom: Spacing.base,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  deleteText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
