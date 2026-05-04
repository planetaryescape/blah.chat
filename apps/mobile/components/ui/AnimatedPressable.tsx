import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "@/lib/hooks/animated/usePressScale";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale factor when pressed (default: 0.97) */
  pressedScale?: number;
}

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const {
    animatedStyle,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  } = usePressScale({ pressedScale });

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        handlePressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        handlePressOut();
        onPressOut?.(event);
      }}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}
