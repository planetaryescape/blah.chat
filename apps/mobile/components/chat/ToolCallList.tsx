import type { Doc } from "@/lib/convex";

type ToolCall = Doc<"toolCalls">;

import { useMemo } from "react";
import { View } from "react-native";
import { spacing } from "@/lib/theme/designSystem";
import { ToolCallItem } from "./ToolCallItem";

interface ToolCallListProps {
  toolCalls: ToolCall[];
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  const sorted = useMemo(
    () => [...toolCalls].sort((a, b) => a.timestamp - b.timestamp),
    [toolCalls],
  );

  return (
    <View style={{ marginBottom: spacing.sm }}>
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
