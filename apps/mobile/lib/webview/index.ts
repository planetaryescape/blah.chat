// Safe WebView import that won't crash in Expo Go
// WebView requires native modules that aren't available in Expo Go

import { NativeModules, Platform } from "react-native";

// Check if the native WebView module is available
function isWebViewAvailable(): boolean {
  try {
    // Check NativeModules - more reliable than TurboModuleRegistry
    // Module name differs by platform
    const moduleName =
      Platform.OS === "ios" ? "RNCWebView" : "RNCWebViewModule";
    return NativeModules[moduleName] != null;
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
