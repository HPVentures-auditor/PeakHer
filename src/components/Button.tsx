import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    disabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.coral : Colors.white}
          size="small"
        />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  primary: {
    backgroundColor: Colors.coral,
  },
  secondary: {
    backgroundColor: Colors.teal,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.coral,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  size_md: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Typography.fontFamily.semiBold,
  },
  label_primary: {
    color: Colors.white,
  },
  label_secondary: {
    color: Colors.white,
  },
  label_outline: {
    color: Colors.coral,
  },
  label_ghost: {
    color: Colors.coral,
  },
  labelSize_sm: {
    fontSize: Typography.fontSize.sm,
  },
  labelSize_md: {
    fontSize: Typography.fontSize.md,
  },
  labelSize_lg: {
    fontSize: Typography.fontSize.lg,
  },
  labelDisabled: {
    opacity: 0.7,
  },
});
