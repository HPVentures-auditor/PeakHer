/**
 * Settings Tab
 *
 * Profile info, coach voice, notification preferences, cycle settings,
 * logout, delete account.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import * as Linking from 'expo-linking';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Slider } from '../../src/components/Slider';
import {
  getCalendarAuthUrl,
  getCalendarStatus,
  syncCalendar,
  disconnectCalendar,
  CalendarStatus,
  getWearableAuthUrl,
  getWearableStatus,
  syncWearable,
  disconnectWearable,
  WearableStatusResponse,
  WearableProvider,
  createPartnerInvite,
  getPartnershipStatus,
  updatePartnerSettings,
  revokePartner,
  PartnershipStatus,
} from '../../src/services/api';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  getReminderSettings,
} from '../../src/hooks/useNotifications';

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
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [wearStatus, setWearStatus] = useState<WearableStatusResponse | null>(null);
  const [wearLoading, setWearLoading] = useState<WearableProvider | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<PartnershipStatus | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // Load reminder settings + calendar status on mount
  useEffect(() => {
    getReminderSettings().then(({ enabled, hour }) => {
      setReminderEnabled(enabled);
      setReminderHour(hour);
    });
    loadCalendarStatus();
    loadWearableStatus();
    loadPartnerStatus();
  }, []);

  // Listen for deep link return from OAuth
  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      if (event.url.includes('calendar-connected')) {
        loadCalendarStatus();
        Alert.alert('Calendar Connected', 'Google Calendar is now linked. Dot will use your schedule in daily briefings.');
      }
      if (event.url.includes('wearable-connected')) {
        loadWearableStatus();
        Alert.alert('Wearable Connected', 'Your wearable is linked. Dot will use your biometrics in daily briefings.');
      }
    });
    return () => sub.remove();
  }, []);

  async function handleToggleReminder(value: boolean) {
    setReminderEnabled(value);
    if (value) {
      await scheduleDailyReminder(reminderHour);
    } else {
      await cancelDailyReminder();
    }
  }

  async function handleChangeReminderHour(hour: number) {
    setReminderHour(hour);
    if (reminderEnabled) {
      await scheduleDailyReminder(hour);
    }
  }

  async function loadCalendarStatus() {
    try {
      const status = await getCalendarStatus();
      setCalStatus(status);
    } catch {
      setCalStatus(null);
    }
  }

  async function handleConnectCalendar() {
    setCalLoading(true);
    try {
      const { url } = await getCalendarAuthUrl();
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start calendar connection');
    } finally {
      setCalLoading(false);
    }
  }

  async function handleSyncCalendar() {
    setCalLoading(true);
    try {
      const result = await syncCalendar();
      await loadCalendarStatus();
      Alert.alert('Synced', `Calendar synced. ${result.eventsProcessed || 0} events updated.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setCalLoading(false);
    }
  }

  async function handleDisconnectCalendar() {
    Alert.alert('Disconnect Calendar', 'Remove Google Calendar connection? Dot will no longer use your schedule in briefings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setCalLoading(true);
          try {
            await disconnectCalendar();
            setCalStatus(null);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to disconnect');
          } finally {
            setCalLoading(false);
          }
        },
      },
    ]);
  }

  async function loadWearableStatus() {
    try {
      const status = await getWearableStatus();
      setWearStatus(status);
    } catch {
      setWearStatus(null);
    }
  }

  async function handleConnectWearable(provider: WearableProvider) {
    setWearLoading(provider);
    try {
      const { url } = await getWearableAuthUrl(provider);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setWearLoading(null);
    }
  }

  async function handleDisconnectWearable(provider: WearableProvider) {
    const name = provider.charAt(0).toUpperCase() + provider.slice(1);
    Alert.alert('Disconnect ' + name, 'Remove ' + name + ' connection? Dot will no longer use this data in briefings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setWearLoading(provider);
          try {
            await disconnectWearable(provider);
            await loadWearableStatus();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
          } finally {
            setWearLoading(null);
          }
        },
      },
    ]);
  }

  async function loadPartnerStatus() {
    try {
      const status = await getPartnershipStatus();
      setPartnerStatus(status);
    } catch {
      setPartnerStatus(null);
    }
  }

  async function handleCreateInvite() {
    setPartnerLoading(true);
    try {
      const result = await createPartnerInvite();
      await loadPartnerStatus();
      Alert.alert(
        'Invite Created',
        `Share this code with your partner:\n\n${result.inviteCode}\n\nOr send them this link:\n${result.inviteUrl}\n\nExpires in 48 hours.`,
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setPartnerLoading(false);
    }
  }

  async function handleTogglePartnerPause(paused: boolean) {
    try {
      await updatePartnerSettings({ sharingPaused: paused });
      await loadPartnerStatus();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleRevokePartner() {
    Alert.alert(
      'Disconnect Partner',
      'This permanently removes your partner\'s access. They will no longer receive daily intel. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setPartnerLoading(true);
            try {
              await revokePartner();
              await loadPartnerStatus();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
            } finally {
              setPartnerLoading(false);
            }
          },
        },
      ],
    );
  }

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

        {/* Daily Reminder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily reminder</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Check-in reminder</Text>
                <Text style={styles.reminderHint}>
                  Dot nudges you daily to check in
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{
                  false: Colors.surfaceLight,
                  true: Colors.teal,
                }}
                thumbColor={Colors.white}
              />
            </View>
            {reminderEnabled && (
              <View style={styles.hourRow}>
                <Text style={styles.settingLabel}>Remind me at</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hourScrollContent}
                >
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => {
                    const isSelected = reminderHour === h;
                    const label = h <= 12 ? `${h === 0 ? 12 : h} AM` : `${h - 12} PM`;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.hourChip, isSelected && styles.hourChipSelected]}
                        onPress={() => handleChangeReminderHour(h)}
                      >
                        <Text style={[styles.hourChipText, isSelected && styles.hourChipTextSelected]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
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

        {/* Calendar Integration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <View style={styles.card}>
            {calStatus?.connected ? (
              <>
                <View style={styles.calConnectedRow}>
                  <View style={styles.calStatusDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calConnectedText}>
                      Google Calendar connected
                    </Text>
                    {calStatus.lastSynced && (
                      <Text style={styles.calSyncedText}>
                        Last synced: {new Date(calStatus.lastSynced).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.calDescription}>
                  Dot uses your schedule to optimize briefings — recommending when to
                  tackle meetings, what to prep for, and what to reschedule based on
                  your phase.
                </Text>
                <View style={styles.calActions}>
                  <TouchableOpacity
                    onPress={handleSyncCalendar}
                    disabled={calLoading}
                    style={styles.calActionButton}
                  >
                    <Text style={styles.calActionText}>
                      {calLoading ? 'Syncing...' : 'Sync now'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDisconnectCalendar}
                    disabled={calLoading}
                    style={styles.calActionButton}
                  >
                    <Text style={[styles.calActionText, { color: Colors.error }]}>
                      Disconnect
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.calIcon}>{'\u{1F4C5}'}</Text>
                <Text style={styles.calTitle}>Connect Google Calendar</Text>
                <Text style={styles.calDescription}>
                  Dot reads your schedule (read-only) and weaves it into your daily
                  briefing. "Your board presentation at 2 PM aligns with Peak — lead
                  with confidence."
                </Text>
                <Button
                  title={calLoading ? 'Connecting...' : 'Connect Calendar'}
                  onPress={handleConnectCalendar}
                  loading={calLoading}
                  variant="secondary"
                  size="md"
                  style={{ marginTop: Spacing.md }}
                />
              </>
            )}
          </View>
        </View>

        {/* Wearables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wearables</Text>
          <View style={styles.card}>
            <Text style={styles.calDescription}>
              Connect a wearable and Dot uses your HRV, sleep, recovery, and strain
              to personalize every briefing with real biometric data.
            </Text>
            {([
              { key: 'oura' as WearableProvider, name: 'Oura Ring', emoji: '\u{1F48D}' },
              { key: 'whoop' as WearableProvider, name: 'Whoop', emoji: '\u{231A}' },
              { key: 'garmin' as WearableProvider, name: 'Garmin', emoji: '\u{2328}\u{FE0F}' },
            ]).map((device) => {
              const status = wearStatus?.[device.key];
              const isConnected = status?.connected;
              const isLoading = wearLoading === device.key;
              return (
                <View key={device.key} style={styles.wearableRow}>
                  <Text style={styles.wearableEmoji}>{device.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wearableName}>{device.name}</Text>
                    {isConnected && status?.lastSynced && (
                      <Text style={styles.calSyncedText}>
                        Synced: {new Date(status.lastSynced).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  {isConnected ? (
                    <TouchableOpacity
                      onPress={() => handleDisconnectWearable(device.key)}
                      disabled={isLoading}
                    >
                      <Text style={[styles.calActionText, { color: Colors.error }]}>
                        {isLoading ? '...' : 'Disconnect'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleConnectWearable(device.key)}
                      disabled={isLoading}
                    >
                      <Text style={styles.calActionText}>
                        {isLoading ? 'Connecting...' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Partner Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner Mode</Text>
          <View style={styles.card}>
            {partnerStatus?.hasPartnership && partnerStatus.status === 'active' ? (
              <>
                <View style={styles.calConnectedRow}>
                  <View style={styles.calStatusDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calConnectedText}>
                      {partnerStatus.partnerName || 'Partner'} connected
                    </Text>
                    <Text style={styles.calSyncedText}>
                      Getting daily intel from Dot
                    </Text>
                  </View>
                </View>

                {/* Pause toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Pause sharing</Text>
                    <Text style={styles.reminderHint}>
                      Temporarily stop partner briefings
                    </Text>
                  </View>
                  <Switch
                    value={partnerStatus.sharingPaused || false}
                    onValueChange={handleTogglePartnerPause}
                    trackColor={{ false: Colors.surfaceLight, true: Colors.sustain }}
                    thumbColor={Colors.white}
                  />
                </View>

                {/* Share toggles */}
                {partnerStatus.shareSettings && (
                  <>
                    <Text style={[styles.settingLabel, { marginTop: Spacing.md }]}>
                      What your partner sees
                    </Text>
                    {([
                      { key: 'sharePhaseName' as const, label: 'Phase name', field: 'phaseName' as const },
                      { key: 'shareEnergyLevel' as const, label: 'Energy level', field: 'energyLevel' as const },
                      { key: 'shareNutritionTips' as const, label: 'Nutrition tips', field: 'nutritionTips' as const },
                      { key: 'shareEmotionalWeather' as const, label: 'Emotional weather', field: 'emotionalWeather' as const },
                    ]).map((toggle) => (
                      <View key={toggle.key} style={styles.toggleRow}>
                        <Text style={styles.wearableName}>{toggle.label}</Text>
                        <Switch
                          value={partnerStatus.shareSettings![toggle.field]}
                          onValueChange={(val) => updatePartnerSettings({ [toggle.key]: val }).then(loadPartnerStatus)}
                          trackColor={{ false: Colors.surfaceLight, true: Colors.teal }}
                          thumbColor={Colors.white}
                        />
                      </View>
                    ))}
                  </>
                )}

                {/* Personal messages per phase */}
                {partnerStatus.personalMessages && (
                  <>
                    <Text style={[styles.settingLabel, { marginTop: Spacing.md }]}>
                      "What I need from you in each phase"
                    </Text>
                    <Text style={styles.reminderHint}>
                      Your partner sees this front and center in their daily briefing
                    </Text>
                    {([
                      { key: 'personalMessageRestore' as const, phase: 'Restore', emoji: '\u{1F319}', color: Colors.restore, field: 'restore' as const },
                      { key: 'personalMessageRise' as const, phase: 'Rise', emoji: '\u{1F525}', color: Colors.rise, field: 'rise' as const },
                      { key: 'personalMessagePeak' as const, phase: 'Peak', emoji: '\u{1F451}', color: Colors.peak, field: 'peak' as const },
                      { key: 'personalMessageSustain' as const, phase: 'Sustain', emoji: '\u{1F3AF}', color: Colors.sustain, field: 'sustain' as const },
                    ]).map((item) => (
                      <View key={item.key} style={styles.personalMessageRow}>
                        <Text style={[styles.personalMessagePhase, { color: item.color }]}>
                          {item.emoji} {item.phase}
                        </Text>
                        <TextInput
                          style={styles.personalMessageInput}
                          value={partnerStatus.personalMessages![item.field]}
                          onChangeText={(text) => {
                            setPartnerStatus((prev) => prev ? {
                              ...prev,
                              personalMessages: { ...prev.personalMessages!, [item.field]: text }
                            } : prev);
                          }}
                          onBlur={() => {
                            updatePartnerSettings({ [item.key]: partnerStatus.personalMessages![item.field] });
                          }}
                          placeholder={`What do you need during ${item.phase}?`}
                          placeholderTextColor={Colors.gray400}
                          multiline
                          maxLength={500}
                          textAlignVertical="top"
                        />
                      </View>
                    ))}
                  </>
                )}

                <View style={styles.calActions}>
                  <TouchableOpacity onPress={handleRevokePartner} disabled={partnerLoading}>
                    <Text style={[styles.calActionText, { color: Colors.error }]}>
                      Disconnect partner
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : partnerStatus?.hasPartnership && partnerStatus.status === 'pending' ? (
              <>
                <Text style={styles.calIcon}>{'\u{1F48C}'}</Text>
                <Text style={styles.calTitle}>Invite pending</Text>
                <Text style={styles.calDescription}>
                  Share this code with your partner:{'\n\n'}
                  <Text style={{ fontFamily: Typography.fontFamily.bold, color: Colors.teal, fontSize: Typography.fontSize.xl }}>
                    {partnerStatus.inviteCode}
                  </Text>
                  {'\n\n'}They'll create an account with this code to start receiving daily intel from Dot. Expires in 48 hours.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.calIcon}>{'\u{1F46B}'}</Text>
                <Text style={styles.calTitle}>Invite your partner</Text>
                <Text style={styles.calDescription}>
                  Dot sends your partner daily intel on how to show up — what to do, what
                  not to do, what snacks to bring. Funny, direct, zero judgment. You control
                  exactly what they see, and you can pause or disconnect at any time.
                </Text>
                <Button
                  title={partnerLoading ? 'Creating...' : 'Create Invite'}
                  onPress={handleCreateInvite}
                  loading={partnerLoading}
                  variant="secondary"
                  size="md"
                  style={{ marginTop: Spacing.md }}
                />
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
  calConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  calStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.rise,
  },
  calConnectedText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  calSyncedText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  calIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  calTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  calDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  personalMessageRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  personalMessagePhase: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  personalMessageInput: {
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    minHeight: 60,
    lineHeight: 20,
  },
  wearableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  wearableEmoji: {
    fontSize: 20,
  },
  wearableName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  calActions: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  calActionButton: {
    paddingVertical: Spacing.xs,
  },
  calActionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  reminderHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  hourRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  hourScrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  hourChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.darkNavy,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  hourChipSelected: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  hourChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  hourChipTextSelected: {
    color: Colors.teal,
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
