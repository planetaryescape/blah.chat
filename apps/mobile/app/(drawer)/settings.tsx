import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { ChevronRight, LogOut, Moon, Bell, Shield, Wifi, WifiOff } from "lucide-react-native";
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  destructive,
}: SettingsItemProps) {
  return (
    <Pressable
      className="flex-row items-center px-4 py-3 bg-secondary/50 active:bg-secondary"
      onPress={onPress}
    >
      <View className="w-8 h-8 items-center justify-center">{icon}</View>
      <Text
        className={`flex-1 text-base ml-3 ${
          destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      {value && (
        <Text className="text-muted-foreground text-sm mr-2">{value}</Text>
      )}
      <ChevronRight size={20} className="text-muted-foreground" />
    </Pressable>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
        {title}
      </Text>
      <View className="rounded-xl overflow-hidden mx-4">{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  // Test Convex real-time connection
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversations = useQuery(api.conversations.list);
  const isConvexConnected = conversations !== undefined;
  const conversationCount = conversations?.length ?? 0;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* User info */}
      <View className="items-center py-6">
        <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-3">
          <Text className="text-2xl font-semibold text-primary-foreground">
            {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text className="text-lg font-semibold text-foreground">
          {user?.firstName || "User"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {user?.emailAddresses[0]?.emailAddress}
        </Text>
      </View>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsItem
          icon={<Moon size={20} className="text-foreground" />}
          label="Appearance"
          value="System"
          onPress={() => {
            // TODO: Open appearance picker
          }}
        />
        <View className="h-px bg-border" />
        <SettingsItem
          icon={<Bell size={20} className="text-foreground" />}
          label="Notifications"
          onPress={() => {
            // TODO: Open notifications settings
          }}
        />
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection title="Privacy">
        <SettingsItem
          icon={<Shield size={20} className="text-foreground" />}
          label="Privacy Policy"
          onPress={() => {
            // TODO: Open privacy policy
          }}
        />
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account">
        <SettingsItem
          icon={<LogOut size={20} className="text-destructive" />}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
      </SettingsSection>

      {/* Connection Status - Tests Convex real-time */}
      <SettingsSection title="Connection">
        <View className="flex-row items-center px-4 py-3 bg-secondary/50">
          <View className="w-8 h-8 items-center justify-center">
            {conversations === undefined ? (
              <ActivityIndicator size="small" color="#a1a1aa" />
            ) : isConvexConnected ? (
              <Wifi size={20} className="text-green-500" />
            ) : (
              <WifiOff size={20} className="text-destructive" />
            )}
          </View>
          <Text className="flex-1 text-base ml-3 text-foreground">
            Convex Status
          </Text>
          <Text className="text-muted-foreground text-sm">
            {conversations === undefined
              ? "Connecting..."
              : isConvexConnected
                ? `Connected • ${conversationCount} chats`
                : "Disconnected"}
          </Text>
        </View>
      </SettingsSection>

      {/* Version */}
      <View className="items-center mt-4">
        <Text className="text-xs text-muted-foreground">
          blah.chat v0.1.0
        </Text>
      </View>
    </ScrollView>
  );
}
