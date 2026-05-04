import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type PressScaleOptions = {
  pressedScale?: number;
  pressInDamping?: number;
  pressInStiffness?: number;
  pressOutDamping?: number;
  pressOutStiffness?: number;
};

/**
 * Returns animated style + press handlers for a "press to shrink" UI feel.
 * Encapsulates the Reanimated `.value =` mutations the React Compiler can't
 * statically analyse.
 */
export function usePressScale(opts: PressScaleOptions = {}) {
  const {
    pressedScale = 0.97,
    pressInDamping = 15,
    pressInStiffness = 400,
    pressOutDamping = 12,
    pressOutStiffness = 300,
  } = opts;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(pressedScale, {
      damping: pressInDamping,
      stiffness: pressInStiffness,
    });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, {
      damping: pressOutDamping,
      stiffness: pressOutStiffness,
    });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
