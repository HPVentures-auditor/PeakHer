/**
 * Push Notifications Hook
 *
 * Handles permission requests, token registration, and notification tap handling.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import type { EventSubscription } from 'expo-modules-core';
import { registerPushToken } from '../services/api';

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
