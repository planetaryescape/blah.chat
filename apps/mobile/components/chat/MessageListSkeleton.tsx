import { View } from "react-native";
import { ShimmerPlaceholder } from "@/components/ui/ShimmerPlaceholder";
import { layout, palette, spacing } from "@/lib/theme/designSystem";

const ASSISTANT_LINE_WIDTHS = ["82%", "68%", "44%"] as const;
const USER_LINE_WIDTHS = ["86%", "58%"] as const;

export function MessageListSkeleton() {
  return (
    <View
      style={{
        flex: 1,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
      }}
    >
      <AssistantBubble />
      <UserBubble />
      <AssistantBubble />
      <UserBubble />
    </View>
  );
}

function AssistantBubble() {
  return (
    <View
      style={{
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      {ASSISTANT_LINE_WIDTHS.map((width, index) => (
        <ShimmerPlaceholder
          key={`assistant-line-${width}`}
          width={width}
          height={14}
          borderRadius={layout.radius.sm}
          style={{
            marginBottom: index === ASSISTANT_LINE_WIDTHS.length - 1 ? 0 : 8,
          }}
        />
      ))}
    </View>
  );
}

function UserBubble() {
  return (
    <View
      style={{
        alignItems: "flex-end",
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          width: "60%",
          backgroundColor: palette.glassLow,
          borderRadius: layout.radius.lg,
          borderBottomRightRadius: layout.radius.xs,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        {USER_LINE_WIDTHS.map((width, index) => (
          <ShimmerPlaceholder
            key={`user-line-${width}`}
            width={width}
            height={12}
            borderRadius={layout.radius.sm}
            style={{
              marginBottom: index === USER_LINE_WIDTHS.length - 1 ? 0 : 8,
            }}
          />
        ))}
      </View>
    </View>
  );
}
