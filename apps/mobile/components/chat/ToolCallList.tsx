import type { Doc } from "@/lib/convex";

type ToolCall = Doc<"toolCalls">;

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { ToolCallItem } from "./ToolCallItem";

interface ToolCallListProps {
  toolCalls: ToolCall[];
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  const sorted = useMemo(
    () => [...toolCalls].sort((a, b) => a.timestamp - b.timestamp),
    [toolCalls],
  );
  const [expanded, setExpanded] = useState(sorted.length <= 1);

  if (sorted.length > 1 && !expanded) {
    return (
      <AnimatedPressable
        onPress={() => setExpanded(true)}
        style={{
          marginBottom: spacing.sm,
          borderRadius: layout.radius.md,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          backgroundColor: palette.glassLow,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {sorted.length} tool calls. Tap to expand.
        </Text>
      </AnimatedPressable>
    );
  }

  return (
    <View style={{ marginBottom: spacing.sm }}>
      {sorted.length > 1 && (
        <AnimatedPressable
          onPress={() => setExpanded(false)}
          style={{ marginBottom: spacing.xs }}
        >
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
            }}
          >
            Collapse tool calls
          </Text>
        </AnimatedPressable>
      )}
      {sorted.map((tc, i) => (
        <ToolCallItem
          key={tc._id}
          toolCall={tc}
          isLast={i === sorted.length - 1}
        />
      ))}
    </View>
  );
}
