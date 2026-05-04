import { memo } from "react";
import { View } from "react-native";
import Reanimated from "react-native-reanimated";
import { usePulse } from "@/lib/hooks/animated/usePulse";
import { palette } from "@/lib/theme/designSystem";

function StreamingCursorComponent() {
  const animatedStyle = usePulse({ min: 0.3, max: 1, duration: 400 });

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
