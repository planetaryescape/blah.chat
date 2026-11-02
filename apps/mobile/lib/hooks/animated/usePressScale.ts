import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// Restored from the existing compiler-safe mobile animation hook.
export function usePressScale({ pressedScale = 0.97 } = {}) {
  "use no memo";
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return {
    animatedStyle,
    onPressIn: () => {
      scale.value = withSpring(pressedScale, { damping: 15, stiffness: 400 });
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    },
  };
}
