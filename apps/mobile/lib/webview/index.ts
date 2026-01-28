// Safe WebView import that won't crash in Expo Go
// WebView requires native modules that aren't available in Expo Go

import { TurboModuleRegistry } from "react-native";

// Check if the native WebView module is available
function isWebViewAvailable(): boolean {
  try {
    // Try to get the native module - this will return null if not linked
    const spec = TurboModuleRegistry.get("RNCWebView");
    return spec !== null;
  } catch {
    return false;
  }
}

// Export a getter that safely imports WebView only when available
export function getWebView(): React.ComponentType<any> | null {
  if (!isWebViewAvailable()) {
    return null;
  }

  try {
    // Only require if we know the native module is available
    const { WebView } = require("react-native-webview");
    return WebView;
  } catch {
    return null;
  }
}

export const webViewAvailable = isWebViewAvailable();
