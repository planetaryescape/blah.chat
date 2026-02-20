import { useEffect, useRef, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import type { Doc } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useBookmarkByMessage,
  useRemoveBookmark,
} from "@/lib/hooks/useBookmarks";
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

type ActionKey =
  | "copy"
  | "bookmark"
  | "saveAsNote"
  | "edit"
  | "regenerate"
  | "branch"
  | "delete";

type MenuAction = {
  key: ActionKey;
  label: string;
  destructive?: boolean;
};

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
  const messageRef = useRef<Message | null>(null);
  const presentingRef = useRef(false);
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [showSaveAsNote, setShowSaveAsNote] = useState(false);

  // Keep ref in sync with prop - preserves message when parent nulls it
  useEffect(() => {
    if (message) {
      messageRef.current = message;
    }
  }, [message]);

  // @ts-ignore - Type depth issues with Convex types (85+ modules)
  const bookmark = useBookmarkByMessage(message?._id ?? null);
  const removeBookmark = useRemoveBookmark();

  const currentMessage = message ?? messageRef.current;
  const isUserMessage = currentMessage?.role === "user";
  const isAssistantMessage = currentMessage?.role === "assistant";
  const isBookmarked = !!bookmark;

  useEffect(() => {
    if (!isOpen || !currentMessage || presentingRef.current) return;
    presentingRef.current = true;

    const actions: MenuAction[] = [
      { key: "copy", label: "Copy" },
      {
        key: "bookmark",
        label: isBookmarked ? "Remove Bookmark" : "Bookmark",
      },
      { key: "saveAsNote", label: "Save as Note" },
      ...(isUserMessage ? [{ key: "edit", label: "Edit" } as const] : []),
      ...(isAssistantMessage
        ? [{ key: "regenerate", label: "Regenerate" } as const]
        : []),
      { key: "branch", label: "Branch" },
      { key: "delete", label: "Delete", destructive: true },
    ];

    const runAction = async (action: MenuAction) => {
      const msg = messageRef.current;
      if (!msg) return;

      switch (action.key) {
        case "copy":
          onCopy(msg);
          break;
        case "bookmark":
          if (bookmark) {
            haptic.light();
            await removeBookmark({ bookmarkId: bookmark._id });
          } else {
            setShowBookmarkSheet(true);
          }
          break;
        case "saveAsNote":
          setShowSaveAsNote(true);
          break;
        case "edit":
          onEdit(msg);
          break;
        case "regenerate":
          onRegenerate(msg);
          break;
        case "branch":
          onBranch(msg);
          break;
        case "delete":
          onDelete(msg);
          break;
      }
    };

    if (Platform.OS === "ios") {
      const options = [...actions.map((action) => action.label), "Cancel"];
      const cancelButtonIndex = options.length - 1;
      const destructiveButtonIndex = actions.findIndex(
        (action) => action.destructive,
      );

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex:
            destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          userInterfaceStyle: "dark",
        },
        async (selectedIndex) => {
          presentingRef.current = false;
          onClose();

          if (selectedIndex < 0 || selectedIndex >= actions.length) return;
          await runAction(actions[selectedIndex]);
        },
      );
      return;
    }

    const buttons = [
      ...actions.map((action) => ({
        text: action.label,
        style: action.destructive
          ? ("destructive" as const)
          : ("default" as const),
        onPress: () => {
          presentingRef.current = false;
          onClose();
          void runAction(action);
        },
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Message Actions", undefined, buttons, {
      cancelable: true,
      onDismiss: () => {
        presentingRef.current = false;
        onClose();
      },
    });
  }, [
    bookmark,
    currentMessage,
    isAssistantMessage,
    isBookmarked,
    isOpen,
    isUserMessage,
    onBranch,
    onClose,
    onCopy,
    onDelete,
    onEdit,
    onRegenerate,
    removeBookmark,
  ]);

  if (!currentMessage) return null;

  return (
    <>
      {showBookmarkSheet && (
        <BookmarkSheet
          isOpen={showBookmarkSheet}
          onClose={() => setShowBookmarkSheet(false)}
          messageId={currentMessage._id}
          conversationId={currentMessage.conversationId}
        />
      )}

      {showSaveAsNote && (
        <SaveAsNoteSheet
          isOpen={showSaveAsNote}
          onClose={() => {
            setShowSaveAsNote(false);
          }}
          message={messageRef.current}
        />
      )}
    </>
  );
}
