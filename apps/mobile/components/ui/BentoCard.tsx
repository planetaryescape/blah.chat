import { MotiView } from "moti";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
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

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 400, delay }}
      style={[styles.wrapper, style]}
    >
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
    </MotiView>
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
