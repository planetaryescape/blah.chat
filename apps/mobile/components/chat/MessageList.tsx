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
  pinnedMessageId?: string;
  onMorePress?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onBranch?: (message: Message) => void;
}

function MessageListComponent({
  messages,
  conversationId,
  optimisticMessages = [],
  pinnedMessageId,
  onMorePress,
  onEdit,
  onRegenerate,
  onBranch,
}: MessageListProps) {
  const listRef = useRef<any>(null);
  const didInitialScrollRef = useRef(false);
  const lastPinnedAppliedRef = useRef<string | null>(null);

  // Combine real messages with optimistic ones
  // Messages from Convex already sorted; optimistic always newer, append at end
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;
    return [...messages, ...optimisticMessages];
  }, [messages, optimisticMessages]);

  // Initial open: scroll to bottom once (but never during streaming).
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (!listRef.current) return;
    if (allMessages.length === 0) return;
    if (pinnedMessageId) return;

    didInitialScrollRef.current = true;
    listRef.current.scrollToEnd({ animated: false });
  }, [allMessages.length, pinnedMessageId]);

  // On send: pin the just-sent user message to top.
  useEffect(() => {
    if (!pinnedMessageId) return;
    if (!listRef.current) return;
    if (lastPinnedAppliedRef.current === pinnedMessageId) return;

    const index = allMessages.findIndex((m) => m._id === pinnedMessageId);
    if (index === -1) return;

    didInitialScrollRef.current = true;
    lastPinnedAppliedRef.current = pinnedMessageId;

    const scrollToPinned = () => {
      try {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0,
        });
      } catch {
        // Ignore transient measurement issues; next render will retry.
      }
    };

    scrollToPinned();
    setTimeout(scrollToPinned, 50);
    setTimeout(scrollToPinned, 150);
  }, [pinnedMessageId, allMessages]);

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

  const keyExtractor = useCallback((item: Message) => item._id, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.void }}>
      <FlashList
        ref={listRef}
        data={allMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        drawDistance={250}
        getItemType={(item) => item.role}
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
