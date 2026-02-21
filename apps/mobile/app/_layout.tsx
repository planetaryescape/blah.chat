import "../lib/polyfills"; // MUST BE FIRST - Node.js polyfills for Convex
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { persister, queryClient } from "@/lib/cache/queryClient";
import { tokenCache } from "@/lib/clerk";
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

function ClerkLoadingGate({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    if (timedOut) {
      console.error("[mobile] Clerk initialization timed out after 15 seconds");
    }
  }, [timedOut]);

  if (timedOut) {
    return (
      <ConfigurationError
        title="Connection Failed"
        message="Unable to connect to authentication service. Please check your connection and restart the app."
        logMessage="[mobile] Showing Clerk timeout fallback UI"
      />
    );
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
  const convex = useMemo(
    () =>
      runtimeConfig.convexUrl
        ? new ConvexReactClient(runtimeConfig.convexUrl)
        : null,
    [runtimeConfig.convexUrl],
  );

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
      } catch (e) {
        console.warn("Error loading fonts:", e);
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
    content = (
      <ConfigurationError
        title="Configuration Error"
        message="Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
        logMessage="[mobile] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
      />
    );
  } else if (!convex) {
    content = (
      <ConfigurationError
        title="Configuration Error"
        message="Missing EXPO_PUBLIC_CONVEX_URL"
        logMessage="[mobile] Missing EXPO_PUBLIC_CONVEX_URL"
      />
    );
  } else {
    content = (
      // @ts-ignore - React 18/19 type mismatch in monorepo
      <ClerkProvider
        publishableKey={runtimeConfig.clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <ClerkLoadingGate>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
          >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <BottomSheetModalProvider>
                <ThemeProvider value={navigationTheme}>
                  <RootLayoutNav />
                </ThemeProvider>
              </BottomSheetModalProvider>
            </ConvexProviderWithClerk>
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
