import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export default function IntegrationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
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
          onPress={() => {
            haptic.light();
            router.back();
          }}
          style={{ padding: spacing.xs }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={palette.starlight} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
          }}
        >
          Integrations
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 15,
            color: palette.starlightDim,
            textAlign: "center",
          }}
        >
          Integration management coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
