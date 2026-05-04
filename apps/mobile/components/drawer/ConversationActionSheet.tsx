import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  Archive,
  Check,
  Pencil,
  Pin,
  PinOff,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import type { Doc, Id } from "@/lib/convex";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

type Conversation = Doc<"conversations">;

type ConversationActionSheetProps = {
  isOpen: boolean;
  conversation: Conversation | null;
  onClose: () => void;
  onRename: (
    conversationId: Id<"conversations">,
    title: string,
  ) => Promise<void>;
  onTogglePin: (conversationId: Id<"conversations">) => Promise<void>;
  onToggleStar: (conversationId: Id<"conversations">) => Promise<void>;
  onArchive: (conversationId: Id<"conversations">) => Promise<void>;
  onDelete: (conversationId: Id<"conversations">) => Promise<void>;
};

type SheetMode = "menu" | "rename" | "confirm-delete";

function ActionRow({
  label,
  subtitle,
  destructive,
  icon,
  onPress,
}: {
  label: string;
  subtitle?: string;
  destructive?: boolean;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 48,
        borderRadius: layout.radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: palette.glassLow,
        borderWidth: 1,
        borderColor: destructive
          ? "rgba(239, 68, 68, 0.35)"
          : palette.glassBorder,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 14,
            color: destructive ? palette.error : palette.starlight,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              marginTop: 2,
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function ConversationActionSheet({
  isOpen,
  conversation,
  onClose,
  onRename,
  onTogglePin,
  onToggleStar,
  onArchive,
  onDelete,
}: ConversationActionSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [mode, setMode] = useState<SheetMode>("menu");
  const [title, setTitle] = useState("");

  const snapPoints = useMemo(() => {
    if (mode === "rename") return ["38%"];
    if (mode === "confirm-delete") return ["34%"];
    return ["52%"];
  }, [mode]);

  const {
    run: runActionInternal,
    isPending: isSubmitting,
    reset: resetSubmitting,
  } = useAsyncAction(async (action: () => Promise<void>) => {
    await action();
    bottomSheetRef.current?.close();
  });

  useEffect(() => {
    if (!isOpen || !conversation) return;
    setTitle(conversation.title || "New Chat");
    setMode("menu");
  }, [isOpen, conversation]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setMode("menu");
        resetSubmitting();
        onClose();
      }
    },
    [onClose, resetSubmitting],
  );

  const runAction = useCallback(
    (action: () => Promise<void>) => {
      if (!conversation || isSubmitting) return;
      void runActionInternal(action);
    },
    [conversation, isSubmitting, runActionInternal],
  );

  if (!isOpen || !conversation) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderStandardBackdrop}
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
      <BottomSheetView
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
            marginTop: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {conversation.title || "Conversation"}
        </Text>

        {mode === "menu" ? (
          <>
            <ActionRow
              label="Rename"
              subtitle="Edit title"
              onPress={() => setMode("rename")}
              icon={<Pencil size={18} color={palette.starlightDim} />}
            />
            <ActionRow
              label={conversation.pinned ? "Unpin" : "Pin"}
              subtitle="Keep this conversation easy to find"
              onPress={() =>
                runAction(() =>
                  onTogglePin(conversation._id as Id<"conversations">),
                )
              }
              icon={
                conversation.pinned ? (
                  <PinOff size={18} color={palette.starlightDim} />
                ) : (
                  <Pin size={18} color={palette.starlightDim} />
                )
              }
            />
            <ActionRow
              label={conversation.starred ? "Unstar" : "Star"}
              subtitle="Mark as important"
              onPress={() =>
                runAction(() =>
                  onToggleStar(conversation._id as Id<"conversations">),
                )
              }
              icon={
                conversation.starred ? (
                  <StarOff size={18} color={palette.starlightDim} />
                ) : (
                  <Star size={18} color={palette.starlightDim} />
                )
              }
            />
            <ActionRow
              label="Archive"
              subtitle="Hide from active conversations"
              onPress={() =>
                runAction(() =>
                  onArchive(conversation._id as Id<"conversations">),
                )
              }
              icon={<Archive size={18} color={palette.starlightDim} />}
            />
            <ActionRow
              label="Delete"
              subtitle="This cannot be undone"
              destructive
              onPress={() => setMode("confirm-delete")}
              icon={<Trash2 size={18} color={palette.error} />}
            />
          </>
        ) : null}

        {mode === "rename" ? (
          <>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
                marginBottom: spacing.sm,
              }}
            >
              Rename conversation
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={120}
              placeholder="Conversation title"
              placeholderTextColor={palette.starlightDim}
              style={{
                minHeight: 48,
                borderRadius: layout.radius.md,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                backgroundColor: palette.glassLow,
                color: palette.starlight,
                paddingHorizontal: spacing.md,
                fontFamily: typography.body,
                fontSize: 15,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              <AnimatedPressable
                onPress={() => setMode("menu")}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: palette.glassBorder,
                  backgroundColor: palette.glassLow,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <X size={16} color={palette.starlightDim} />
                  <Text
                    style={{
                      fontFamily: typography.bodySemiBold,
                      fontSize: 14,
                      color: palette.starlightDim,
                    }}
                  >
                    Cancel
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  const trimmed = title.trim();
                  if (
                    !trimmed ||
                    trimmed === (conversation.title || "").trim()
                  ) {
                    setMode("menu");
                    return;
                  }

                  void runAction(() =>
                    onRename(conversation._id as Id<"conversations">, trimmed),
                  );
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: palette.roseQuartz,
                  backgroundColor: palette.roseQuartz,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <Check size={16} color={palette.void} />
                  <Text
                    style={{
                      fontFamily: typography.bodySemiBold,
                      fontSize: 14,
                      color: palette.void,
                    }}
                  >
                    Save
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          </>
        ) : null}

        {mode === "confirm-delete" ? (
          <>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlightDim,
                marginBottom: spacing.md,
              }}
            >
              Delete this conversation permanently?
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <AnimatedPressable
                onPress={() => setMode("menu")}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: palette.glassBorder,
                  backgroundColor: palette.glassLow,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 14,
                    color: palette.starlightDim,
                  }}
                >
                  Cancel
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() =>
                  runAction(() =>
                    onDelete(conversation._id as Id<"conversations">),
                  )
                }
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.5)",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 14,
                    color: palette.error,
                  }}
                >
                  Delete
                </Text>
              </AnimatedPressable>
            </View>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
