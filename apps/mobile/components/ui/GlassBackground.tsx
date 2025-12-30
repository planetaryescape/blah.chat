import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import { colors } from "@/lib/theme/colors";

interface GlassBackgroundProps {
  /** Blur intensity (default: 60) */
  intensity?: number;
  /** Blur tint (default: dark) */
  tint?: "light" | "dark" | "default";
  /** Additional background color overlay opacity (default: 0.85) */
  overlayOpacity?: number;
}

/**
 * Glassmorphism background for bottom sheets and modals.
 * Use as backgroundComponent prop in BottomSheetModal.
 */
export function GlassBackground({
  intensity = 60,
  tint = "dark",
  overlayOpacity = 0.85,
}: GlassBackgroundProps) {
  return (
    <View style={styles.container}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.overlay,
          { backgroundColor: colors.background, opacity: overlayOpacity },
        ]}
      />
    </View>
  );
}

/**
 * Factory function for BottomSheet backgroundComponent prop
 */
export function createGlassBackground(props?: GlassBackgroundProps) {
  return function GlassBackgroundComponent() {
    return <GlassBackground {...props} />;
  };
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
