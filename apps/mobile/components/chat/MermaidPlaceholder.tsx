import { GitBranch, Maximize2 } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { MermaidModal } from "./MermaidModal";

interface MermaidPlaceholderProps {
  code: string;
}

function MermaidPlaceholderComponent({ code }: MermaidPlaceholderProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? palette.glassHigh : palette.glassMedium,
          borderRadius: layout.radius.sm,
          padding: spacing.md,
          marginVertical: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: palette.glassBorder,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <GitBranch size={20} color={palette.roseQuartz} />
          <View>
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 14,
                color: palette.starlight,
              }}
            >
              Mermaid Diagram
            </Text>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 12,
                color: palette.starlightDim,
              }}
            >
              Tap to view
            </Text>
          </View>
        </View>
        <Maximize2 size={18} color={palette.starlightDim} />
      </Pressable>

      <MermaidModal
        visible={modalVisible}
        code={code}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

export const MermaidPlaceholder = memo(MermaidPlaceholderComponent);
