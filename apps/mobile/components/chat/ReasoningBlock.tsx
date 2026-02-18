import { Brain, ChevronDown, Loader2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Reanimated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface ReasoningBlockProps {
  reasoning?: string;
  partialReasoning?: string;
  thinkingStartedAt?: number;
  thinkingCompletedAt?: number;
  reasoningTokens?: number;
  isThinking?: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

export function ReasoningBlock({
  reasoning,
  partialReasoning,
  thinkingStartedAt,
  thinkingCompletedAt,
  reasoningTokens,
  isThinking = false,
}: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayReasoning = reasoning || partialReasoning;
  const hasReasoningMetadata = thinkingCompletedAt && thinkingStartedAt;

  if (!displayReasoning && !hasReasoningMetadata && !isThinking) return null;

  const thinkingDurationMs =
    thinkingCompletedAt && thinkingStartedAt
      ? thinkingCompletedAt - thinkingStartedAt
      : null;

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isThinking) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isThinking, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <Reanimated.View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
            },
            isThinking ? pulseStyle : undefined,
          ]}
        >
          {isThinking ? (
            <Reanimated.View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Loader2 size={16} color={palette.starlightDim} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 13,
                  color: palette.starlightDim,
                }}
              >
                Thinking...
              </Text>
            </Reanimated.View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Brain size={16} color={palette.starlightDim} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 13,
                  color: palette.starlightDim,
                }}
              >
                {thinkingDurationMs !== null
                  ? `Thought for ${formatDuration(thinkingDurationMs)}`
                  : "Reasoning"}
                {reasoningTokens ? ` (${reasoningTokens} tokens)` : ""}
              </Text>
            </View>
          )}
          <View style={{ marginLeft: "auto" }}>
            <ChevronDown
              size={16}
              color={palette.starlightDim}
              style={{
                transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
              }}
            />
          </View>
        </Reanimated.View>
      </Pressable>

      {isExpanded && displayReasoning && (
        <Reanimated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
        >
          <ScrollView
            style={{
              marginTop: spacing.xs,
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassSubtle,
              borderWidth: 1,
              borderColor: palette.glassBorder,
              maxHeight: 200,
            }}
          >
            <Text
              style={{
                fontFamily: typography.mono,
                fontSize: 13,
                color: palette.textMuted,
                lineHeight: 20,
              }}
            >
              {displayReasoning}
            </Text>
          </ScrollView>
        </Reanimated.View>
      )}
    </View>
  );
}
