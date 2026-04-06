/**
 * Root Layout
 *
 * Loads fonts, checks auth state, and sets up the navigation stack.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Colors } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useNotifications } from '../src/hooks/useNotifications';

// Keep splash screen visible while we load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Set up push notifications
  useNotifications();

  // Check auth on mount
  useEffect(() => {
    async function prepare() {
      await checkAuth();
      setAppReady(true);
    }
    prepare();
  }, []);

  // Hide splash when ready
  useEffect(() => {
    if (fontsLoaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady]);

  // Protect routes
  useEffect(() => {
    if (!fontsLoaded || !appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      // Not signed in — redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Signed in but on auth screen — redirect to app
      if (user && !user.onboardingComplete) {
        router.replace('/onboarding/personas');
      } else {
        router.replace('/(tabs)/today');
      }
    }
  }, [isAuthenticated, segments, fontsLoaded, appReady]);

  if (!fontsLoaded || !appReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.coral} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
