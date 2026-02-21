import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { ArrowLeft, Menu } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type ScreenHeaderProps = {
  title: string;
  leftAction: "menu" | "back";
  rightAction?: ReactNode;
  subtitle?: ReactNode;
  onLeftPress?: () => void;
};

export function ScreenHeader({
  title,
  leftAction,
  rightAction,
  subtitle,
  onLeftPress,
}: ScreenHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const LeftIcon = leftAction === "menu" ? Menu : ArrowLeft;

  const handleLeftPress = () => {
    haptic.light();
    if (onLeftPress) {
      onLeftPress();
      return;
    }
    if (leftAction === "menu") {
      navigation.dispatch(DrawerActions.openDrawer());
      return;
    }
    router.back();
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: palette.glassBorder,
        height: layout.headerHeight,
        gap: spacing.sm,
      }}
    >
      <TouchableOpacity
        onPress={handleLeftPress}
        style={{ padding: spacing.xs }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <LeftIcon size={24} color={palette.starlight} />
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
          }}
        >
          {title}
        </Text>
        {subtitle ? <View style={{ marginTop: 2 }}>{subtitle}</View> : null}
      </View>

      {rightAction ? <View>{rightAction}</View> : null}
    </View>
  );
}
