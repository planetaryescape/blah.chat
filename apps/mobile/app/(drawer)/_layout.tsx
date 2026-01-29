import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { ActivityIndicator, View } from "react-native";
import { DrawerContent } from "@/components/drawer/DrawerContent";
import { palette } from "@/lib/theme/designSystem";

export default function DrawerLayout() {
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
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: {
          width: "85%",
          backgroundColor: palette.void,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
      initialRouteName="chat/new"
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Conversations",
          swipeEnabled: true,
        }}
      />
      <Drawer.Screen
        name="chat/new"
        options={{
          drawerLabel: "New Chat",
          swipeEnabled: false,
        }}
      />
      <Drawer.Screen
        name="chat/[id]"
        options={{
          drawerLabel: "Chat",
          swipeEnabled: false,
        }}
      />
    </Drawer>
  );
}
