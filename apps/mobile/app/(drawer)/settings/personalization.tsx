import { toast } from "burnt";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { FluidButton } from "@/components/ui/FluidButton";
import { haptic } from "@/lib/haptics";
import {
  useCustomInstructions,
  useUpdateCustomInstructions,
} from "@/lib/hooks/useCustomInstructions";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

const STYLE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "candid", label: "Candid" },
  { value: "quirky", label: "Quirky" },
  { value: "efficient", label: "Efficient" },
  { value: "nerdy", label: "Nerdy" },
  { value: "cynical", label: "Cynical" },
] as const;

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={{
          fontFamily: typography.bodyMedium,
          fontSize: 13,
          color: palette.starlightDim,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textFaint}
        multiline={multiline}
        style={{
          fontFamily: typography.body,
          fontSize: 15,
          color: palette.starlight,
          backgroundColor: palette.glassLow,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          borderRadius: layout.radius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export default function PersonalizationScreen() {
  const router = useRouter();
  const instructions = useCustomInstructions();
  const updateInstructions = useUpdateCustomInstructions();

  const [enabled, setEnabled] = useState<boolean>(instructions.enabled);
  const [baseStyleAndTone, setBaseStyleAndTone] = useState<string>(
    instructions.baseStyleAndTone,
  );
  const [nickname, setNickname] = useState<string>(instructions.nickname);
  const [occupation, setOccupation] = useState<string>(instructions.occupation);
  const [moreAboutYou, setMoreAboutYou] = useState<string>(
    instructions.moreAboutYou,
  );
  const [responseStyle, setResponseStyle] = useState<string>(
    instructions.responseStyle,
  );

  useEffect(() => {
    setEnabled(instructions.enabled);
    setBaseStyleAndTone(instructions.baseStyleAndTone);
    setNickname(instructions.nickname);
    setOccupation(instructions.occupation);
    setMoreAboutYou(instructions.moreAboutYou);
    setResponseStyle(instructions.responseStyle);
  }, [instructions]);

  const handleSave = useCallback(async () => {
    haptic.medium();
    try {
      await updateInstructions({
        ...instructions,
        enabled,
        baseStyleAndTone,
        nickname,
        occupation,
        moreAboutYou,
        responseStyle,
      });
      toast({ preset: "done", title: "Saved" });
      router.back();
    } catch {
      haptic.error();
      toast({ preset: "error", title: "Failed to save" });
    }
  }, [
    updateInstructions,
    instructions,
    enabled,
    baseStyleAndTone,
    nickname,
    occupation,
    moreAboutYou,
    responseStyle,
    router,
  ]);

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
          Personalization
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Enabled Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
              borderWidth: 1,
              borderColor: palette.glassBorder,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: typography.bodyMedium,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              Enable Custom Instructions
            </Text>
            <Switch
              value={enabled}
              onValueChange={(v) => {
                haptic.selection();
                setEnabled(v);
              }}
              trackColor={{
                false: palette.glassMedium,
                true: palette.roseQuartzDim,
              }}
              thumbColor={enabled ? palette.roseQuartz : palette.starlightDim}
            />
          </View>

          {/* Style & Tone */}
          <View style={{ gap: spacing.xs }}>
            <Text
              style={{
                fontFamily: typography.bodyMedium,
                fontSize: 13,
                color: palette.starlightDim,
              }}
            >
              Style & Tone
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
              }}
            >
              {STYLE_OPTIONS.map((opt) => {
                const selected = baseStyleAndTone === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      haptic.selection();
                      setBaseStyleAndTone(opt.value);
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: layout.radius.full,
                      backgroundColor: selected
                        ? palette.roseQuartz
                        : palette.glassLow,
                      borderWidth: 1,
                      borderColor: selected
                        ? palette.roseQuartz
                        : palette.glassBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.bodyMedium,
                        fontSize: 13,
                        color: selected ? palette.void : palette.starlight,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <InputField
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="What should the AI call you?"
          />

          <InputField
            label="Occupation"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="What do you do?"
          />

          <InputField
            label="About You"
            value={moreAboutYou}
            onChangeText={setMoreAboutYou}
            placeholder="Tell the AI more about yourself..."
            multiline
          />

          <InputField
            label="Response Style"
            value={responseStyle}
            onChangeText={setResponseStyle}
            placeholder="How should the AI respond? (e.g., concise, detailed, use examples)"
            multiline
          />

          <FluidButton title="Save" onPress={handleSave} variant="primary" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
