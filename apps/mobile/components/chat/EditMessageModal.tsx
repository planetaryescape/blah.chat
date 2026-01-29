import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface EditMessageModalProps {
  visible: boolean;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function EditMessageModal({
  visible,
  initialContent,
  onSave,
  onCancel,
}: EditMessageModalProps) {
  const [content, setContent] = useState(initialContent);

  // Sync content when initialContent changes (different message being edited)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: palette.nebula,
              borderRadius: layout.radius.lg,
              padding: spacing.lg,
            }}
          >
            <Text
              style={{
                fontFamily: typography.heading,
                fontSize: 18,
                color: palette.starlight,
                marginBottom: spacing.md,
              }}
            >
              Edit Message
            </Text>

            <TextInput
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              style={{
                fontFamily: typography.body,
                fontSize: 15,
                color: palette.starlight,
                backgroundColor: palette.glassLow,
                borderRadius: layout.radius.md,
                padding: spacing.md,
                minHeight: 120,
                maxHeight: 300,
                textAlignVertical: "top",
              }}
              placeholderTextColor={palette.starlightDim}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: spacing.sm,
                marginTop: spacing.lg,
              }}
            >
              <AnimatedPressable
                onPress={onCancel}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: layout.radius.md,
                  backgroundColor: palette.glassLow,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlightDim,
                  }}
                >
                  Cancel
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleSave}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: layout.radius.md,
                  backgroundColor: palette.roseQuartz,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.void,
                  }}
                >
                  Save
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
