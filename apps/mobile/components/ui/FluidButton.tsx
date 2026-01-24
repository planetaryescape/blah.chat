import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { layout, palette, typography } from "@/lib/theme/designSystem";

interface FluidButtonProps {
  onPress?: () => void;
  title: string;
  icon?: React.ReactNode;
  variant?: "primary" | "ghost" | "glass";
  disabled?: boolean;
}

export function FluidButton({
  onPress,
  title,
  icon,
  variant = "primary",
  disabled,
}: FluidButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.button,
          variant === "primary" && styles.primary,
          variant === "ghost" && styles.ghost,
          variant === "glass" && styles.glass,
          disabled && styles.disabled,
          animatedStyle,
        ]}
      >
        {icon}
        <Text
          style={[
            styles.text,
            variant === "primary" ? styles.textPrimary : styles.textGhost,
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: layout.radius.full,
    gap: 8,
  },
  primary: {
    backgroundColor: palette.roseQuartz,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  glass: {
    backgroundColor: palette.glassMedium,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },
  textPrimary: {
    color: palette.void,
  },
  textGhost: {
    color: palette.starlight,
  },
});
