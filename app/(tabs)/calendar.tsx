/**
 * Calendar Tab
 *
 * Monthly calendar view with colored dots per day indicating check-in data.
 * Tapping a day shows that day's check-in details.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, ModeColors } from '../../src/constants/theme';
import { getCheckins, CheckinData } from '../../src/services/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkins, setCheckins] = useState<Record<string, CheckinData>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const data = await getCheckins({ start, end });
      setCheckins(data);
    } catch {
      // Silently fail — calendar can work without data
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  // Build calendar grid
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  // Pad to complete last row
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  function dateKey(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const selectedCheckin = selectedDate ? checkins[selectedDate] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchMonth}
            tintColor={Colors.coral}
          />
        }
      >
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <View key={day} style={styles.weekCell}>
              <Text style={styles.weekLabel}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={styles.dayCell} />;
              }

              const key = dateKey(day);
              const checkin = checkins[key];
              const isToday = key === today;
              const isSelected = key === selectedDate;
              const phase = checkin?.cyclePhase;
              const dotColor = phase
                ? ModeColors[phase] || Colors.teal
                : checkin
                  ? Colors.teal
                  : undefined;

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDate(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {dotColor && <View style={[styles.dayDot, { backgroundColor: dotColor }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Selected day detail */}
        {selectedDate && (
          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {selectedCheckin ? (
              <>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Energy</Text>
                    <Text style={[styles.detailValue, { color: Colors.build }]}>
                      {selectedCheckin.energy}/10
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Confidence</Text>
                    <Text style={[styles.detailValue, { color: Colors.teal }]}>
                      {selectedCheckin.confidence}/10
                    </Text>
                  </View>
                </View>
                {(selectedCheckin.sleepQuality || selectedCheckin.stressLevel) && (
                  <View style={styles.detailRow}>
                    {selectedCheckin.sleepQuality != null && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Sleep</Text>
                        <Text style={[styles.detailValue, { color: Colors.reflect }]}>
                          {selectedCheckin.sleepQuality}/10
                        </Text>
                      </View>
                    )}
                    {selectedCheckin.stressLevel != null && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Stress</Text>
                        <Text style={[styles.detailValue, { color: Colors.complete }]}>
                          {selectedCheckin.stressLevel}/10
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {selectedCheckin.cyclePhase && (
                  <Text style={styles.detailPhase}>
                    Phase: {selectedCheckin.cyclePhase}
                    {selectedCheckin.cycleDay ? ` (Day ${selectedCheckin.cycleDay})` : ''}
                  </Text>
                )}
                {selectedCheckin.notes && (
                  <Text style={styles.detailNotes}>{selectedCheckin.notes}</Text>
                )}
              </>
            ) : (
              <Text style={styles.noCheckin}>No check-in recorded</Text>
            )}
          </View>
        )}
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
    padding: Spacing.base,
    paddingBottom: Spacing['5xl'],
  },
  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  navButton: {
    padding: Spacing.sm,
  },
  navArrow: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  monthLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  // Week row
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  weekLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Day cells
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  dayCellToday: {
    backgroundColor: 'rgba(232, 116, 97, 0.1)',
    borderRadius: BorderRadius.md,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(45, 138, 138, 0.15)',
    borderRadius: BorderRadius.md,
  },
  dayNumber: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dayNumberToday: {
    color: Colors.coral,
    fontFamily: Typography.fontFamily.bold,
  },
  dayNumberSelected: {
    color: Colors.teal,
    fontFamily: Typography.fontFamily.bold,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  // Detail card
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.base,
  },
  detailDate: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
  },
  detailPhase: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  detailNotes: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  noCheckin: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.base,
  },
});
