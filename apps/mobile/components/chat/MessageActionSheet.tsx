import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  FileText,
  GitBranch,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import {
  useBookmarkByMessage,
  useRemoveBookmark,
} from "@/lib/hooks/useBookmarks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { BookmarkSheet } from "./BookmarkSheet";
import { SaveAsNoteSheet } from "./SaveAsNoteSheet";

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
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [showSaveAsNote, setShowSaveAsNote] = useState(false);

  // @ts-ignore - Type depth issues with Convex types (85+ modules)
  const bookmark = useBookmarkByMessage(message?._id ?? null);
  const removeBookmark = useRemoveBookmark();

  const isUserMessage = message?.role === "user";
  const isAssistantMessage = message?.role === "assistant";
  const isBookmarked = !!bookmark;

  // Control modal via ref
  useEffect(() => {
    if (isOpen && message) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen, message]);

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
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleBookmarkToggle = useCallback(async () => {
    if (!message) return;

    if (bookmark) {
      haptic.light();
      await removeBookmark({ bookmarkId: bookmark._id });
      onClose();
    } else {
      onClose();
      setShowBookmarkSheet(true);
    }
  }, [bookmark, message, removeBookmark, onClose]);

  const handleSaveAsNote = useCallback(() => {
    onClose();
    setShowSaveAsNote(true);
  }, [onClose]);

  if (!message) return null;

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        onChange={handleSheetChange}
        enablePanDownToClose
        enableDynamicSizing
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
        <BottomSheetView
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

          {/* Bookmark - available for all messages */}
          <ActionItem
            icon={
              isBookmarked ? (
                <BookmarkCheck size={20} color={palette.roseQuartz} />
              ) : (
                <Bookmark size={20} color={palette.starlight} />
              )
            }
            label={isBookmarked ? "Remove Bookmark" : "Bookmark"}
            onPress={handleBookmarkToggle}
          />

          {/* Save as Note - available for all messages */}
          <ActionItem
            icon={<FileText size={20} color={palette.indigo} />}
            label="Save as Note"
            onPress={handleSaveAsNote}
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
        </BottomSheetView>
      </BottomSheetModal>

      {showBookmarkSheet && (
        <BookmarkSheet
          isOpen={showBookmarkSheet}
          onClose={() => setShowBookmarkSheet(false)}
          // @ts-expect-error - Type depth issues with Convex types (85+ modules)
          messageId={message._id}
        />
      )}

      {showSaveAsNote && (
        <SaveAsNoteSheet
          isOpen={showSaveAsNote}
          onClose={() => setShowSaveAsNote(false)}
          message={message}
        />
      )}
    </>
  );
}
