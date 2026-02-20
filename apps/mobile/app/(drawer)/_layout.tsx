import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { ActivityIndicator, View } from "react-native";
import { DrawerContentV2 } from "@/components/drawer/DrawerContentV2";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
    <ErrorBoundary>
      <Drawer
        drawerContent={(props) => <DrawerContentV2 {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "slide",
          sceneStyle: {
            backgroundColor: "transparent",
          },
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
        <Drawer.Screen
          name="notes"
          options={{
            drawerLabel: "Notes",
            swipeEnabled: true,
          }}
        />
        <Drawer.Screen
          name="projects/index"
          options={{
            drawerLabel: "Projects",
            swipeEnabled: true,
          }}
        />
        <Drawer.Screen
          name="bookmarks"
          options={{
            drawerLabel: "Bookmarks",
            swipeEnabled: true,
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: "Settings",
            swipeEnabled: true,
          }}
        />
      </Drawer>
    </ErrorBoundary>
  );
}
