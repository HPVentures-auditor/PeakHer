import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { Colors, Typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';

const ADMIN_EMAILS = [
  'results@jairekrobbins.com',
  'jairekr@mac.com',
  'jairekr@me.com',
];

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    today: '\u2600\uFE0F',     // sun
    checkin: '\u2705',          // check mark
    patterns: '\u{1F4CA}',     // bar chart
    calendar: '\u{1F4C5}',     // calendar
    settings: '\u2699\uFE0F',  // gear
    admin: '\u{1F6E1}\uFE0F',  // shield
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '\u25CF'}
      </Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuthStore();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="checkin" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          title: 'Patterns',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="patterns" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="admin" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBarBackground,
    borderTopColor: Colors.tabBarBorder,
    borderTopWidth: 1,
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
  },
  iconContainer: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.coral,
    marginTop: 2,
  },
});
