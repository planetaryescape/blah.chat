import { View } from "react-native";
import Animated from "react-native-reanimated";
import { usePulse } from "@/lib/hooks/animated/usePulse";
import { palette, spacing } from "@/lib/theme/designSystem";

const DOT_SIZE = 6;
const DOT_GAP = 4;

function Dot({ delay }: { delay: number }) {
  const animatedStyle = usePulse({ min: 0.3, max: 1, duration: 400, delay });

  return (
    <Animated.View
      style={[
        {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: palette.roseQuartz,
          marginHorizontal: DOT_GAP / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function TypingIndicator() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.xs,
      }}
    >
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}
