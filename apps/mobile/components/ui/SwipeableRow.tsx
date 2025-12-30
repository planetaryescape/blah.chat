import { Trash2 } from "lucide-react-native";
import type { ReactNode } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DELETE_THRESHOLD = -80;
const SNAP_THRESHOLD = -40;

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

export function SwipeableRow({
  children,
  onDelete,
  enabled = true,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const triggerDelete = () => {
    haptics.heavy();
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative values), clamp to max
      translateX.value = Math.max(
        Math.min(event.translationX, 0),
        DELETE_THRESHOLD - 20,
      );

      // Trigger haptic when crossing threshold
      if (translateX.value <= DELETE_THRESHOLD && !isDeleting.value) {
        isDeleting.value = true;
        runOnJS(haptics.medium)();
      } else if (translateX.value > DELETE_THRESHOLD && isDeleting.value) {
        isDeleting.value = false;
      }
    })
    .onEnd(() => {
      if (translateX.value <= DELETE_THRESHOLD) {
        // Swipe to delete
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(triggerDelete)();
        });
      } else if (translateX.value < SNAP_THRESHOLD) {
        // Snap to show delete button
        translateX.value = withSpring(DELETE_THRESHOLD, {
          damping: 20,
          stiffness: 300,
        });
      } else {
        // Reset
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.abs(translateX.value) / Math.abs(DELETE_THRESHOLD),
      1,
    );
    return {
      opacity: progress,
      transform: [{ scale: 0.8 + progress * 0.2 }],
    };
  });

  const deleteBackgroundStyle = useAnimatedStyle(() => ({
    width: Math.abs(translateX.value),
  }));

  return (
    <View style={styles.container}>
      {/* Delete action behind */}
      <Animated.View style={[styles.deleteBackground, deleteBackgroundStyle]}>
        <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
          <Trash2 size={20} color={colors.primaryForeground} />
        </Animated.View>
      </Animated.View>

      {/* Swipeable content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  content: {
    backgroundColor: colors.background,
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: `${colors.error}80`,
    alignItems: "center",
    justifyContent: "center",
  },
});
