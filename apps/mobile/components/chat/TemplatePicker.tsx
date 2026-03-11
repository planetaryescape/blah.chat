import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { FileText, Search, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useTemplates } from "@/lib/hooks/useTemplates";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
}

export function TemplatePicker({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatePickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [query, setQuery] = useState("");
  const templates = useTemplates();
  const snapPoints = useMemo(() => ["70%", "88%"], []);

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return templates;
    return templates.filter((template) =>
      [template.name, template.description ?? "", template.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, templates]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderStandardBackdrop}
      backgroundStyle={{
        backgroundColor: palette.nebula,
        borderTopLeftRadius: layout.radius.xl,
        borderTopRightRadius: layout.radius.xl,
      }}
      handleIndicatorStyle={{
        backgroundColor: palette.starlightDim,
        width: 40,
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.heading,
            fontSize: 20,
            color: palette.starlight,
            marginBottom: spacing.md,
            marginTop: spacing.sm,
          }}
        >
          Insert template
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            borderRadius: layout.radius.md,
            borderWidth: 1,
            borderColor: palette.glassBorder,
            backgroundColor: palette.glassLow,
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Search size={16} color={palette.starlightDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search templates..."
            placeholderTextColor={palette.starlightDim}
            style={{
              flex: 1,
              color: palette.starlight,
              fontFamily: typography.body,
              paddingVertical: spacing.sm,
            }}
          />
        </View>

        {filteredTemplates.map((template) => {
          const Icon = template.isBuiltIn ? Sparkles : FileText;
          return (
            <AnimatedPressable
              key={template._id}
              onPress={() => {
                onSelectTemplate(template.prompt);
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: layout.radius.md,
                backgroundColor: palette.glassLow,
                marginBottom: spacing.xs,
                borderWidth: 1,
                borderColor: palette.glassBorder,
              }}
            >
              <Icon
                size={16}
                color={palette.roseQuartz}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlight,
                  }}
                >
                  {template.name}
                </Text>
                {!!template.description && (
                  <Text
                    style={{
                      marginTop: 2,
                      fontFamily: typography.body,
                      fontSize: 13,
                      color: palette.starlightDim,
                    }}
                  >
                    {template.description}
                  </Text>
                )}
              </View>
            </AnimatedPressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
