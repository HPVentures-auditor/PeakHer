import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  secureToggle = false,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.gray400}
          secureTextEntry={secureToggle ? isSecure : secureTextEntry}
          autoCapitalize="none"
          {...rest}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
  },
  toggle: {
    paddingHorizontal: Spacing.md,
  },
  toggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.teal,
  },
  error: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
