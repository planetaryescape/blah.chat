import { useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft } from "lucide-react-native";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function DangerZoneScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
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
          onPress={() => {
            haptic.light();
            router.back();
          }}
          style={{ padding: spacing.xs }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={palette.starlight} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
          }}
        >
          Danger Zone
        </Text>
      </View>

      <View
        style={{
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <SettingsSection title="Data Management">
          <SettingsRow
            variant="action"
            label="Download My Data"
            description="Export all your data as JSON"
            icon={AlertTriangle}
            onPress={() => {
              // TODO: Implement data export
              haptic.medium();
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
            variant="action"
            label="Delete All Data"
            description="Permanently delete all conversations and memories"
            icon={AlertTriangle}
            onPress={() => {
              // TODO: Implement with confirmation dialog
              haptic.medium();
            }}
            destructive
          />
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginHorizontal: spacing.md,
            }}
          />
          <SettingsRow
            variant="action"
            label="Delete Account"
            description="Permanently delete your account and all data"
            icon={AlertTriangle}
            onPress={() => {
              // TODO: Implement with confirmation dialog
              haptic.medium();
            }}
            destructive
          />
        </SettingsSection>
      </View>
    </SafeAreaView>
  );
}
