import { Plus } from "lucide-react-native";
import type { ComponentType } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

interface FABProps {
  onPress: () => void;
  icon?: ComponentType<{ size: number; color: string }>;
}

export function FAB({ onPress, icon: Icon = Plus }: FABProps) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={24} color={colors.primaryForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
