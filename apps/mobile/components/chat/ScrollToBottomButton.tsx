import { useCallback } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { ChevronDown } from "lucide-react-native";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const THRESHOLD = 200;

interface ScrollToBottomButtonProps {
  showButton: SharedValue<number>;
  onPress: () => void;
}

export function ScrollToBottomButton({
  showButton,
  onPress,
}: ScrollToBottomButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: showButton.value,
    transform: [
      { scale: interpolate(showButton.value, [0, 1], [0.5, 1]) },
      { translateY: interpolate(showButton.value, [0, 1], [20, 0]) },
    ],
    pointerEvents: showButton.value > 0.5 ? "auto" : "none",
  }));

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <ChevronDown size={20} color={colors.foreground} />
    </AnimatedPressable>
  );
}

export function useScrollToBottom() {
  const showButton = useSharedValue(0);

  const onScroll = useCallback(
    (offsetY: number) => {
      // For inverted list, y=0 is bottom (latest messages)
      // Show button when scrolled up past threshold
      showButton.value = withTiming(offsetY > THRESHOLD ? 1 : 0, {
        duration: 200,
      });
    },
    [showButton],
  );

  return { showButton, onScroll };
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
