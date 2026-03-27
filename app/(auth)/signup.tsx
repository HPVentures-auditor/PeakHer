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

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  async function handleSignup() {
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number');
      return;
    }

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      // Go to onboarding
      router.replace('/onboarding/personas');
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
          <View style={styles.brand}>
            <Text style={styles.brandName}>PEAKHER</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtext}>
              Track your energy, own your patterns, perform on your terms.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoComplete="name"
            />

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
              placeholder="Min 8 chars, letter + number"
              secureTextEntry
              secureToggle
              autoComplete="new-password"
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              size="lg"
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign in</Text>
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
    marginBottom: Spacing['2xl'],
  },
  brandName: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 4,
    color: Colors.teal,
    textTransform: 'uppercase',
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  heading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
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
