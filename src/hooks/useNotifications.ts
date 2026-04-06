/**
 * Push Notifications Hook
 *
 * Handles permission requests, token registration, and notification tap handling.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import type { EventSubscription } from 'expo-modules-core';
import { registerPushToken } from '../services/api';

const REMINDER_KEY = 'peakher_daily_reminder';
const REMINDER_HOUR_KEY = 'peakher_reminder_hour';

// Dot-voice reminder messages — rotated daily
const DOT_REMINDERS = [
  'Hey, quick pulse check? Two sliders, 10 seconds. I get smarter every time.',
  'Your future self wants data. Check in now — 10 seconds.',
  'Dot here. How are we doing today? Slide in and tell me.',
  'Morning! Energy and confidence — give me the numbers. I\'ll do the rest.',
  'Check-in time. The more I know, the better your briefings get.',
  'Your body has intel. Let\'s log it before you forget.',
  'Quick check-in? I promise it\'s faster than scrolling Instagram.',
];

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Could update badge count or show in-app alert
      });

    // Listen for notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // Navigate based on notification data
        if (data?.screen === 'checkin') {
          router.push('/(tabs)/checkin');
        } else if (data?.screen === 'briefing') {
          router.push('/(tabs)/today');
        } else if (data?.screen === 'patterns') {
          router.push('/(tabs)/patterns');
        } else {
          // Default: go to today
          router.push('/(tabs)/today');
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    // Push notifications only work on physical devices
    return;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();

    const pushToken = tokenData.data;

    // Register with our backend
    try {
      await registerPushToken(pushToken);
    } catch {
      // Silently fail — user might not be logged in yet
    }

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E87461',
      });
    }
  } catch {
    // Silently fail — notifications are non-critical
  }
}

// ---------------------------------------------------------------------------
// Daily check-in reminder (local scheduled notification)
// ---------------------------------------------------------------------------

/**
 * Schedule a daily check-in reminder at the given hour (0-23).
 * Cancels any existing reminder first.
 */
export async function scheduleDailyReminder(hour: number = 9): Promise<void> {
  try {
    // Cancel existing
    await cancelDailyReminder();

    const message = DOT_REMINDERS[Math.floor(Math.random() * DOT_REMINDERS.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '\u{1F4AC} Dot wants a check-in',
        body: message,
        data: { screen: 'checkin' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(REMINDER_KEY, 'true');
    await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
  } catch {
    // Silently fail
  }
}

/**
 * Cancel the daily check-in reminder.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(REMINDER_KEY, 'false');
  } catch {
    // Silently fail
  }
}

/**
 * Check if daily reminder is enabled and what hour.
 */
export async function getReminderSettings(): Promise<{ enabled: boolean; hour: number }> {
  try {
    const enabled = (await AsyncStorage.getItem(REMINDER_KEY)) === 'true';
    const hourStr = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
    const hour = hourStr ? parseInt(hourStr, 10) : 9;
    return { enabled, hour };
  } catch {
    return { enabled: false, hour: 9 };
  }
}
