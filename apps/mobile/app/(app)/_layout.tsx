import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { palette } from "@/lib/theme/designSystem";

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.void,
        }}
      >
        <ActivityIndicator size="large" color={palette.roseQuartz} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    // @ts-ignore - React 18/19 type mismatch in monorepo
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.void },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/new" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
}
