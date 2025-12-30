import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  ChevronRight,
  LogOut,
  Moon,
  Shield,
  Sparkles,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  destructive,
  showChevron = true,
}: SettingsItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.settingsItemPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[styles.settingsLabel, destructive && styles.destructiveText]}
      >
        {label}
      </Text>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      {showChevron && onPress && (
        <ChevronRight size={18} color={colors.mutedForeground} />
      )}
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversations = useQuery(api.conversations.list);
  const isConvexConnected = conversations !== undefined;
  const conversationCount = conversations?.length ?? 0;

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const preferences = useQuery(api.users.getAllUserPreferences) as
    | { ttsEnabled?: boolean }
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (preferences?.ttsEnabled !== undefined) {
      setTtsEnabled(preferences.ttsEnabled);
    }
  }, [preferences?.ttsEnabled]);

  const handleTtsToggle = async (value: boolean) => {
    setTtsEnabled(value);
    await (
      updatePreferences as (args: { ttsEnabled: boolean }) => Promise<void>
    )({
      ttsEnabled: value,
    });
  };

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

  const userInitial =
    user?.firstName?.[0] ||
    user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
    "?";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitial}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.firstName || "User"}</Text>
          <Text style={styles.userEmail}>
            {user?.emailAddresses[0]?.emailAddress}
          </Text>
        </View>
      </View>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsItem
          icon={<Moon size={20} color={colors.foreground} />}
          label="Appearance"
          value="Dark"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Bell size={20} color={colors.foreground} />}
          label="Notifications"
        />
      </SettingsSection>

      {/* Audio */}
      <SettingsSection title="Audio">
        <View style={styles.toggleItem}>
          <View style={styles.iconContainer}>
            <Volume2 size={20} color={colors.foreground} />
          </View>
          <Text style={styles.settingsLabel}>Text-to-Speech</Text>
          <Switch
            value={ttsEnabled}
            onValueChange={handleTtsToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.foreground}
          />
        </View>
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection title="Privacy">
        <SettingsItem
          icon={<Shield size={20} color={colors.foreground} />}
          label="Privacy Policy"
        />
      </SettingsSection>

      {/* Connection Status */}
      <SettingsSection title="Connection">
        <View style={styles.connectionItem}>
          <View style={styles.iconContainer}>
            {conversations === undefined ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : isConvexConnected ? (
              <Wifi size={20} color={colors.success} />
            ) : (
              <WifiOff size={20} color={colors.error} />
            )}
          </View>
          <Text style={styles.settingsLabel}>Convex Status</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isConvexConnected
                    ? colors.success
                    : colors.error,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {conversations === undefined
                ? "Connecting"
                : isConvexConnected
                  ? `${conversationCount} chats`
                  : "Offline"}
            </Text>
          </View>
        </View>
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account">
        <SettingsItem
          icon={<LogOut size={20} color={colors.error} />}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
          showChevron={false}
        />
      </SettingsSection>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.footerBrandText}>blah.chat</Text>
        </View>
        <Text style={styles.versionText}>Version 0.1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.primaryForeground,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  settingsItemPressed: {
    backgroundColor: colors.secondary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    marginLeft: spacing.sm,
    color: colors.foreground,
  },
  settingsValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginRight: spacing.xs,
  },
  destructiveText: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 36 + spacing.sm,
  },
  connectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  footer: {
    alignItems: "center",
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerBrandText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.foreground,
  },
  versionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
