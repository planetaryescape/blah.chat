import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

interface ShimmerLoaderProps {
  status: "pending" | "generating";
}

export function ShimmerLoader({ status }: ShimmerLoaderProps) {
  const opacity = useSharedValue(0.4);
  const dotScale = useSharedValue(1);

  useEffect(() => {
    // Pulsing opacity
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
      ),
      -1,
      false,
    );

    // Bouncing dots
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 }),
      ),
      -1,
      false,
    );
  }, [opacity, dotScale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.shimmerContainer, containerStyle]}>
        <View style={styles.dotsRow}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={100} />
          <AnimatedDot delay={200} />
        </View>
        <View style={styles.linesContainer}>
          <View style={[styles.line, styles.lineShort]} />
          <View style={[styles.line, styles.lineMedium]} />
          <View style={[styles.line, styles.lineLong]} />
        </View>
      </Animated.View>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
        false,
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [scale, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  shimmerContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  linesContainer: {
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
  },
  lineShort: {
    width: "40%",
  },
  lineMedium: {
    width: "70%",
  },
  lineLong: {
    width: "55%",
  },
});
