/**
 * Admin Tab — Superadmin dashboard
 *
 * Shows platform stats, user list with search, and engagement segments.
 * Only visible to admin emails (results@jairekrobbins.com, etc.)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import {
  getAdminStats,
  getAdminUsers,
  AdminStatsResponse,
  AdminUser,
} from '../../src/services/api';

export default function AdminScreen() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'users'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ limit: 50 }),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotalUsers(usersData.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearch(query);
    try {
      const data = await getAdminUsers({ search: query, limit: 50 });
      setUsers(data.users);
      setTotalUsers(data.pagination.total);
    } catch {
      // keep existing list on search error
    }
  }, []);

  const segmentColors: Record<string, string> = {
    green: Colors.success,
    teal: Colors.teal,
    yellow: Colors.warning,
    coral: Colors.coral,
    gray: Colors.gray400,
  };

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'overview' && styles.tabActive]}
          onPress={() => setTab('overview')}
        >
          <Text style={[styles.tabText, tab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
            Users ({totalUsers})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.coral} />
          }
        >
          {stats && (
            <>
              {/* Key metrics */}
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <MetricCard label="Total Users" value={stats.overview.totalUsers} />
                <MetricCard label="Active This Week" value={stats.overview.activeThisWeek} color={Colors.teal} />
                <MetricCard label="Check-ins Today" value={stats.overview.checkinsToday} color={Colors.rise} />
                <MetricCard label="Total Check-ins" value={stats.overview.totalCheckins} />
                <MetricCard label="Avg Streak" value={stats.overview.avgStreak} color={Colors.coral} />
                <MetricCard label="Signups This Week" value={stats.overview.signupsThisWeek} color={Colors.teal} />
              </View>

              {/* Engagement segments */}
              <Text style={styles.sectionTitle}>Engagement Segments</Text>
              <View style={styles.card}>
                {stats.segments.map((seg) => (
                  <View key={seg.label} style={styles.segmentRow}>
                    <View style={[styles.segmentDot, { backgroundColor: segmentColors[seg.color] || Colors.gray400 }]} />
                    <Text style={styles.segmentLabel}>{seg.label}</Text>
                    <Text style={[styles.segmentCount, { color: segmentColors[seg.color] || Colors.gray400 }]}>
                      {seg.count}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Top streakers */}
              {stats.topStreakers.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Streakers</Text>
                  <View style={styles.card}>
                    {stats.topStreakers.map((u, i) => (
                      <View key={u.id} style={styles.userRow}>
                        <Text style={styles.rankText}>#{i + 1}</Text>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{u.name}</Text>
                          <Text style={styles.userEmail}>{u.email}</Text>
                        </View>
                        <Text style={styles.streakBadge}>{u.currentStreak}d</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Recent signups */}
              <Text style={styles.sectionTitle}>Recent Signups</Text>
              <View style={styles.card}>
                {stats.recentSignups.map((u) => (
                  <View key={u.id} style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <Text style={styles.dateText}>
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.flex1}>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="Search by name or email..."
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* User list */}
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.coral} />
            }
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <View>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {item.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <View style={styles.userStats}>
                  <View style={styles.userStat}>
                    <Text style={styles.userStatValue}>{item.checkinCount}</Text>
                    <Text style={styles.userStatLabel}>Check-ins</Text>
                  </View>
                  <View style={styles.userStat}>
                    <Text style={styles.userStatValue}>{item.currentStreak}</Text>
                    <Text style={styles.userStatLabel}>Streak</Text>
                  </View>
                  <View style={styles.userStat}>
                    <Text style={styles.userStatValue}>{item.longestStreak}</Text>
                    <Text style={styles.userStatLabel}>Best</Text>
                  </View>
                  <View style={styles.userStat}>
                    <Text style={styles.userStatValue}>
                      {item.lastCheckinDate
                        ? new Date(item.lastCheckinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Never'}
                    </Text>
                    <Text style={styles.userStatLabel}>Last</Text>
                  </View>
                </View>
                <Text style={styles.joinDate}>
                  Joined {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  {search ? 'No users match your search' : 'No users yet'}
                </Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.coral,
  },
  retryText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.coral,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.coral,
  },
  tabText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    width: '48%',
    flexGrow: 1,
  },
  metricValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  segmentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  segmentLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  segmentCount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  rankText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.coral,
    width: 30,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  streakBadge: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.rise,
  },
  dateText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  // Users tab
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  adminBadge: {
    backgroundColor: Colors.coral,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  userStat: {
    alignItems: 'center',
  },
  userStatValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  userStatLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  joinDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
  },
});
