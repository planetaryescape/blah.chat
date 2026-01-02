import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { Pressable, StyleSheet, Text } from "react-native";
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
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.9 }]}
    >
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.96 : 1 }}
          transition={{ type: "spring", damping: 15 }}
          style={[
            styles.button,
            variant === "primary" && styles.primary,
            variant === "ghost" && styles.ghost,
            variant === "glass" && styles.glass,
            disabled && styles.disabled,
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
        </MotiView>
      )}
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
