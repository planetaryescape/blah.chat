import "../lib/polyfills"; // MUST BE FIRST - Node.js polyfills for mobile SDK/runtime
console.log("[mobile][init] polyfills loaded");

import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { resourceCache } from "@clerk/clerk-expo/resource-cache";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { persister, queryClient } from "@/lib/cache/queryClient";
import { tokenCache } from "@/lib/clerk";
import { MobileRuntimeBridge } from "@/lib/offline/RuntimeBridge";
import { getRuntimeConfig } from "@/lib/runtimeConfig";
import { palette } from "@/lib/theme/designSystem";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash was already hidden
});

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "transparent",
    card: "transparent",
    border: palette.glassBorder,
    text: palette.starlight,
    primary: palette.roseQuartz,
  },
};

function RootLayoutNav() {
  return (
    // @ts-ignore - React 18/19 type mismatch in monorepo
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}

function ConfigurationError({
  title,
  message,
  logMessage,
}: {
  title: string;
  message: string;
  logMessage: string;
}) {
  useEffect(() => {
    console.error(logMessage);
  }, [logMessage]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "Syne_600SemiBold",
          fontSize: 20,
          color: palette.starlight,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Manrope_500Medium",
          fontSize: 14,
          color: palette.starlightDim,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function DiagnosticOverlay({ onRetry }: { onRetry: () => void }) {
  const [networkStatus, setNetworkStatus] = useState<string>("checking...");
  const [clerkFapiStatus, setClerkFapiStatus] = useState<string>("checking...");

  const config = useMemo(() => getRuntimeConfig(), []);
  const extra = Constants.expoConfig?.extra as
    | Record<string, unknown>
    | undefined;

  // Derive the Clerk Frontend API URL from the publishable key
  const clerkFapiDomain = useMemo(() => {
    const key = config.clerkPublishableKey;
    if (!key) return null;
    try {
      const encoded = key.replace(/^pk_(live|test)_/, "");
      const decoded = atob(encoded.replace(/\$+$/, ""));
      return decoded;
    } catch {
      return null;
    }
  }, [config.clerkPublishableKey]);

  useEffect(() => {
    // Check general network
    fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      cache: "no-store",
    })
      .then((r) => setNetworkStatus(`reachable (${r.status})`))
      .catch((e) => setNetworkStatus(`unreachable: ${e.message}`));

    // Check actual Clerk Frontend API (what ClerkProvider actually hits)
    if (clerkFapiDomain) {
      fetch(`https://${clerkFapiDomain}/v1/environment`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${config.clerkPublishableKey}`,
        },
      })
        .then((r) => setClerkFapiStatus(`${r.status} ${r.statusText}`))
        .catch((e) => setClerkFapiStatus(`unreachable: ${e.message}`));
    } else {
      setClerkFapiStatus("NO key to derive URL");
    }
  }, [clerkFapiDomain, config.clerkPublishableKey]);

  const rows: [string, string][] = [
    ["Time", new Date().toISOString()],
    ["Platform", `${Platform.OS} ${Platform.Version}`],
    [
      "navigator.onLine",
      typeof window !== "undefined"
        ? String(window.navigator?.onLine)
        : "no window",
    ],
    ["clerkKey defined", config.clerkPublishableKey ? "yes" : "NO"],
    [
      "clerkKey prefix",
      config.clerkPublishableKey?.substring(0, 15) ?? "undefined",
    ],
    [
      "clerkKey source",
      extra?.clerkPublishableKey
        ? "expoConfig.extra"
        : process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
          ? "process.env"
          : "NONE",
    ],
    [
      "expoConfig.extra",
      extra ? `keys: ${Object.keys(extra).join(",")}` : "undefined",
    ],
    ["Constants.expoConfig", Constants.expoConfig ? "defined" : "undefined"],
    ["@clerk/clerk-expo", "^2.9.0"],
    ["Network", networkStatus],
    ["Clerk FAPI domain", clerkFapiDomain ?? "unknown"],
    ["Clerk FAPI /v1/env", clerkFapiStatus],
    ["expo-constants appId", Constants.expoConfig?.slug ?? "unknown"],
  ];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text
        style={{
          fontFamily: "Syne_600SemiBold",
          fontSize: 20,
          color: palette.starlight,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        Connection Failed
      </Text>
      <Text
        style={{
          fontFamily: "Manrope_500Medium",
          fontSize: 13,
          color: palette.starlightDim,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        Clerk auth timed out after 15s. Diagnostics below — screenshot this.
      </Text>

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          borderRadius: 8,
          padding: 12,
        }}
      >
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 4,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text
              style={{
                fontFamily: "Manrope_500Medium",
                fontSize: 12,
                color: palette.starlightDim,
                flex: 1,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: "Manrope_500Medium",
                fontSize: 12,
                color:
                  value.includes("NO") ||
                  value.includes("undefined") ||
                  value.includes("NONE") ||
                  value.includes("unreachable")
                    ? "#ff6b6b"
                    : palette.starlight,
                flex: 1.5,
                textAlign: "right",
              }}
              selectable
            >
              {value}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onRetry}
        style={{
          marginTop: 16,
          backgroundColor: palette.roseQuartz,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Manrope_600SemiBold",
            fontSize: 14,
            color: "#fff",
          }}
        >
          Retry Connection
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ClerkLoadingGate({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    console.log(
      `[mobile][clerk] isLoaded changed: ${isLoaded} (after ${Date.now() - mountedAt.current}ms)`,
    );
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      console.log(
        `[mobile][clerk] Clerk loaded successfully after ${Date.now() - mountedAt.current}ms`,
      );
      setTimedOut(false);
      return;
    }

    console.log(
      `[mobile][clerk] Starting 15s timeout (attempt ${retryCount + 1})`,
    );
    const timer = setTimeout(() => {
      console.error(
        `[mobile][clerk] Clerk initialization timed out after 15 seconds (attempt ${retryCount + 1})`,
      );
      setTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoaded, retryCount]);

  const handleRetry = useCallback(() => {
    console.log("[mobile][clerk] User tapped Retry");
    setTimedOut(false);
    setRetryCount((c) => c + 1);
    mountedAt.current = Date.now();
  }, []);

  if (timedOut) {
    return <DiagnosticOverlay onRetry={handleRetry} />;
  }

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={palette.starlight} />
        <Text
          style={{
            fontFamily: "Manrope_500Medium",
            fontSize: 14,
            color: palette.starlightDim,
          }}
        >
          Connecting...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const runtimeConfig = useMemo(() => getRuntimeConfig(), []);

  console.log("[mobile][layout] RootLayout rendering", {
    hasClerkKey: !!runtimeConfig.clerkPublishableKey,
  });

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          Syne_400Regular: require("@expo-google-fonts/syne/400Regular/Syne_400Regular.ttf"),
          Syne_600SemiBold: require("@expo-google-fonts/syne/600SemiBold/Syne_600SemiBold.ttf"),
          Syne_700Bold: require("@expo-google-fonts/syne/700Bold/Syne_700Bold.ttf"),
          Manrope_400Regular: require("@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf"),
          Manrope_500Medium: require("@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf"),
          Manrope_600SemiBold: require("@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf"),
          Manrope_700Bold: require("@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf"),
        });
        console.log("[mobile][fonts] Fonts loaded successfully");
      } catch (e) {
        console.warn("[mobile][fonts] Error loading fonts:", e);
      } finally {
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {
      // Ignore hide errors during startup race conditions
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.void,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={palette.starlight} />
      </View>
    );
  }

  let content: ReactNode;

  if (!runtimeConfig.clerkPublishableKey) {
    console.error(
      "[mobile][layout] Missing clerkPublishableKey - showing config error",
    );
    content = (
      <ConfigurationError
        title="Configuration Error"
        message="Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
        logMessage="[mobile] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
      />
    );
  } else {
    console.log("[mobile][layout] Rendering ClerkProvider");
    content = (
      // @ts-ignore - React 18/19 type mismatch in monorepo
      <ClerkProvider
        publishableKey={runtimeConfig.clerkPublishableKey}
        tokenCache={tokenCache}
        __experimental_resourceCache={resourceCache}
      >
        <ClerkLoadingGate>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
          >
            <MobileRuntimeBridge />
            <BottomSheetModalProvider>
              <ThemeProvider value={navigationTheme}>
                <RootLayoutNav />
              </ThemeProvider>
            </BottomSheetModalProvider>
          </PersistQueryClientProvider>
        </ClerkLoadingGate>
      </ClerkProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          {/* Global Nebula Background */}
          <LinearGradient
            colors={[palette.void, palette.nebula, "#13101A", palette.void]}
            locations={[0, 0.35, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            {content}
            <StatusBar style="light" />
          </LinearGradient>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
