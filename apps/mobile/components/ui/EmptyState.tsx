import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing } from "@/lib/theme/spacing";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
    textAlign: "center",
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
