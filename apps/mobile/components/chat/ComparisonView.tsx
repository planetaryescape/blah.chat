import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { Scale } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { ComparisonCard } from "./ComparisonCard";

type Message = Doc<"messages">;

interface ComparisonViewProps {
  messages: Message[];
  comparisonGroupId: string;
  showModelNames: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_SPACING = spacing.md;

export function ComparisonView({
  messages,
  comparisonGroupId,
  showModelNames,
}: ComparisonViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [votedMessageId, setVotedMessageId] = useState<Id<"messages"> | null>(
    null,
  );

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const recordVote = useMutation(api.votes.recordVote);

  // Check if any message already has votes
  const existingVote = useMemo(() => {
    for (const msg of messages) {
      // Cast via any to access votes field that may not be in base type
      const votes = (msg as any).votes as
        | { isWinner?: boolean; votedAt?: number }
        | undefined;
      if (votes?.isWinner) {
        return msg._id as Id<"messages">;
      }
    }
    return null;
  }, [messages]);

  const hasVoted = votedMessageId !== null || existingVote !== null;
  const winnerId = votedMessageId || existingVote;

  const handleVote = useCallback(
    async (messageId: Id<"messages">, index: number) => {
      if (hasVoted) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setVotedMessageId(messageId);

      try {
        // Determine rating based on position
        const rating = index === 0 ? "left_better" : "right_better";

        await recordVote({
          comparisonGroupId,
          winnerId: messageId,
          rating,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to record vote:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setVotedMessageId(null);
      }
    },
    [comparisonGroupId, hasVoted, recordVote],
  );

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
      setActiveIndex(Math.max(0, Math.min(index, messages.length - 1)));
    },
    [messages.length],
  );

  // All messages complete?
  const allComplete = messages.every(
    (m) => (m.status as string) === "complete",
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Scale size={16} color={colors.primary} />
        <Text style={styles.headerText}>Compare Models</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{messages.length}</Text>
        </View>
      </View>

      {/* Horizontal scroll cards */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {messages.map((message, index) => (
          <ComparisonCard
            key={message._id}
            message={message}
            index={index}
            showModelName={showModelNames}
            isVoted={winnerId === message._id}
            hasVoted={hasVoted}
            onVote={() => handleVote(message._id as Id<"messages">, index)}
          />
        ))}
      </ScrollView>

      {/* Page indicator */}
      <View style={styles.indicators}>
        {messages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === activeIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* Status message */}
      {!allComplete && (
        <Text style={styles.statusText}>
          Generating responses... Swipe to compare
        </Text>
      )}
      {allComplete && !hasVoted && (
        <Text style={styles.statusText}>
          Tap "Vote" on your preferred response
        </Text>
      )}
      {hasVoted && (
        <Text style={styles.votedText}>
          Vote recorded! Thank you for your feedback.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  headerText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.primaryForeground,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  votedText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.success,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
