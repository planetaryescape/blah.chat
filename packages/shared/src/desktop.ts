export interface DesktopSettings {
  companionEnabled: boolean;
  companionShortcut: string;
  companionAlwaysOnTop: boolean;
  launchAtLogin: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  companionEnabled: true,
  companionShortcut: "Alt+Space",
  companionAlwaysOnTop: true,
  launchAtLogin: false,
  notificationsEnabled: true,
};
