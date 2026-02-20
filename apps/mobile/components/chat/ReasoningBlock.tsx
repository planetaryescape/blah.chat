import { Brain, ChevronDown, Loader2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Reanimated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
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
  const chevronRotation = useSharedValue(0);

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

  useEffect(() => {
    chevronRotation.value = withSpring(isExpanded ? 1 : 0, {
      damping: 14,
      stiffness: 170,
      mass: 0.7,
    });
  }, [isExpanded, chevronRotation]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 180])}deg`,
      },
    ],
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
          <Reanimated.View style={[{ marginLeft: "auto" }, chevronStyle]}>
            <ChevronDown size={16} color={palette.starlightDim} />
          </Reanimated.View>
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
