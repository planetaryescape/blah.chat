import { Text, View } from "react-native";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          fontFamily: typography.bodySemiBold,
          fontSize: 12,
          color: palette.starlightDim,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          marginHorizontal: spacing.md,
          backgroundColor: palette.glassLow,
          borderRadius: layout.radius.md,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}
