import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, ViewStyle, Platform } from "react-native";
import { palette, layout } from "@/lib/theme/designSystem";

interface GlassPaneProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?:
    | "dark"
    | "light"
    | "default"
    | "prominent"
    | "systemUltraThinMaterialDark";
  borderOpacity?: number;
}

export function GlassPane({
  children,
  style,
  intensity = 20,
  tint = "systemUltraThinMaterialDark",
  borderOpacity = 0.1,
}: GlassPaneProps) {
  // Android fallback for BlurView if needed (some older devices don't handle it well,
  // but we'll try to use it since it's standard now).
  // If platform is android, we might want to lower intensity or use a solid fallback color
  // if performance is an issue, but for now we stick to the plan.

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          `rgba(255, 255, 255, ${borderOpacity})`,
          `rgba(255, 255, 255, ${borderOpacity * 0.2})`,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "transparent",
    // ^ We use the gradient as a background for the border effect basically?
    // Actually standard generic border approach:
    borderRadius: "inherit" as any,
  },
});
