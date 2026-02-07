import {
  DEFAULT_DESKTOP_SETTINGS,
  type DesktopSettings,
} from "@blah-chat/shared/desktop";

export const DESKTOP_CLIENT_HEADER = "X-Blah-Desktop-Client";
export const DESKTOP_CLIENT_VALUE = "tauri-v1";

type TauriCore = {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
};

type TauriWindow = {
  __TAURI__?: {
    core?: TauriCore;
  };
};

function getTauriCore(): TauriCore | null {
  if (typeof window === "undefined") return null;
  const core = (window as TauriWindow).__TAURI__?.core;
  if (!core?.invoke) return null;
  return core;
}

export function isDesktopShell(): boolean {
  return !!getTauriCore();
}

export function getDesktopSettingsDefaults(): DesktopSettings {
  return DEFAULT_DESKTOP_SETTINGS;
}

export async function openMainWindow(route?: string): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("open_main_window", { route });
  return true;
}

export async function openCompanion(route?: string): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("open_companion", { route });
  return true;
}

export async function showDesktopNotification(
  title: string,
  body: string,
): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("show_notification", { title, body });
  return true;
}

export async function registerDesktopShortcut(
  shortcut: string,
): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("register_shortcut", { shortcut });
  return true;
}
