import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/theme/colors";
import { radius } from "@/lib/theme/spacing";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  /** Enable shimmer effect (default: true) */
  shimmer?: boolean;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radius.md,
  style,
  shimmer = true,
}: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    // Base pulse animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      false,
    );

    // Shimmer animation - moves across
    if (shimmer) {
      shimmerTranslate.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        false,
      );
    }
  }, [opacity, shimmerTranslate, shimmer]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${shimmerTranslate.value * 200}%` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.muted,
          overflow: "hidden",
        },
        containerStyle,
        style,
      ]}
    >
      {shimmer && (
        <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              `${colors.border}40`,
              `${colors.border}60`,
              `${colors.border}40`,
              "transparent",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shimmerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "50%",
  },
  shimmerGradient: {
    flex: 1,
  },
});

// Convenience variants
export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
}: {
  lines?: number;
  lastLineWidth?: number | `${number}%`;
}) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={`skeleton-line-${i}`}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          height={14}
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </>
  );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}
