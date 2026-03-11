import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Check, Zap } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

export type MobileThinkingEffort = "none" | "low" | "medium" | "high";

const OPTIONS: Array<{ value: MobileThinkingEffort; label: string }> = [
  { value: "none", label: "No reasoning" },
  { value: "low", label: "Low reasoning" },
  { value: "medium", label: "Medium reasoning" },
  { value: "high", label: "High reasoning" },
];

interface ThinkingEffortPickerProps {
  isOpen: boolean;
  value: MobileThinkingEffort;
  onClose: () => void;
  onSelect: (value: MobileThinkingEffort) => void;
}

export function ThinkingEffortPicker({
  isOpen,
  value,
  onClose,
  onSelect,
}: ThinkingEffortPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["42%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
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
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
          }}
        >
          <Zap size={18} color={palette.starlight} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
            }}
          >
            Reasoning effort
          </Text>
        </View>

        {OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <AnimatedPressable
              key={option.value}
              onPress={() => onSelect(option.value)}
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
              <Text
                style={{
                  flex: 1,
                  fontFamily: typography.bodySemiBold,
                  fontSize: 15,
                  color: palette.starlight,
                }}
              >
                {option.label}
              </Text>
              {isSelected && <Check size={20} color={palette.roseQuartz} />}
            </AnimatedPressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
