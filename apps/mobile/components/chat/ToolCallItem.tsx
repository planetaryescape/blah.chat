import type { Doc } from "@/lib/convex";

type ToolCall = Doc<"toolCalls">;

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
import {
  getCallState,
  getToolDescription,
  getToolIcon,
  getToolLabel,
  type ToolCallState,
} from "@/lib/utils/toolCalls";
import { MarkdownContent } from "./MarkdownContent";

interface ToolCallItemProps {
  toolCall: ToolCall;
  isLast: boolean;
}

const STATE_COLORS: Record<ToolCallState, string> = {
  executing: palette.indigo,
  complete: palette.success,
  error: palette.error,
};

export function ToolCallItem({ toolCall, isLast }: ToolCallItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const state = getCallState(toolCall);
  const isExecuting = state === "executing";
  const dotColor = STATE_COLORS[state];

  let parsedResult: any = null;
  if (toolCall.result) {
    try {
      parsedResult = JSON.parse(toolCall.result);
    } catch {}
  }

  let parsedArgs: any = null;
  if (toolCall.args) {
    try {
      parsedArgs = JSON.parse(toolCall.args);
    } catch {}
  }

  const Icon = getToolIcon(toolCall.toolName);
  const label = getToolLabel(toolCall.toolName, isExecuting, parsedResult);
  const description = getToolDescription(toolCall.toolName, parsedArgs);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isExecuting) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isExecuting, pulseScale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const resultContent =
    toolCall.result && !parsedResult
      ? toolCall.result
      : parsedResult
        ? JSON.stringify(parsedResult, null, 2)
        : null;

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {/* Timeline */}
      <View style={{ alignItems: "center", width: 20 }}>
        <Reanimated.View
          style={[
            {
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColor,
              marginTop: 6,
            },
            dotStyle,
          ]}
        />
        {!isLast && (
          <View
            style={{
              flex: 1,
              width: 1,
              backgroundColor: palette.glassMedium,
              marginTop: 4,
            }}
          />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.sm }}>
        <Pressable onPress={() => setIsExpanded(!isExpanded)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <Icon size={14} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.bodyMedium,
                fontSize: 13,
                color: palette.starlightDim,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
          {description && (
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 12,
                color: palette.textFaint,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {description}
            </Text>
          )}
        </Pressable>

        {isExpanded && resultContent && (
          <Reanimated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
          >
            <ScrollView
              style={{
                marginTop: spacing.xs,
                padding: spacing.sm,
                borderRadius: layout.radius.sm,
                backgroundColor: palette.glassSubtle,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                maxHeight: 200,
              }}
            >
              {parsedResult && typeof parsedResult === "object" ? (
                <Text
                  style={{
                    fontFamily: typography.mono,
                    fontSize: 11,
                    color: palette.textSubtle,
                    lineHeight: 16,
                  }}
                >
                  {resultContent}
                </Text>
              ) : (
                <MarkdownContent content={resultContent} />
              )}
            </ScrollView>
          </Reanimated.View>
        )}
      </View>
    </View>
  );
}
