/**
 * PeakHer Design System
 * Brand colors, typography, spacing, and mode-specific theming.
 */

export const Colors = {
  // Core brand
  darkNavy: '#0a1628',
  darkNavyLight: '#0f2035',
  coral: '#E87461',
  coralHover: '#d4654f',
  teal: '#2d8a8a',
  tealLight: 'rgba(45, 138, 138, 0.15)',

  // Mode colors
  reflect: '#7BA7C2',
  build: '#5EC49A',
  perform: '#E87461',
  complete: '#C49A5E',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  gray100: '#E8E8E8',
  gray200: '#D0D0D0',
  gray300: '#B0B0B0',
  gray400: '#888888',
  gray500: '#666666',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.25)',

  // Semantic
  success: '#5EC49A',
  warning: '#C49A5E',
  error: '#E87461',
  info: '#7BA7C2',

  // Surfaces
  surface: '#0f2035',
  surfaceLight: '#162a42',
  surfaceBorder: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(10, 22, 40, 0.85)',

  // Tab bar
  tabBarBackground: '#0a1628',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabBarInactive: 'rgba(255, 255, 255, 0.4)',
  tabBarActive: '#E87461',
} as const;

export const ModeColors: Record<string, string> = {
  reflect: Colors.reflect,
  build: Colors.build,
  perform: Colors.perform,
  complete: Colors.complete,
};

export const ModeNames: Record<string, string> = {
  reflect: 'Reflect Mode',
  build: 'Build Mode',
  perform: 'Perform Mode',
  complete: 'Complete Mode',
};

export const ModeEmojis: Record<string, string> = {
  reflect: '\u{1F319}',  // crescent moon
  build: '\u{1F680}',    // rocket
  perform: '\u{2B50}',   // star
  complete: '\u{1F3AF}', // bullseye
};

export const Typography = {
  // Font families (loaded via expo-font)
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },

  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
