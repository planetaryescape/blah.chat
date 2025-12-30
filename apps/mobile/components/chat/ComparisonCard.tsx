import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { CheckCircle, Loader2, Trophy } from "lucide-react-native";
import { useMemo } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type Message = Doc<"messages">;

interface ComparisonCardProps {
  message: Message;
  index: number;
  showModelName: boolean;
  isVoted: boolean;
  hasVoted: boolean;
  onVote: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

export function ComparisonCard({
  message,
  index,
  showModelName,
  isVoted,
  hasVoted,
  onVote,
}: ComparisonCardProps) {
  // Cast for TypeScript - Convex Doc types are generic
  const content = (message.content || message.partialContent || "") as string;
  const status = message.status as string;
  const model = message.model as string;
  const cost = message.cost as number | undefined;
  const outputTokens = message.outputTokens as number | undefined;

  const isComplete = status === "complete";
  const isPending = status === "pending";
  const isGenerating = status === "generating";

  const modelName = useMemo(() => {
    if (!showModelName) return `Model ${index + 1}`;
    return model?.split(":")[1] || model || `Model ${index + 1}`;
  }, [model, index, showModelName]);

  const handleVote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVote();
  };

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: colors.foreground,
        fontFamily: fonts.body,
        fontSize: 14,
        lineHeight: 22,
      },
      code_inline: {
        backgroundColor: colors.secondary,
        color: colors.foreground,
        fontFamily: fonts.mono,
        fontSize: 13,
        paddingHorizontal: 4,
        borderRadius: 4,
      },
      fence: {
        backgroundColor: colors.secondary,
        borderRadius: radius.md,
        padding: spacing.sm,
        fontFamily: fonts.mono,
        fontSize: 12,
      },
      heading1: {
        color: colors.foreground,
        fontFamily: fonts.heading,
        fontSize: 20,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      },
      heading2: {
        color: colors.foreground,
        fontFamily: fonts.heading,
        fontSize: 18,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      },
      paragraph: {
        marginBottom: spacing.sm,
      },
      list_item: {
        marginBottom: spacing.xs,
      },
    }),
    [],
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.modelInfo}>
          <Text style={styles.modelName}>{modelName}</Text>
          {isVoted && (
            <View style={styles.winnerBadge}>
              <Trophy size={12} color={colors.star} />
              <Text style={styles.winnerText}>Winner</Text>
            </View>
          )}
        </View>
        <View style={styles.statusContainer}>
          {isPending && (
            <View style={styles.statusBadge}>
              <Loader2 size={12} color={colors.mutedForeground} />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          )}
          {isGenerating && (
            <View style={[styles.statusBadge, styles.generatingBadge]}>
              <Loader2 size={12} color={colors.primary} />
              <Text style={[styles.statusText, styles.generatingText]}>
                Generating
              </Text>
            </View>
          )}
          {isComplete && (
            <View style={[styles.statusBadge, styles.completeBadge]}>
              <CheckCircle size={12} color={colors.success} />
              <Text style={[styles.statusText, styles.completeText]}>Done</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {content ? (
          <Markdown style={markdownStyles}>{content}</Markdown>
        ) : (
          <Text style={styles.emptyText}>Waiting for response...</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {cost !== undefined && outputTokens !== undefined && (
          <Text style={styles.statsText}>
            ${cost.toFixed(4)} • {outputTokens} tokens
          </Text>
        )}
        <View style={styles.spacer} />
        {isComplete && !hasVoted && (
          <TouchableOpacity
            style={styles.voteButton}
            onPress={handleVote}
            activeOpacity={0.8}
          >
            <Trophy size={16} color={colors.primaryForeground} />
            <Text style={styles.voteButtonText}>Vote</Text>
          </TouchableOpacity>
        )}
        {hasVoted && !isVoted && (
          <Text style={styles.notWinnerText}>Not selected</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  modelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  winnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.star}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  winnerText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.star,
  },
  statusContainer: {
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  generatingBadge: {
    backgroundColor: `${colors.primary}15`,
  },
  completeBadge: {
    backgroundColor: `${colors.success}15`,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  generatingText: {
    color: colors.primary,
  },
  completeText: {
    color: colors.success,
  },
  content: {
    padding: spacing.md,
    flex: 1,
    minHeight: 200,
    maxHeight: 400,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.secondary,
  },
  statsText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  spacer: {
    flex: 1,
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  voteButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.primaryForeground,
  },
  notWinnerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
});
