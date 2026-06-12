import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Brain,
  Key,
  Lightbulb,
  LogOut,
  Mic,
  Puzzle,
  Settings2,
  Shield,
  Sparkles,
  User,
  Wrench,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { haptic } from "@/lib/haptics";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { useUpdatePreference } from "@/lib/hooks/useUpdatePreference";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  const handleModelPickerSelect = useCallback(
    (modelId: string) => {
      updatePref("defaultModel", modelId);
      setIsModelPickerOpen(false);
    },
    [updatePref],
  );

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.cleanupEmptyConversations({ keepOne: true });
    },
    onSuccess: (result) => {
      haptic.success();
      Alert.alert(
        "Cleanup Complete",
        `Deleted ${result.deletedCount} empty conversation${
          result.deletedCount === 1 ? "" : "s"
        }.`,
      );
    },
    onError: () => {
      haptic.error();
      Alert.alert("Error", "Failed to clean up conversations.");
    },
  });

  const handleCleanupEmpty = useCallback(() => {
    haptic.medium();
    Alert.alert(
      "Clean Up Empty Conversations",
      "Remove all conversations with no messages?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean Up",
          style: "destructive",
          onPress: () => cleanupMutation.mutate(),
        },
      ],
    );
  }, [cleanupMutation]);

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
        style={{ flex: 1, backgroundColor: "transparent" }}
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
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader title="Settings" leftAction="menu" />

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
          <SettingsRow
            variant="value"
            label="Default Model"
            value={prefs.defaultModel === "auto" ? "Auto" : prefs.defaultModel}
            icon={Sparkles}
            onPress={() => setIsModelPickerOpen(true)}
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
          <SettingsRow
            variant="toggle"
            label="Show Model Provider"
            description="Display provider name alongside model"
            value={prefs.showModelProvider}
            onToggle={handleToggle("showModelProvider")}
          />
          <SettingsRow
            variant="toggle"
            label="Always Show Actions"
            description="Keep message action buttons visible"
            value={prefs.alwaysShowMessageActions}
            onToggle={handleToggle("alwaysShowMessageActions")}
          />
          <SettingsRow
            variant="toggle"
            label="Auto-Compress Context"
            description="Automatically summarize long conversations"
            value={prefs.autoCompressContext}
            onToggle={handleToggle("autoCompressContext")}
          />
          <SettingsRow
            variant="toggle"
            label="Haptic Feedback"
            description="Vibration feedback for interactions"
            value={prefs.hapticFeedbackEnabled}
            onToggle={handleToggle("hapticFeedbackEnabled")}
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
          <SettingsRow
            variant="toggle"
            label="Auto-Expand"
            description="Automatically expand reasoning sections"
            value={prefs.reasoning.autoExpand}
            onToggle={handleReasoningToggle("autoExpand")}
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
            onPress={handleCleanupEmpty}
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

      <ModelPicker
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        selectedModel={prefs.defaultModel}
        onSelectModel={handleModelPickerSelect}
      />
    </SafeAreaView>
  );
}
