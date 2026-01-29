import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { useSiblings, useSwitchBranch } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

interface SiblingNavigatorProps {
  message: Message;
  conversationId: Id<"conversations">;
}

function SiblingNavigatorComponent({
  message,
  conversationId,
}: SiblingNavigatorProps) {
  // Skip query for optimistic messages (IDs starting with "optimistic-")
  // Convex IDs are objects, optimistic IDs are strings
  const isOptimistic =
    typeof message._id === "string" && message._id.startsWith("optimistic-");
  const messageId = isOptimistic ? undefined : (message._id as Id<"messages">);

  const siblings = useSiblings(messageId);
  const switchBranch = useSwitchBranch();

  // Don't render for optimistic messages or if no siblings data or only one sibling
  if (isOptimistic || !siblings || siblings.length <= 1) return null;

  const currentIndex = siblings.findIndex(
    (s: Doc<"messages">) => s._id === message._id,
  );
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < siblings.length - 1;

  const handleSwitch = async (direction: "left" | "right") => {
    const targetIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;
    const targetSibling = siblings[targetIndex];
    if (targetSibling) {
      haptic.selection();
      await switchBranch({
        conversationId,
        targetMessageId: targetSibling._id,
      });
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
      }}
    >
      <Pressable
        onPress={() => handleSwitch("left")}
        disabled={!canGoLeft}
        hitSlop={8}
        style={({ pressed }) => ({
          padding: spacing.xs,
          borderRadius: layout.radius.sm,
          opacity: pressed && canGoLeft ? 0.5 : 1,
        })}
      >
        <ChevronLeft
          size={16}
          color={canGoLeft ? palette.starlight : palette.starlightDim}
        />
      </Pressable>

      <Text
        style={{
          fontFamily: typography.body,
          fontSize: 12,
          color: palette.starlightDim,
          minWidth: 32,
          textAlign: "center",
        }}
      >
        {currentIndex + 1}/{siblings.length}
      </Text>

      <Pressable
        onPress={() => handleSwitch("right")}
        disabled={!canGoRight}
        hitSlop={8}
        style={({ pressed }) => ({
          padding: spacing.xs,
          borderRadius: layout.radius.sm,
          opacity: pressed && canGoRight ? 0.5 : 1,
        })}
      >
        <ChevronRight
          size={16}
          color={canGoRight ? palette.starlight : palette.starlightDim}
        />
      </Pressable>
    </View>
  );
}

export const SiblingNavigator = memo(SiblingNavigatorComponent);
