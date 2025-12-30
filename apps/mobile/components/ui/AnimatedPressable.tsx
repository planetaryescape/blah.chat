import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale factor when pressed (default: 0.97) */
  pressedScale?: number;
  /** Whether to trigger haptic feedback on press */
  hapticOnPress?: boolean;
  /** Type of haptic feedback */
  hapticType?: "light" | "medium" | "selection";
}

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.97,
  hapticOnPress = false,
  hapticType = "light",
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(pressedScale, { damping: 15, stiffness: 400 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    if (hapticOnPress) {
      haptics[hapticType]();
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}
