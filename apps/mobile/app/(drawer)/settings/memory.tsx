import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { haptic } from "@/lib/haptics";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { useUpdatePreference } from "@/lib/hooks/useUpdatePreference";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

const EXTRACTION_LEVELS = [
  {
    value: "none",
    label: "None",
    description: "No memory extraction",
  },
  {
    value: "passive",
    label: "Passive",
    description: "Only extract when explicitly mentioned",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Extract key facts sparingly",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Balanced memory extraction",
  },
  {
    value: "active",
    label: "Active",
    description: "Actively extract and remember details",
  },
] as const;

export default function MemorySettingsScreen() {
  const router = useRouter();
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();

  const handleSelectLevel = useCallback(
    (value: string) => {
      haptic.selection();
      updatePref("memoryExtractionLevel", value);
    },
    [updatePref],
  );

  if (!prefs) return null;

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
          Memory
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <SettingsSection title="Extraction Level">
          {EXTRACTION_LEVELS.map((level, index) => {
            const selected = prefs.memoryExtractionLevel === level.value;
            return (
              <View key={level.value}>
                {index > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: palette.glassBorder,
                      marginHorizontal: spacing.md,
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => handleSelectLevel(level.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    minHeight: 48,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selected
                        ? palette.roseQuartz
                        : palette.starlightDim,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: spacing.sm,
                    }}
                  >
                    {selected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: palette.roseQuartz,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: typography.bodyMedium,
                        fontSize: 15,
                        color: palette.starlight,
                      }}
                    >
                      {level.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.body,
                        fontSize: 12,
                        color: palette.starlightDim,
                        marginTop: 2,
                      }}
                    >
                      {level.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
