import { useAuth, useUser } from "@clerk/clerk-expo";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import {
  AlertTriangle,
  Brain,
  Key,
  Lightbulb,
  LogOut,
  Menu,
  Mic,
  Puzzle,
  Settings2,
  Shield,
  Sparkles,
  User,
  Wrench,
} from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { haptic } from "@/lib/haptics";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { useUpdatePreference } from "@/lib/hooks/useUpdatePreference";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useUser();
  const { signOut } = useAuth();
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();

  const handleOpenDrawer = useCallback(() => {
    haptic.light();
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    haptic.medium();
    await signOut();
  }, [signOut]);

  const handleToggle = useCallback(
    (key: string) => (value: boolean) => {
      updatePref(key, value);
    },
    [updatePref],
  );

  const handleSlider = useCallback(
    (key: string) => (value: number) => {
      updatePref(key, Math.round(value));
    },
    [updatePref],
  );

  const handleReasoningToggle = useCallback(
    (key: string) => (value: boolean) => {
      if (!prefs) return;
      updatePref("reasoning", { ...prefs.reasoning, [key]: value });
    },
    [updatePref, prefs],
  );

  if (!prefs) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: palette.void }}
        edges={["top"]}
      >
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
          height: layout.headerHeight,
          gap: spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={handleOpenDrawer}
          style={{ padding: spacing.xs }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={24} color={palette.starlight} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
          }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account & Profile */}
        <SettingsSection title="Account">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              gap: spacing.md,
            }}
          >
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: palette.glassLow,
                }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: palette.roseQuartz,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 18,
                    color: palette.void,
                  }}
                >
                  {user?.firstName?.[0] ||
                    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 16,
                  color: palette.starlight,
                }}
              >
                {user?.fullName || user?.firstName || "User"}
              </Text>
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 13,
                  color: palette.starlightDim,
                }}
                numberOfLines={1}
              >
                {user?.emailAddresses?.[0]?.emailAddress}
              </Text>
            </View>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="action"
            label="Sign Out"
            icon={LogOut}
            onPress={handleSignOut}
            destructive
          />
        </SettingsSection>

        {/* Personalization */}
        <SettingsSection title="Personalization">
          <SettingsRow
            variant="nav"
            label="Custom Instructions"
            description="Tell the AI about yourself and how to respond"
            icon={User}
            onPress={() => router.push("/(drawer)/settings/personalization")}
          />
        </SettingsSection>

        {/* Models */}
        <SettingsSection title="Models">
          <SettingsRow
            variant="value"
            label="Default Model"
            value={prefs.defaultModel === "auto" ? "Auto" : prefs.defaultModel}
            icon={Sparkles}
            onPress={() => {
              // TODO: Open model picker bottom sheet (Phase 2)
            }}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="value"
            label="New Chat Model"
            value={
              prefs.newChatModelSelection === "recent" ? "Recent" : "Fixed"
            }
            icon={Settings2}
            onPress={() => {
              const next =
                prefs.newChatModelSelection === "recent" ? "fixed" : "recent";
              updatePref("newChatModelSelection", next);
            }}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Auto Router"
            description="Automatically select the best model for each message"
            icon={Lightbulb}
            value={prefs.autoRouterEnabled}
            onToggle={handleToggle("autoRouterEnabled")}
          />
          {prefs.autoRouterEnabled && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: palette.glassBorder,
                  marginHorizontal: spacing.md,
                }}
              />
              <SettingsRow
                variant="slider"
                label="Cost Bias"
                description="0 = quality focus, 100 = cheapest"
                value={prefs.autoRouterCostBias}
                onValueChange={handleSlider("autoRouterCostBias")}
                min={0}
                max={100}
                step={5}
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: palette.glassBorder,
                  marginHorizontal: spacing.md,
                }}
              />
              <SettingsRow
                variant="slider"
                label="Speed Bias"
                description="0 = quality focus, 100 = fastest"
                value={prefs.autoRouterSpeedBias}
                onValueChange={handleSlider("autoRouterSpeedBias")}
                min={0}
                max={100}
                step={5}
              />
            </>
          )}
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Model Recommendations"
            description="Suggest cheaper models when appropriate"
            value={prefs.enableModelRecommendations}
            onToggle={handleToggle("enableModelRecommendations")}
          />
        </SettingsSection>

        {/* Chat */}
        <SettingsSection title="Chat">
          <SettingsRow
            variant="toggle"
            label="Message Statistics"
            description="Show token counts and cost per message"
            value={prefs.showMessageStatistics}
            onToggle={handleToggle("showMessageStatistics")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Show Model Provider"
            description="Display provider name alongside model"
            value={prefs.showModelProvider}
            onToggle={handleToggle("showModelProvider")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Always Show Actions"
            description="Keep message action buttons visible"
            value={prefs.alwaysShowMessageActions}
            onToggle={handleToggle("alwaysShowMessageActions")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Auto-Compress Context"
            description="Automatically summarize long conversations"
            value={prefs.autoCompressContext}
            onToggle={handleToggle("autoCompressContext")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Haptic Feedback"
            description="Vibration feedback for interactions"
            value={prefs.hapticFeedbackEnabled}
            onToggle={handleToggle("hapticFeedbackEnabled")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Send on Enter"
            description="Press enter to send messages"
            value={prefs.sendOnEnter}
            onToggle={handleToggle("sendOnEnter")}
          />
        </SettingsSection>

        {/* Reasoning */}
        <SettingsSection title="Reasoning">
          <SettingsRow
            variant="toggle"
            label="Show by Default"
            description="Show reasoning traces when available"
            value={prefs.reasoning.showByDefault}
            onToggle={handleReasoningToggle("showByDefault")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Auto-Expand"
            description="Automatically expand reasoning sections"
            value={prefs.reasoning.autoExpand}
            onToggle={handleReasoningToggle("autoExpand")}
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="toggle"
            label="Show During Streaming"
            description="Display reasoning while response is generating"
            value={prefs.reasoning.showDuringStreaming}
            onToggle={handleReasoningToggle("showDuringStreaming")}
          />
        </SettingsSection>

        {/* Voice */}
        <SettingsSection title="Voice">
          <SettingsRow
            variant="nav"
            label="Voice Settings"
            description="Speech-to-text, text-to-speech, voice selection"
            icon={Mic}
            onPress={() => router.push("/(drawer)/settings/voice")}
          />
        </SettingsSection>

        {/* Memory */}
        <SettingsSection title="Memory">
          <SettingsRow
            variant="nav"
            label="Memory Management"
            description="Extraction level, view and manage memories"
            icon={Brain}
            onPress={() => router.push("/(drawer)/settings/memory")}
          />
        </SettingsSection>

        {/* Knowledge Bank */}
        <SettingsSection title="Knowledge Bank">
          <SettingsRow
            variant="nav"
            label="Knowledge Sources"
            description="Manage text, URL, and file sources"
            icon={Lightbulb}
            onPress={() => router.push("/(drawer)/settings/knowledge")}
          />
        </SettingsSection>

        {/* API Keys */}
        <SettingsSection title="API Keys">
          <SettingsRow
            variant="nav"
            label="API Tokens"
            description="Manage CLI and API access tokens"
            icon={Key}
            onPress={() => router.push("/(drawer)/settings/api-keys")}
          />
        </SettingsSection>

        {/* Integrations */}
        <SettingsSection title="Integrations">
          <SettingsRow
            variant="nav"
            label="Connected Services"
            description="OAuth connections and third-party services"
            icon={Puzzle}
            onPress={() => router.push("/(drawer)/settings/integrations")}
          />
        </SettingsSection>

        {/* Advanced (BYOK) */}
        <SettingsSection title="Advanced">
          <SettingsRow
            variant="nav"
            label="Bring Your Own Keys"
            description="Use your own API keys for AI providers"
            icon={Shield}
            onPress={() => router.push("/(drawer)/settings/advanced")}
          />
        </SettingsSection>

        {/* Maintenance */}
        <SettingsSection title="Maintenance">
          <SettingsRow
            variant="action"
            label="Clean Up Empty Conversations"
            description="Remove conversations with no messages"
            icon={Wrench}
            onPress={() => {
              // TODO: Implement cleanup action (Phase 8)
              haptic.medium();
            }}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsRow
            variant="nav"
            label="Data & Account"
            description="Export data, delete data, delete account"
            icon={AlertTriangle}
            onPress={() => router.push("/(drawer)/settings/danger-zone")}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
