import {
  DEFAULT_DESKTOP_SETTINGS,
  type DesktopSettings,
} from "@blah-chat/shared/desktop";

export const DESKTOP_CLIENT_HEADER = "X-Blah-Desktop-Client";
export const DESKTOP_CLIENT_VALUE = "tauri-v2";

type TauriCore = {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
};

type TauriEventListener<T> = (event: { payload: T }) => void;

type TauriEvent = {
  listen: <T>(
    event: string,
    handler: TauriEventListener<T>,
  ) => Promise<() => void>;
};

type TauriWindow = {
  __TAURI__?: {
    core?: TauriCore;
    event?: TauriEvent;
  };
};

function getTauriCore(): TauriCore | null {
  if (typeof window === "undefined") return null;
  const core = (window as TauriWindow).__TAURI__?.core;
  if (!core?.invoke) return null;
  return core;
}

function getTauriEvent(): TauriEvent | null {
  if (typeof window === "undefined") return null;
  const event = (window as TauriWindow).__TAURI__?.event;
  if (!event?.listen) return null;
  return event;
}

export function isDesktopShell(): boolean {
  return !!getTauriCore();
}

export function getDesktopSettingsDefaults(): DesktopSettings {
  return DEFAULT_DESKTOP_SETTINGS;
}

export async function getDesktopSettings(): Promise<DesktopSettings | null> {
  const core = getTauriCore();
  if (!core) return null;
  return await core.invoke<DesktopSettings>("get_desktop_settings");
}

export async function setDesktopSettings(
  settings: Partial<DesktopSettings>,
): Promise<DesktopSettings | null> {
  const core = getTauriCore();
  if (!core) return null;
  return await core.invoke<DesktopSettings>("set_desktop_settings", {
    settings,
  });
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

export async function setDesktopBadgeCount(count?: number): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("set_badge_count", { count: count ?? null });
  return true;
}

export async function checkDesktopConnectivity(): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return true;
  return await core.invoke<boolean>("check_connectivity");
}

export async function registerDesktopShortcut(
  shortcut: string,
): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  await core.invoke("register_shortcut", { shortcut });
  return true;
}

export interface DesktopUpdateInfo {
  version: string;
  currentVersion: string;
  body: string | null;
  publishedAt: string | null;
}

export interface DesktopUpdateStatus {
  enabled: boolean;
  available: boolean;
  update: DesktopUpdateInfo | null;
  error: string | null;
}

export async function checkDesktopUpdate(
  force = false,
): Promise<DesktopUpdateStatus> {
  const core = getTauriCore();
  if (!core) {
    return {
      enabled: false,
      available: false,
      update: null,
      error: null,
    };
  }

  return await core.invoke<DesktopUpdateStatus>("check_desktop_update", {
    force,
  });
}

export async function installDesktopUpdate(): Promise<boolean> {
  const core = getTauriCore();
  if (!core) return false;
  return await core.invoke<boolean>("install_desktop_update");
}

export async function listenDesktopEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
): Promise<(() => void) | null> {
  const event = getTauriEvent();
  if (!event) return null;
  return await event.listen<T>(eventName, (eventPayload) => {
    handler(eventPayload.payload);
  });
}
