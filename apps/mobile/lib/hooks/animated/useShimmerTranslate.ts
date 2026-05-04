import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type ShimmerOptions = {
  duration?: number;
};

/**
 * Animates `translateX` from `-bandWidth` to `containerWidth + bandWidth` so
 * a shimmer band sweeps across the parent. Pure wrapper around
 * useSharedValue/withRepeat to keep the mutation off the call site.
 */
export function useShimmerTranslate(
  containerWidth: number,
  bandWidth: number,
  opts: ShimmerOptions = {},
) {
  const { duration = 1200 } = opts;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration, progress]);

  return useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          -bandWidth + progress.value * (containerWidth + bandWidth * 2),
      },
    ],
  }));
}
