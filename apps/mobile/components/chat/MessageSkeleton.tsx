import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { layout, palette, spacing } from "@/lib/theme/designSystem";

/**
 * Shimmer skeleton for pending assistant messages.
 * Shows immediately after user sends to indicate AI is processing.
 */
export function MessageSkeleton() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

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
