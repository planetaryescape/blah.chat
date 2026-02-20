import { Children } from "react";
import { Text, View } from "react-native";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const childItems = Children.toArray(children);
  const childrenWithDividers = childItems.flatMap((child, index) => {
    if (index === childItems.length - 1) {
      return [child];
    }

    return [
      child,
      <View
        key={`settings-divider-${index}`}
        style={{
          height: 1,
          backgroundColor: palette.glassBorder,
          marginHorizontal: spacing.md,
        }}
      />,
    ];
  });

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
        {childrenWithDividers}
      </View>
    </View>
  );
}
