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
import * as Linking from 'expo-linking';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedNotMedical, setAcknowledgedNotMedical] = useState(false);
  const [acceptedSensitiveAi, setAcceptedSensitiveAi] = useState(false);
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
    if (!acceptedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    if (!acknowledgedNotMedical) {
      setError('Please acknowledge that PeakHer is not medical advice.');
      return;
    }
    if (!acceptedSensitiveAi) {
      setError('Please consent to AI processing of the data you choose to share.');
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

  function toggleCheckbox(value: boolean, setter: (v: boolean) => void) {
    setter(!value);
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

            <View style={styles.consentBlock}>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => toggleCheckbox(acceptedTerms, setAcceptedTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && <Text style={styles.checkmark}>{'✓'}</Text>}
                </View>
                <Text style={styles.consentText}>
                  I agree to the{' '}
                  <Text style={styles.consentLink} onPress={() => Linking.openURL('https://peakher.ai/terms')}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.consentLink} onPress={() => Linking.openURL('https://peakher.ai/privacy')}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => toggleCheckbox(acknowledgedNotMedical, setAcknowledgedNotMedical)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, acknowledgedNotMedical && styles.checkboxChecked]}>
                  {acknowledgedNotMedical && <Text style={styles.checkmark}>{'✓'}</Text>}
                </View>
                <Text style={styles.consentText}>
                  I understand PeakHer is <Text style={styles.consentBold}>not medical advice</Text>, not a diagnostic tool, and not a substitute for a healthcare provider.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => toggleCheckbox(acceptedSensitiveAi, setAcceptedSensitiveAi)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, acceptedSensitiveAi && styles.checkboxChecked]}>
                  {acceptedSensitiveAi && <Text style={styles.checkmark}>{'✓'}</Text>}
                </View>
                <Text style={styles.consentText}>
                  I consent to AI (Anthropic Claude) analyzing the cycle, energy, and check-in data I choose to share, so Dot can generate my personalized insights. My data is not used to train AI models.
                </Text>
              </TouchableOpacity>
            </View>

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
  consentBlock: {
    marginTop: Spacing.lg,
    padding: Spacing.base,
    backgroundColor: 'rgba(45, 138, 138, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45, 138, 138, 0.25)',
    borderRadius: 12,
    gap: Spacing.sm,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.teal,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  consentText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  consentBold: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
  },
  consentLink: {
    color: Colors.teal,
    fontFamily: Typography.fontFamily.semiBold,
    textDecorationLine: 'underline',
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
