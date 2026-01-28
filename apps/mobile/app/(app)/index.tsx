import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { MessageSquarePlus, MessagesSquare } from "lucide-react-native";
import { useCallback, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { useConversations } from "@/lib/hooks";
import {
  colors,
  layout,
  palette,
  spacing,
  typography,
} from "@/lib/theme/designSystem";

type Conversation = Doc<"conversations">;

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const router = useRouter();

  const handlePress = () => {
    haptic.light();
    router.push(`/(app)/chat/${conversation._id}`);
  };

  const timeAgo = getTimeAgo(conversation.lastMessageAt);

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={{
        backgroundColor: palette.glassLow,
        borderRadius: layout.radius.md,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: palette.glassBorder,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: typography.bodySemiBold,
          fontSize: 16,
          color: palette.starlight,
          marginBottom: spacing.xs,
        }}
      >
        {conversation.title}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 13,
            color: palette.starlightDim,
          }}
        >
          {conversation.messageCount || 0} messages
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {timeAgo}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
        backgroundColor: palette.void,
      }}
    >
      <MessagesSquare
        size={64}
        color={palette.starlightDim}
        strokeWidth={1.5}
      />
      <Text
        style={{
          fontFamily: typography.heading,
          fontSize: 20,
          color: palette.starlight,
          marginTop: spacing.lg,
          textAlign: "center",
        }}
      >
        No conversations yet
      </Text>
      <Text
        style={{
          fontFamily: typography.body,
          fontSize: 15,
          color: palette.starlightDim,
          marginTop: spacing.sm,
          textAlign: "center",
        }}
      >
        Start a new chat to begin
      </Text>
      <AnimatedPressable
        onPress={() => router.push("/(app)/chat/new")}
        style={{
          backgroundColor: palette.roseQuartz,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: layout.radius.full,
          marginTop: spacing.xl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 15,
            color: palette.void,
          }}
        >
          Start chatting
        </Text>
      </AnimatedPressable>
    </View>
  );
}

function FAB() {
  const router = useRouter();

  const handlePress = () => {
    haptic.medium();
    router.push("/(app)/chat/new");
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={{
        position: "absolute",
        bottom: spacing.xl,
        right: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.roseQuartz,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: palette.roseQuartz,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <MessageSquarePlus size={24} color={palette.void} strokeWidth={2} />
    </AnimatedPressable>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function ConversationsScreen() {
  const conversations = useConversations();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex automatically refetches, just show indicator briefly
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const isLoading = conversations === undefined;
  const isEmpty = conversations?.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
        }}
      >
        <Text
          style={{
            fontFamily: typography.display,
            fontSize: 28,
            color: palette.starlight,
          }}
        >
          Chats
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.void,
          }}
        >
          <Text
            style={{ color: palette.starlightDim, fontFamily: typography.body }}
          >
            Loading...
          </Text>
        </View>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <FlashList
          data={conversations}
          renderItem={({ item }) => <ConversationItem conversation={item} />}
          estimatedItemSize={80}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: 100,
            backgroundColor: palette.void,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.foreground}
            />
          }
        />
      )}

      {/* FAB */}
      {!isEmpty && <FAB />}
    </SafeAreaView>
  );
}
