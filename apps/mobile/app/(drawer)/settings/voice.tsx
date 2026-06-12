import { TTS_VOICE_OPTIONS } from "@blah-chat/shared/tts";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { haptic } from "@/lib/haptics";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { useUpdatePreference } from "@/lib/hooks/useUpdatePreference";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function VoiceSettingsScreen() {
  const router = useRouter();
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);

  const handleToggle = useCallback(
    (key: string) => (value: boolean) => {
      updatePref(key, value);
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
          Voice Settings
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <SettingsSection title="Speech to Text">
          <SettingsRow
            variant="toggle"
            label="Enable STT"
            description="Allow voice input in chat"
            value={prefs.sttEnabled}
            onToggle={handleToggle("sttEnabled")}
          />
        </SettingsSection>

        <SettingsSection title="Text to Speech">
          <SettingsRow
            variant="toggle"
            label="Enable TTS"
            description="Read AI responses aloud"
            value={prefs.ttsEnabled}
            onToggle={handleToggle("ttsEnabled")}
          />
          {prefs.ttsEnabled && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: palette.glassBorder,
                  marginHorizontal: spacing.md,
                }}
              />
              <SettingsRow
                variant="value"
                label="Voice"
                value={
                  TTS_VOICE_OPTIONS.find((v) => v.value === prefs.ttsVoice)
                    ?.label ??
                  prefs.ttsVoice.replace("aura-", "").replace("-en", "")
                }
                onPress={() => {
                  haptic.light();
                  setIsVoicePickerOpen((open) => !open);
                }}
              />
              {isVoicePickerOpen && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: palette.glassBorder,
                  }}
                >
                  {TTS_VOICE_OPTIONS.map((voice) => {
                    const selected = voice.value === prefs.ttsVoice;
                    return (
                      <TouchableOpacity
                        key={voice.value}
                        onPress={() => {
                          haptic.light();
                          updatePref("ttsVoice", voice.value);
                          setIsVoicePickerOpen(false);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: selected
                              ? typography.bodySemiBold
                              : typography.body,
                            fontSize: 15,
                            color: selected
                              ? palette.roseQuartz
                              : palette.starlight,
                          }}
                        >
                          {voice.label}
                        </Text>
                        {selected && (
                          <Check size={16} color={palette.roseQuartz} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <View
                style={{
                  height: 1,
                  backgroundColor: palette.glassBorder,
                  marginHorizontal: spacing.md,
                }}
              />
              <SettingsRow
                variant="slider"
                label="Speed"
                value={prefs.ttsSpeed}
                onValueChange={(v) =>
                  updatePref("ttsSpeed", Math.round(v * 10) / 10)
                }
                min={0.5}
                max={2.0}
                step={0.1}
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
                label="Auto-Read Responses"
                description="Automatically read new AI responses"
                value={prefs.ttsAutoRead}
                onToggle={handleToggle("ttsAutoRead")}
              />
            </>
          )}
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
