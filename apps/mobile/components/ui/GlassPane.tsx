import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

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
  // Android: reduce blur intensity since some devices render strong blur poorly
  const effectiveIntensity =
    Platform.OS === "android" ? Math.min(intensity, 15) : intensity;

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={effectiveIntensity}
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
  },
});
