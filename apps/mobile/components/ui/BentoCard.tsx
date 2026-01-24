import { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { GlassPane } from "./GlassPane";

interface BentoCardProps {
  title?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "featured";
  delay?: number;
}

export function BentoCard({
  title,
  icon,
  children,
  style,
  onPress,
  variant = "default",
  delay = 0,
}: BentoCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withTiming(1, { duration: 400 });
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, style, animatedStyle]}>
      <Container activeOpacity={0.8} style={styles.touchable}>
        <GlassPane
          style={
            [
              styles.card,
              variant === "featured" ? styles.featuredCard : undefined,
            ] as any
          }
          intensity={variant === "featured" ? 40 : 20}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </GlassPane>
      </Container>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderRadius: layout.radius.xl,
  },
  touchable: {
    flex: 1,
  },
  card: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: palette.glassLow,
  },
  featuredCard: {
    backgroundColor: "rgba(99, 102, 241, 0.15)", // faint indigo tint
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.heading,
    color: palette.starlight,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
});
