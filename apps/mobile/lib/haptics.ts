import * as Haptics from "expo-haptics";

/**
 * Centralized haptic feedback patterns
 * Consolidates existing usage across the app
 */
export const haptics = {
  /** Light tap - copy, selection, minor actions */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium impact - send message, record start, important actions */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Heavy impact - delete, destructive actions */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /** Success notification - save complete, action succeeded */
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Error notification - validation failed, action errored */
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Selection change - tabs, chips, toggles */
  selection: () => Haptics.selectionAsync(),
};
