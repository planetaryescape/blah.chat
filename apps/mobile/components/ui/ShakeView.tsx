import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";

interface ShakeViewProps {
  /** When true, triggers shake animation */
  trigger: boolean;
  /** Shake intensity in pixels (default: 8) */
  intensity?: number;
  /** Whether to trigger haptic feedback (default: true) */
  hapticFeedback?: boolean;
  /** Optional callback when shake completes */
  onShakeComplete?: () => void;
  /** Optional style */
  style?: StyleProp<ViewStyle>;
}

/**
 * View that shakes horizontally when triggered.
 * Useful for error states and validation feedback.
 */
export function ShakeView({
  children,
  trigger,
  intensity = 8,
  hapticFeedback = true,
  onShakeComplete,
  style,
}: PropsWithChildren<ShakeViewProps>) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      if (hapticFeedback) {
        haptics.error();
      }

      translateX.value = withSequence(
        withTiming(-intensity, { duration: 50 }),
        withTiming(intensity, { duration: 50 }),
        withTiming(-intensity, { duration: 50 }),
        withTiming(intensity, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );

      // Call completion callback after animation
      if (onShakeComplete) {
        setTimeout(onShakeComplete, 250);
      }
    }
  }, [trigger, intensity, hapticFeedback, onShakeComplete, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

/**
 * Hook for imperative shake control
 */
export function useShake(intensity = 8) {
  const translateX = useSharedValue(0);

  const shake = (withHaptic = true) => {
    if (withHaptic) {
      haptics.error();
    }

    translateX.value = withSequence(
      withTiming(-intensity, { duration: 50 }),
      withTiming(intensity, { duration: 50 }),
      withTiming(-intensity, { duration: 50 }),
      withTiming(intensity, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { shake, animatedStyle };
}
