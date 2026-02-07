export interface DesktopSettings {
  companionShortcut: string;
  companionAlwaysOnTop: boolean;
  launchAtLogin: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  companionShortcut: "Alt+Space",
  companionAlwaysOnTop: true,
  launchAtLogin: false,
  notificationsEnabled: true,
};
