import {
  getMobileModels,
  getModelTier,
  getProviderDisplayName,
  type ModelConfig,
} from "@blah-chat/ai";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation } from "convex/react";
import { Brain, CheckCircle, Eye, RotateCcw } from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createGlassBackground } from "@/components/ui/GlassBackground";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

const GlassBackgroundComponent = createGlassBackground();

interface RegenerateModalProps {
  messageId: Id<"messages"> | null;
  currentModelId?: string;
  onRegenerated?: () => void;
}

const TIER_COLORS = {
  flagship: colors.primary,
  reasoning: "#a78bfa",
  free: colors.success,
  fast: colors.link,
} as const;

export const RegenerateModal = forwardRef<
  BottomSheetModal,
  RegenerateModalProps
>(({ messageId, currentModelId, onRegenerated }, ref) => {
  const snapPoints = useMemo(() => ["60%", "85%"], []);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const regenerate = useMutation(api.chat.regenerate);

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

  const handleRegenerate = useCallback(async () => {
    if (!messageId || isRegenerating) return;

    setIsRegenerating(true);
    haptics.medium();

    try {
      await (
        regenerate as (args: {
          messageId: Id<"messages">;
          modelId?: string;
        }) => Promise<Id<"messages">>
      )({
        messageId,
        modelId: selectedModel || undefined,
      });

      haptics.success();
      // @ts-ignore - ref type forwarding
      ref?.current?.dismiss();
      onRegenerated?.();
    } catch (error) {
      console.error("Failed to regenerate:", error);
      haptics.error();
    } finally {
      setIsRegenerating(false);
    }
  }, [
    messageId,
    selectedModel,
    regenerate,
    ref,
    onRegenerated,
    isRegenerating,
  ]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel((prev) => (prev === modelId ? null : modelId));
    haptics.selection();
  }, []);

  const getTierColor = (tier: string) => {
    return (
      TIER_COLORS[tier as keyof typeof TIER_COLORS] || colors.mutedForeground
    );
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundComponent={GlassBackgroundComponent}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <RotateCcw size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Regenerate Response</Text>
            <Text style={styles.subtitle}>
              {selectedModel
                ? "Using selected model"
                : "Using current model (or select one)"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.regenerateButton,
            isRegenerating && styles.regenerateButtonDisabled,
          ]}
          onPress={handleRegenerate}
          disabled={isRegenerating}
          activeOpacity={0.8}
        >
          <RotateCcw
            size={18}
            color={colors.primaryForeground}
            style={isRegenerating ? styles.spinning : undefined}
          />
          <Text style={styles.regenerateButtonText}>
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Or select a different model</Text>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {Object.entries(groupedModels).map(([provider, models]) => (
            <View key={provider} style={styles.providerGroup}>
              <Text style={styles.providerName}>{provider}</Text>
              {models.map(({ model, tier }) => {
                const isSelected = selectedModel === model.id;
                const isCurrent = currentModelId === model.id;
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
                    onPress={() => handleModelSelect(model.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelInfo}>
                      <View style={styles.modelNameRow}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Current</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.metaRow}>
                        <View
                          style={[
                            styles.tierBadge,
                            { backgroundColor: `${tierColor}20` },
                          ]}
                        >
                          <Text style={[styles.tierText, { color: tierColor }]}>
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
});

RegenerateModal.displayName = "RegenerateModal";

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  spinning: {
    opacity: 0.7,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
  modelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  currentBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  currentText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
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
