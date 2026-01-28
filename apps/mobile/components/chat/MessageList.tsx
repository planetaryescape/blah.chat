import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { palette, spacing } from "@/lib/theme/designSystem";
import { MessageBubble } from "./MessageBubble";

type Message = Doc<"messages">;

interface MessageListProps {
  messages: Message[];
  optimisticMessages?: Message[];
}

function MessageListComponent({
  messages,
  optimisticMessages = [],
}: MessageListProps) {
  const listRef = useRef<FlashList<Message>>(null);

  // Combine real messages with optimistic ones, sort by createdAt (oldest first)
  const allMessages = [...messages, ...optimisticMessages].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (allMessages.length > 0 && listRef.current) {
      // Small delay to ensure list has rendered
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    return <MessageBubble message={item} />;
  }, []);

  const keyExtractor = useCallback((item: Message) => item._id, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.void }}>
      <FlashList
        ref={listRef}
        data={allMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={100}
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
