import {
  DESKTOP_CLIENT_HEADER,
  DESKTOP_CLIENT_VALUE,
  isDesktopShell,
} from "@/lib/desktop/ipc";

export function getDesktopClientHeaders(): Record<string, string> {
  if (!isDesktopShell()) return {};

  return {
    [DESKTOP_CLIENT_HEADER]: DESKTOP_CLIENT_VALUE,
  };
}
