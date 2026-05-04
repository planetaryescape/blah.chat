import { useEffect } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type PulseOptions = {
  min?: number;
  max?: number;
  duration?: number;
  delay?: number;
};

/**
 * Animates `opacity` between `min` and `max` on a repeating cycle. Encapsulates
 * the Reanimated shared-value mutation pattern so callers don't trip the
 * React Compiler.
 */
export function usePulse(opts: PulseOptions = {}) {
  const { min = 0.3, max = 1, duration = 400, delay = 0 } = opts;

  const opacity = useSharedValue(min);

  useEffect(() => {
    const sequence = withSequence(
      withTiming(max, { duration }),
      withTiming(min, { duration }),
    );
    opacity.value = delay
      ? withDelay(delay, withRepeat(sequence, -1, false))
      : withRepeat(sequence, -1, false);
  }, [min, max, duration, delay, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
