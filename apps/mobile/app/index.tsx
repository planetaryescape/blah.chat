import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { palette } from "@/lib/theme/designSystem";

export default function Index() {
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
        <ActivityIndicator size="large" color={palette.starlight} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(drawer)/chat/new" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
