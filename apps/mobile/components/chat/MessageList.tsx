import type { FlashListRef } from "@shopify/flash-list";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
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
  scrollToBottomKey?: number;
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
  scrollToBottomKey = 0,
}: MessageListProps) {
  const listRef = useRef<FlashListRef<Message> | null>(null);
  const prevLengthRef = useRef(0);
  const focusedMessageRef = useRef<string | null>(null);
  const prevScrollToBottomKeyRef = useRef(scrollToBottomKey);
  const [isNearBottom, setIsNearBottom] = useState(true);

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

    const shouldForceScroll =
      scrollToBottomKey !== prevScrollToBottomKeyRef.current;

    if ((isNearBottom || shouldForceScroll) && listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
    prevScrollToBottomKeyRef.current = scrollToBottomKey;
    prevLengthRef.current = allMessages.length;
  }, [
    allMessages.length,
    focusIndex,
    focusMessage,
    focusMessageId,
    isNearBottom,
    scrollToBottomKey,
  ]);

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
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          const distanceFromBottom =
            contentSize.height - layoutMeasurement.height - contentOffset.y;
          setIsNearBottom(distanceFromBottom <= 64);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      {!isNearBottom && (
        <AnimatedPressable
          onPress={() => {
            listRef.current?.scrollToEnd({ animated: true });
            setIsNearBottom(true);
          }}
          style={{
            position: "absolute",
            bottom: spacing.md,
            alignSelf: "center",
            borderRadius: 999,
            backgroundColor: palette.glassMedium,
            borderWidth: 1,
            borderColor: palette.glassBorder,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <Text
            style={{
              color: palette.starlight,
              fontSize: 12,
            }}
          >
            Jump to latest
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

export const MessageList = memo(MessageListComponent);
