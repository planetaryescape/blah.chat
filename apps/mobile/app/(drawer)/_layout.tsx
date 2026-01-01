import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { MessageSquare, Settings } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { DrawerContent } from "@/components/navigation/DrawerContent";
import { colors } from "@/lib/theme/colors";

export default function DrawerLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for auth to load
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    // @ts-ignore - React 18/19 type mismatch in monorepo
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerActiveTintColor: colors.foreground,
        drawerInactiveTintColor: colors.mutedForeground,
        // Enhanced navigation polish
        drawerType: "slide",
        overlayColor: "rgba(0, 0, 0, 0.6)",
        swipeEdgeWidth: 80,
        swipeMinDistance: 20,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Chat",
          title: "blah.chat",
          // @ts-ignore - React 18/19 type mismatch
          drawerIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size} />
          ),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="chat/[id]"
        options={{
          drawerLabel: "Conversation",
          title: "Chat",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="chat/new"
        options={{
          drawerLabel: "New Chat",
          title: "New Chat",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Settings",
          title: "Settings",
          // @ts-ignore - React 18/19 type mismatch
          drawerIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="projects/index"
        options={{
          title: "Projects",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="projects/[id]"
        options={{
          title: "Project",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="bookmarks"
        options={{
          title: "Bookmarks",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          title: "Search",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="notes/index"
        options={{
          title: "Notes",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="notes/[id]"
        options={{
          title: "Note",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="memories"
        options={{
          title: "Memories",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="knowledge"
        options={{
          title: "Knowledge Bank",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="templates"
        options={{
          title: "Templates",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="usage"
        options={{
          title: "Usage",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="tasks/index"
        options={{
          title: "Tasks",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="tasks/[id]"
        options={{
          title: "Task",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.foreground,
  },
});
