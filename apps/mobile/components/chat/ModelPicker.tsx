import type { ModelConfig, Provider } from "@blah-chat/ai";
import { getMobileModels, getProviderDisplayName } from "@blah-chat/ai";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface ModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

interface GroupedModels {
  provider: Provider;
  displayName: string;
  models: ModelConfig[];
}

export function ModelPicker({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}: ModelPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);

  const models = useMemo(() => getMobileModels(), []);

  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, GroupedModels> = {};

    for (const model of models) {
      if (!groups[model.provider]) {
        groups[model.provider] = {
          provider: model.provider,
          displayName: getProviderDisplayName(model.provider),
          models: [],
        };
      }
      groups[model.provider].models.push(model);
    }

    // Sort providers: openai first, then anthropic, google, then alphabetically
    const providerOrder = ["openai", "anthropic", "google"];
    return Object.values(groups).sort((a, b) => {
      const aIndex = providerOrder.indexOf(a.provider);
      const bIndex = providerOrder.indexOf(b.provider);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [models]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
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
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
          }}
        >
          Select Model
        </Text>

        {groupedModels.map((group) => (
          <View key={group.provider} style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 13,
                color: palette.starlightDim,
                marginBottom: spacing.sm,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {group.displayName}
            </Text>

            {group.models.map((model) => {
              const isSelected = selectedModel === model.id;

              return (
                <AnimatedPressable
                  key={model.id}
                  onPress={() => onSelectModel(model.id)}
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
                    {model.userFriendlyDescription && (
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: typography.body,
                          fontSize: 13,
                          color: palette.starlightDim,
                          marginTop: 2,
                        }}
                      >
                        {model.userFriendlyDescription}
                      </Text>
                    )}
                  </View>

                  {isSelected && (
                    <Check
                      size={20}
                      color={palette.roseQuartz}
                      style={{ marginLeft: spacing.sm }}
                    />
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
