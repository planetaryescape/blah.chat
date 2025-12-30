import { api } from "@blah-chat/backend/convex/_generated/api";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing } from "@/lib/theme/spacing";

interface Message {
  content?: string;
  role: string;
}

interface Conversation {
  title?: string;
}

interface BookmarkWithData {
  _id: string;
  note?: string;
  tags?: string[];
  createdAt: number;
  message: Message;
  conversation: Conversation;
  conversationId: string;
}

export default function BookmarksScreen() {
  const router = useRouter();

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const bookmarks = useQuery(api.bookmarks.list) as
    | BookmarkWithData[]
    | undefined;

  const handleBookmarkPress = useCallback(
    (bookmark: BookmarkWithData) => {
      // Navigate to the conversation
      // TODO: Implement scroll-to-message when messageId support is added
      router.push(`/chat/${bookmark.conversationId}` as never);
    },
    [router],
  );

  const renderBookmark = useCallback(
    ({ item }: { item: BookmarkWithData }) => (
      <BookmarkCard bookmark={item} onPress={() => handleBookmarkPress(item)} />
    ),
    [handleBookmarkPress],
  );

  if (bookmarks === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading bookmarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={56} color={colors.border} strokeWidth={1.5} />}
          title="No bookmarks yet"
          subtitle="Bookmark messages to save them for later"
        />
      ) : (
        <FlashList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item: BookmarkWithData) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={140}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  list: {
    paddingVertical: spacing.sm,
  },
});
