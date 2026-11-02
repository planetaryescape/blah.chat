import { Modal, Pressable, Text, View } from "react-native";
import { palette, spacing, typography } from "@/lib/theme/designSystem";

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!pending) onCancel();
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: spacing.lg,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: palette.nebula,
            padding: spacing.lg,
            borderRadius: 16,
            gap: spacing.md,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
            }}
          >
            {title}
          </Text>
          <Text
            style={{ fontFamily: typography.body, color: palette.starlightDim }}
          >
            {description}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: spacing.lg,
            }}
          >
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={onCancel}
              style={{ padding: spacing.sm }}
            >
              <Text style={{ color: palette.starlight }}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={onConfirm}
              style={{ padding: spacing.sm }}
            >
              <Text style={{ color: palette.roseQuartz }}>
                {pending ? "Working…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
