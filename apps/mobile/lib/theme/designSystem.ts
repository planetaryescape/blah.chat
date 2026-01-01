/**
 * Nebula Glass Design System
 *
 * A premium, space-inspired design system features deep cosmic backgrounds,
 * starlight accents, and glassmorphic surfaces.
 */

export const palette = {
  // Base
  obsidian: "#050408", // Deepest black-purple
  void: "#0c0a14", // Main background
  nebula: "#1a1625", // Slightly lighter background

  // Accents
  roseQuartz: "#F4E0DC",
  roseQuartzDim: "#d4c0bc",
  starlight: "#fafafa",
  starlightDim: "rgba(250, 250, 250, 0.6)",

  // Functional
  indigo: "#6366f1",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#fbbf24",

  // Glass
  glassHigh: "rgba(255, 255, 255, 0.15)",
  glassMedium: "rgba(255, 255, 255, 0.1)",
  glassLow: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
};

export const typography = {
  display: "Syne_700Bold",
  heading: "Syne_600SemiBold",
  bodyBold: "Manrope_700Bold",
  bodySemiBold: "Manrope_600SemiBold",
  bodyMedium: "Manrope_500Medium",
  body: "Manrope_400Regular",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const layout = {
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },
  headerHeight: 60,
};

// Export compatibility layer for existing code (will be refactored gradually)
export const colors = {
  background: palette.void,
  foreground: palette.starlight,
  primary: palette.roseQuartz,
  primaryForeground: palette.void,
  secondary: palette.nebula,
  secondaryForeground: palette.starlight,
  muted: palette.nebula,
  mutedForeground: palette.starlightDim,
  accent: palette.glassLow,
  accentForeground: palette.starlight,
  destructive: palette.error,
  destructiveForeground: palette.starlight,
  border: palette.glassBorder,
  input: palette.glassLow,
  ring: palette.roseQuartz,
  card: palette.nebula,

  // Custom
  userBubble: palette.roseQuartz,
  userBubbleText: palette.void,
  aiBubble: palette.glassLow,
  aiBubbleText: palette.starlight,
  generating: palette.roseQuartz,

  ...palette,
};
