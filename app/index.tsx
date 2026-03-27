/**
 * Index Route — redirects based on auth state.
 * The _layout.tsx handles the actual redirect logic;
 * this just renders nothing while the redirect happens.
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function IndexRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/(auth)/login" />;
}
