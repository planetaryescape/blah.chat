import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import {
  Copy,
  GitBranch,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  onCopy: (message: Message) => void;
  onEdit: (message: Message) => void;
  onRegenerate: (message: Message) => void;
  onBranch: (message: Message) => void;
  onDelete: (message: Message) => void;
}

interface ActionItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function ActionItem({ icon, label, onPress, isDestructive }: ActionItemProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        borderRadius: layout.radius.md,
        backgroundColor: palette.glassLow,
        marginBottom: spacing.xs,
      }}
    >
      <View style={{ marginRight: spacing.md }}>{icon}</View>
      <Text
        style={{
          fontFamily: typography.bodySemiBold,
          fontSize: 15,
          color: isDestructive ? palette.error : palette.starlight,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function MessageActionSheet({
  isOpen,
  onClose,
  message,
  onCopy,
  onEdit,
  onRegenerate,
  onBranch,
  onDelete,
}: MessageActionSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%"], []);

  const isUserMessage = message?.role === "user";
  const isAssistantMessage = message?.role === "assistant";

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  if (!isOpen || !message) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: palette.nebula,
        borderTopLeftRadius: layout.radius.xl,
        borderTopRightRadius: layout.radius.xl,
      }}
      handleIndicatorStyle={{
        backgroundColor: palette.starlightDim,
        width: 40,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.heading,
            fontSize: 20,
            color: palette.starlight,
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
          }}
        >
          Message Actions
        </Text>

        {/* Copy - available for all messages */}
        <ActionItem
          icon={<Copy size={20} color={palette.starlight} />}
          label="Copy"
          onPress={() => onCopy(message)}
        />

        {/* Edit - user messages only */}
        {isUserMessage && (
          <ActionItem
            icon={<Pencil size={20} color={palette.starlight} />}
            label="Edit"
            onPress={() => onEdit(message)}
          />
        )}

        {/* Regenerate - assistant messages only */}
        {isAssistantMessage && (
          <ActionItem
            icon={<RotateCcw size={20} color={palette.starlight} />}
            label="Regenerate"
            onPress={() => onRegenerate(message)}
          />
        )}

        {/* Branch - available for all messages */}
        <ActionItem
          icon={<GitBranch size={20} color={palette.starlight} />}
          label="Branch"
          onPress={() => onBranch(message)}
        />

        {/* Delete - available for all messages */}
        <ActionItem
          icon={<Trash2 size={20} color={palette.error} />}
          label="Delete"
          onPress={() => onDelete(message)}
          isDestructive
        />
      </View>
    </BottomSheet>
  );
}
