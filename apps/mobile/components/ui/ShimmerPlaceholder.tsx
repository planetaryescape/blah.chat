import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import type {
  DimensionValue,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useShimmerTranslate } from "@/lib/hooks/animated/useShimmerTranslate";
import { layout, palette } from "@/lib/theme/designSystem";

type ShimmerPlaceholderProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function ShimmerPlaceholder({
  width,
  height,
  borderRadius = layout.radius.sm,
  style,
}: ShimmerPlaceholderProps) {
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const fallbackWidth = typeof width === "number" ? width : 120;
  const containerWidth = measuredWidth || fallbackWidth;
  const shimmerBandWidth = useMemo(
    () => Math.max(44, containerWidth * 0.45),
    [containerWidth],
  );

  const animatedStyle = useShimmerTranslate(containerWidth, shimmerBandWidth);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && nextWidth !== measuredWidth) {
      setMeasuredWidth(nextWidth);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: palette.glassLow,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerBand,
          {
            width: shimmerBandWidth,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[palette.glassLow, palette.glassMedium, palette.glassLow]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerBand: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: undefined,
  },
});
