import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/stores/authStore';
import { ApiError } from '../../src/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/today');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandName}>PEAKHER</Text>
            <Text style={styles.tagline}>Your cycle. Your power.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Welcome back</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              secureToggle
              autoComplete="password"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.button}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotLink}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  brandName: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 4,
    color: Colors.teal,
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  heading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  errorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
    backgroundColor: 'rgba(232, 116, 97, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    marginTop: Spacing.sm,
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  forgotText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing['2xl'],
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.coral,
  },
});
