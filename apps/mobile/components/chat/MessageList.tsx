import type { FlashListRef } from "@shopify/flash-list";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import type { Doc, Id } from "@/lib/convex";
import { palette, spacing } from "@/lib/theme/designSystem";
import { MessageBubble } from "./MessageBubble";

type Message = Doc<"messages">;

interface MessageListProps {
  messages: Message[];
  conversationId: Id<"conversations">;
  optimisticMessages?: Message[];
  focusMessageId?: Id<"messages"> | null;
  onMorePress?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onBranch?: (message: Message) => void;
}

function MessageListComponent({
  messages,
  conversationId,
  optimisticMessages = [],
  focusMessageId,
  onMorePress,
  onEdit,
  onRegenerate,
  onBranch,
}: MessageListProps) {
  const listRef = useRef<FlashListRef<Message> | null>(null);
  const prevLengthRef = useRef(0);
  const focusedMessageRef = useRef<string | null>(null);

  // Combine real messages with optimistic ones
  // Messages from Convex already sorted; optimistic always newer, append at end
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;
    return [...messages, ...optimisticMessages];
  }, [messages, optimisticMessages]);

  const focusIndex = useMemo(() => {
    if (!focusMessageId) return -1;
    const focusId = String(focusMessageId);
    return allMessages.findIndex((message) => String(message._id) === focusId);
  }, [allMessages, focusMessageId]);

  const focusMessage = useCallback(() => {
    if (!listRef.current || !focusMessageId || focusIndex < 0) return;
    if (focusedMessageRef.current === String(focusMessageId)) return;

    listRef.current.scrollToIndex({
      index: focusIndex,
      animated: true,
      viewPosition: 0.35,
    });
    focusedMessageRef.current = String(focusMessageId);
  }, [focusIndex, focusMessageId]);

  // Auto-scroll when new messages added (not on initial load)
  const handleContentSizeChange = useCallback(() => {
    const hasPendingFocus =
      !!focusMessageId &&
      focusIndex >= 0 &&
      focusedMessageRef.current !== String(focusMessageId);

    if (hasPendingFocus) {
      focusMessage();
      prevLengthRef.current = allMessages.length;
      return;
    }

    if (allMessages.length > prevLengthRef.current && listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
    prevLengthRef.current = allMessages.length;
  }, [allMessages.length, focusIndex, focusMessage, focusMessageId]);

  // Attempt focus scroll as soon as focus target is available
  useEffect(() => {
    const hasPendingFocus =
      !!focusMessageId &&
      focusIndex >= 0 &&
      focusedMessageRef.current !== String(focusMessageId);
    if (!hasPendingFocus) return;

    const timer = setTimeout(() => {
      focusMessage();
    }, 0);
    return () => clearTimeout(timer);
  }, [focusIndex, focusMessage, focusMessageId]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      return (
        <MessageBubble
          message={item}
          conversationId={conversationId}
          onMorePress={onMorePress}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          onBranch={onBranch}
        />
      );
    },
    [conversationId, onMorePress, onEdit, onRegenerate, onBranch],
  );

  const keyExtractor = useCallback((item: Message, index: number) => {
    return String(item._id ?? `${item.createdAt}-${item.role}-${index}`);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.void }}>
      <FlashList
        ref={listRef}
        data={allMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        drawDistance={250}
        getItemType={(item) => item.role}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: palette.void,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export const MessageList = memo(MessageListComponent);
