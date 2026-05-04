import { View } from "react-native";
import Animated from "react-native-reanimated";
import { usePulse } from "@/lib/hooks/animated/usePulse";
import { layout, palette, spacing } from "@/lib/theme/designSystem";

/**
 * Shimmer skeleton for pending assistant messages.
 * Shows immediately after user sends to indicate AI is processing.
 */
export function MessageSkeleton() {
  const shimmerStyle = usePulse({ min: 0.3, max: 0.7, duration: 800 });

  return (
    <View
      style={{
        alignItems: "flex-start",
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          maxWidth: "85%",
          backgroundColor: palette.glassLow,
          borderRadius: layout.radius.lg,
          borderBottomLeftRadius: layout.radius.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          minWidth: 120,
        }}
      >
        {/* Shimmer lines */}
        <Animated.View
          style={[
            {
              height: 12,
              backgroundColor: palette.glassMedium,
              borderRadius: 6,
              marginBottom: spacing.sm,
              width: "90%",
            },
            shimmerStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              height: 12,
              backgroundColor: palette.glassMedium,
              borderRadius: 6,
              marginBottom: spacing.sm,
              width: "70%",
            },
            shimmerStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              height: 12,
              backgroundColor: palette.glassMedium,
              borderRadius: 6,
              width: "50%",
            },
            shimmerStyle,
          ]}
        />
      </View>
    </View>
  );
}
