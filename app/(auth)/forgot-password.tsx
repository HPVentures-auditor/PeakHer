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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { requestPasswordReset, ApiError } from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReset() {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>

          <View style={styles.brand}>
            <Text style={styles.brandName}>PEAKHER</Text>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.heading}>Check your email</Text>
              <Text style={styles.subtext}>
                If an account with that email exists, we've sent a password reset
                link. Check your inbox (and spam folder).
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => router.replace('/(auth)/login')}
                size="lg"
                style={styles.button}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.heading}>Reset password</Text>
              <Text style={styles.subtext}>
                Enter your email and we'll send you a link to reset your
                password.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
              />

              <Button
                title="Send Reset Link"
                onPress={handleReset}
                loading={loading}
                size="lg"
                style={styles.button}
              />
            </View>
          )}
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
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: Spacing.sm,
  },
  backText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
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
  successContainer: {
    alignItems: 'center',
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
    textAlign: 'center',
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
});
