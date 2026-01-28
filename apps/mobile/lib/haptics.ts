import * as Haptics from "expo-haptics";

export const haptic = {
  /** Light tap - for selections, button presses */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium tap - for important actions like send */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Success - message sent, operation complete */
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Error - failed operation */
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Selection - subtle tap for list selection */
  selection: () => Haptics.selectionAsync(),
};
