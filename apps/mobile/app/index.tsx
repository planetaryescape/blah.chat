import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { palette } from "@/lib/theme/designSystem";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

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
        <ActivityIndicator size="large" color={palette.starlight} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(drawer)/chat/new" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
