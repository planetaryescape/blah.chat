import { memo, useEffect } from "react";
import { View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { palette } from "@/lib/theme/designSystem";

function StreamingCursorComponent() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[{ display: "flex", flexDirection: "row" }, animatedStyle]}
    >
      <View
        style={{
          width: 8,
          height: 16,
          backgroundColor: palette.roseQuartz,
          borderRadius: 2,
          marginLeft: 2,
        }}
      />
    </Reanimated.View>
  );
}

export const StreamingCursor = memo(StreamingCursorComponent);
