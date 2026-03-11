import { getMobileModels } from "@blah-chat/ai";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

interface ComparisonModelPickerProps {
  isOpen: boolean;
  selectedModels: string[];
  onClose: () => void;
  onConfirm: (models: string[]) => void;
}

export function ComparisonModelPicker({
  isOpen,
  selectedModels,
  onClose,
  onConfirm,
}: ComparisonModelPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [internalSelected, setInternalSelected] =
    useState<string[]>(selectedModels);
  const snapPoints = useMemo(() => ["70%", "88%"], []);
  const models = useMemo(() => getMobileModels(), []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  const toggleModel = useCallback((modelId: string) => {
    setInternalSelected((current) => {
      if (current.includes(modelId)) {
        return current.filter((id) => id !== modelId);
      }
      if (current.length >= 4) {
        return current;
      }
      return [...current, modelId];
    });
  }, []);

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
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
            marginBottom: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          Compare models
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 13,
            color: palette.starlightDim,
            marginBottom: spacing.md,
          }}
        >
          Pick 2 to 4 models.
        </Text>

        {models.map((model) => {
          const isSelected = internalSelected.includes(model.id);
          return (
            <AnimatedPressable
              key={model.id}
              onPress={() => toggleModel(model.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing.md,
                borderRadius: layout.radius.md,
                backgroundColor: isSelected
                  ? palette.glassMedium
                  : palette.glassLow,
                marginBottom: spacing.xs,
                borderWidth: 1,
                borderColor: isSelected
                  ? palette.roseQuartz
                  : palette.glassBorder,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlight,
                  }}
                >
                  {model.name}
                </Text>
              </View>
              {isSelected && <Check size={20} color={palette.roseQuartz} />}
            </AnimatedPressable>
          );
        })}

        <AnimatedPressable
          onPress={() => onConfirm(internalSelected)}
          style={{
            marginTop: spacing.md,
            borderRadius: layout.radius.full,
            backgroundColor: palette.roseQuartz,
            paddingVertical: spacing.md,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 15,
              color: palette.void,
            }}
          >
            Apply comparison
          </Text>
        </AnimatedPressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
