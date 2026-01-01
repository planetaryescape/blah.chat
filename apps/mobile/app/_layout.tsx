import "../lib/polyfills"; // MUST BE FIRST - Node.js polyfills for Convex
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { LinearGradient } from "expo-linear-gradient";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { persister, queryClient } from "@/lib/cache/queryClient";
import { tokenCache } from "@/lib/clerk";
import { convex } from "@/lib/convex";
import { colors } from "@/lib/theme/colors";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!clerkPublishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
}

function RootLayoutNav() {
  return (
    // @ts-ignore - React 18/19 type mismatch in monorepo
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          {/* Global Nebula Background */}
          <LinearGradient
            colors={["#0c0a14", "#1a1625", "#0c0a14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            {/* @ts-ignore - React 18/19 type mismatch in monorepo */}
            <ClerkProvider
              publishableKey={clerkPublishableKey}
              tokenCache={tokenCache}
            >
              {/* @ts-ignore - React 18/19 type mismatch in monorepo */}
              <ClerkLoaded>
                <PersistQueryClientProvider
                  client={queryClient}
                  persistOptions={{ persister }}
                >
                  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                    <BottomSheetModalProvider>
                      <RootLayoutNav />
                      <StatusBar style="light" />
                    </BottomSheetModalProvider>
                  </ConvexProviderWithClerk>
                </PersistQueryClientProvider>
              </ClerkLoaded>
            </ClerkProvider>
          </LinearGradient>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
