import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

interface VoiceWaveformProps {
  isRecording: boolean;
  metering?: number; // dB value from expo-av, typically -160 to 0
  barCount?: number;
}

const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 32;

export function VoiceWaveform({
  isRecording,
  metering = -160,
  barCount = 24,
}: VoiceWaveformProps) {
  // Normalize metering from dB (-160 to 0) to 0-1 range
  const normalizedLevel = useMemo(() => {
    const clamped = Math.max(-60, Math.min(0, metering));
    return (clamped + 60) / 60; // 0 to 1
  }, [metering]);

  return (
    <View style={styles.container}>
      {Array.from({ length: barCount }).map((_, i) => (
        <WaveformBar
          key={`bar-${i}`}
          index={i}
          totalBars={barCount}
          level={normalizedLevel}
          isRecording={isRecording}
        />
      ))}
    </View>
  );
}

interface WaveformBarProps {
  index: number;
  totalBars: number;
  level: number;
  isRecording: boolean;
}

function WaveformBar({
  index,
  totalBars,
  level,
  isRecording,
}: WaveformBarProps) {
  const height = useSharedValue(MIN_BAR_HEIGHT);

  useEffect(() => {
    if (!isRecording) {
      height.value = withTiming(MIN_BAR_HEIGHT, { duration: 200 });
      return;
    }

    // Create wave effect - bars near center are taller
    const centerDistance = Math.abs(index - totalBars / 2) / (totalBars / 2);
    const waveMultiplier = 1 - centerDistance * 0.5;

    // Add randomness for organic feel
    const randomFactor = 0.7 + Math.random() * 0.6;

    const targetHeight =
      MIN_BAR_HEIGHT +
      (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * level * waveMultiplier * randomFactor;

    height.value = withSpring(targetHeight, {
      damping: 10,
      stiffness: 150,
    });
  }, [height, index, totalBars, level, isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

// Static waveform for playback visualization
export function StaticWaveform({
  amplitudes,
  progress = 0,
  barCount = 40,
}: {
  amplitudes?: number[];
  progress?: number; // 0 to 1
  barCount?: number;
}) {
  const bars = useMemo(() => {
    if (amplitudes && amplitudes.length > 0) {
      // Downsample amplitudes to barCount
      const step = amplitudes.length / barCount;
      return Array.from({ length: barCount }).map((_, i) => {
        const idx = Math.floor(i * step);
        return amplitudes[idx] || 0;
      });
    }
    // Generate random static pattern
    return Array.from({ length: barCount }).map(
      () => 0.3 + Math.random() * 0.7,
    );
  }, [amplitudes, barCount]);

  const playedBars = Math.floor(progress * barCount);

  return (
    <View style={styles.container}>
      {bars.map((amplitude, i) => (
        <View
          key={`static-bar-${i}`}
          style={[
            styles.bar,
            {
              height:
                MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * amplitude,
              backgroundColor: i < playedBars ? colors.primary : colors.muted,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: MAX_BAR_HEIGHT + spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bar: {
    width: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
});
