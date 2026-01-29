import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import { palette, spacing } from "@/lib/theme/designSystem";
import { MessageBubble } from "./MessageBubble";

type Message = Doc<"messages">;

interface MessageListProps {
  messages: Message[];
  conversationId: Id<"conversations">;
  optimisticMessages?: Message[];
  onMorePress?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onBranch?: (message: Message) => void;
}

function MessageListComponent({
  messages,
  conversationId,
  optimisticMessages = [],
  onMorePress,
  onEdit,
  onRegenerate,
  onBranch,
}: MessageListProps) {
  const listRef = useRef<FlashList<Message>>(null);
  const prevLengthRef = useRef(0);

  // Combine real messages with optimistic ones
  // Messages from Convex already sorted; optimistic always newer, append at end
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;
    return [...messages, ...optimisticMessages];
  }, [messages, optimisticMessages]);

  // Auto-scroll when new messages added (not on initial load)
  const handleContentSizeChange = useCallback(() => {
    if (allMessages.length > prevLengthRef.current && listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
    prevLengthRef.current = allMessages.length;
  }, [allMessages.length]);

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
        estimatedItemSize={100}
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
