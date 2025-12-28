import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { MessageSquare, Settings } from "lucide-react-native";
import { useColorScheme, View, Text, Pressable } from "react-native";

function DrawerContent() {
  // Placeholder drawer content - will be replaced with ConversationList
  return (
    <View className="flex-1 bg-background pt-safe">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-lg font-semibold text-foreground">
          blah.chat
        </Text>
      </View>
      <View className="flex-1 px-2 py-2">
        <Text className="text-muted-foreground text-sm px-2">
          Conversations will appear here
        </Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const colorScheme = useColorScheme();

  // Wait for auth to load
  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">Loading...</Text>
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
      drawerContent={DrawerContent}
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#0a0a0a" : "#ffffff",
        },
        headerTintColor: colorScheme === "dark" ? "#fafafa" : "#0a0a0a",
        drawerStyle: {
          backgroundColor: colorScheme === "dark" ? "#0a0a0a" : "#ffffff",
          width: 280,
        },
        drawerActiveTintColor: colorScheme === "dark" ? "#fafafa" : "#0a0a0a",
        drawerInactiveTintColor:
          colorScheme === "dark" ? "#a1a1aa" : "#71717a",
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
        }}
      />
      <Drawer.Screen
        name="chat/[id]"
        options={{
          drawerLabel: "Conversation",
          title: "Chat",
          drawerItemStyle: { display: "none" }, // Hide from drawer list
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
        }}
      />
    </Drawer>
  );
}
