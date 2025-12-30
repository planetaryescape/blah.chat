import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  SlideInUp,
} from "react-native-reanimated";

interface AnimatedListItemProps {
  /** Index in list for stagger delay */
  index?: number;
  /** Animation direction */
  direction?: "up" | "down" | "right";
  /** Base delay in ms (default: 50) */
  baseDelay?: number;
  /** Max index to apply stagger (default: 5) */
  maxStaggerIndex?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Optional style */
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable animated list item wrapper.
 * Applies staggered entrance animation based on index.
 *
 * Uses same pattern as MessageAnimation.tsx
 */
export function AnimatedListItem({
  children,
  index = 0,
  direction = "down",
  baseDelay = 50,
  maxStaggerIndex = 5,
  duration = 300,
  style,
}: PropsWithChildren<AnimatedListItemProps>) {
  // Stagger delay based on index, cap for performance
  const delay = Math.min(index, maxStaggerIndex) * baseDelay;

  const getEnteringAnimation = () => {
    switch (direction) {
      case "up":
        return SlideInUp.delay(delay).duration(duration).springify();
      case "right":
        return SlideInRight.delay(delay).duration(duration).springify();
      default:
        return SlideInDown.delay(delay).duration(duration).springify();
    }
  };

  return (
    <Animated.View
      style={style}
      entering={getEnteringAnimation()}
      exiting={FadeOut.duration(150)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Simple fade-in animation for content updates.
 */
export function FadeInView({
  children,
  duration = 200,
  style,
}: PropsWithChildren<{ duration?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <Animated.View style={style} entering={FadeIn.duration(duration)}>
      {children}
    </Animated.View>
  );
}
