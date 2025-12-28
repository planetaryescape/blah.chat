import {
  getMobileModels,
  getModelTier,
  getProviderDisplayName,
  type ModelConfig,
} from "@blah-chat/ai";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Brain, CheckCircle, Eye } from "lucide-react-native";
import { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface ModelSelectorProps {
  selectedModel?: string;
  onSelect: (modelId: string) => void;
}

const TIER_COLORS = {
  flagship: colors.primary,
  reasoning: "#a78bfa", // Purple for thinking models
  free: colors.success,
  fast: colors.link,
} as const;

export const ModelSelector = forwardRef<BottomSheetModal, ModelSelectorProps>(
  ({ selectedModel, onSelect }, ref) => {
    const snapPoints = useMemo(() => ["50%", "85%"], []);

    const groupedModels = useMemo(() => {
      const models = getMobileModels();
      const groups: Record<string, { model: ModelConfig; tier: string }[]> = {};

      for (const model of models) {
        const providerName = getProviderDisplayName(model.provider);
        if (!groups[providerName]) {
          groups[providerName] = [];
        }
        groups[providerName].push({
          model,
          tier: getModelTier(model),
        });
      }

      const priorityOrder = [
        "OpenAI",
        "Anthropic",
        "Google",
        "xAI",
        "Perplexity",
      ];
      const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      return Object.fromEntries(sortedEntries);
    }, []);

    const handleSelect = useCallback(
      (modelId: string) => {
        onSelect(modelId);
        // @ts-ignore - ref type forwarding
        ref?.current?.dismiss();
      },
      [onSelect, ref],
    );

    const getTierColor = (tier: string) => {
      return (
        TIER_COLORS[tier as keyof typeof TIER_COLORS] || colors.mutedForeground
      );
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.title}>Select Model</Text>
          <Text style={styles.subtitle}>
            {Object.values(groupedModels).flat().length} models available
          </Text>

          <BottomSheetScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            {Object.entries(groupedModels).map(([provider, models]) => (
              <View key={provider} style={styles.providerGroup}>
                <Text style={styles.providerName}>{provider}</Text>
                {models.map(({ model, tier }) => {
                  const isSelected = selectedModel === model.id;
                  const tierColor = getTierColor(tier);
                  const hasVision = model.capabilities.includes("vision");
                  const hasThinking = model.capabilities.includes("thinking");

                  return (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelItem,
                        isSelected && styles.modelItemSelected,
                      ]}
                      onPress={() => handleSelect(model.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <View style={styles.metaRow}>
                          <View
                            style={[
                              styles.tierBadge,
                              { backgroundColor: `${tierColor}20` },
                            ]}
                          >
                            <Text
                              style={[styles.tierText, { color: tierColor }]}
                            >
                              {tier}
                            </Text>
                          </View>
                          {hasVision && (
                            <View style={styles.capabilityBadge}>
                              <Eye size={12} color={colors.mutedForeground} />
                            </View>
                          )}
                          {hasThinking && (
                            <View style={styles.capabilityBadge}>
                              <Brain size={12} color={TIER_COLORS.reasoning} />
                            </View>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <CheckCircle
                          size={22}
                          color={colors.primary}
                          fill={colors.primary}
                          strokeWidth={0}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ModelSelector.displayName = "ModelSelector";

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  providerGroup: {
    marginBottom: spacing.lg,
  },
  providerName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  modelItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modelItemSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tierText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  capabilityBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
