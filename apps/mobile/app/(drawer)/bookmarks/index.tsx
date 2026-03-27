import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Bookmark, MessagesSquare, Search, Tag } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookmarkMenuSheet } from "@/components/bookmarks";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { haptic } from "@/lib/haptics";
import { useBookmarks, useRemoveBookmark } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getTimeAgo } from "@/lib/utils/time";

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_~`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

type BookmarkItem = NonNullable<ReturnType<typeof useBookmarks>>[number];

function BookmarkCard({
  bookmark,
  onPress,
  onLongPress,
}: {
  bookmark: BookmarkItem;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const contentPreview = bookmark.messagePreview
    ? stripMarkdown(bookmark.messagePreview).slice(0, 150)
    : "";

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        borderRadius: layout.radius.md,
        backgroundColor: palette.glassLow,
      }}
    >
      {/* Conversation title */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          marginBottom: spacing.xs,
        }}
      >
        <MessagesSquare size={14} color={palette.starlightDim} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.bodySemiBold,
            fontSize: 13,
            color: palette.starlightDim,
          }}
        >
          {bookmark.conversationTitle || "Untitled"}
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {getTimeAgo(bookmark.createdAt)}
        </Text>
      </View>

      {/* Message preview */}
      {contentPreview ? (
        <Text
          numberOfLines={3}
          style={{
            fontFamily: typography.body,
            fontSize: 14,
            color: palette.starlight,
            lineHeight: 20,
            marginBottom:
              bookmark.note || (bookmark.tags && bookmark.tags.length > 0)
                ? spacing.xs
                : 0,
          }}
        >
          {contentPreview}
        </Text>
      ) : null}

      {/* Note */}
      {bookmark.note ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.body,
            fontSize: 13,
            color: palette.starlightDim,
            fontStyle: "italic",
            marginBottom:
              bookmark.tags && bookmark.tags.length > 0 ? spacing.xs : 0,
          }}
        >
          {bookmark.note}
        </Text>
      ) : null}

      {/* Tags */}
      {bookmark.tags && bookmark.tags.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.xs,
          }}
        >
          {bookmark.tags.map((tag: string) => (
            <View
              key={tag}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                backgroundColor: palette.glassMedium,
                borderRadius: layout.radius.sm,
                gap: 2,
              }}
            >
              <Tag size={10} color={palette.starlightDim} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 11,
                  color: palette.starlightDim,
                }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export default function BookmarksListScreen() {
  const router = useRouter();
  const bookmarks = useBookmarks();
  const removeBookmark = useRemoveBookmark();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkItem | null>(
    null,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const filteredBookmarks = useMemo(() => {
    if (!bookmarks) return undefined;
    if (!searchQuery.trim()) return bookmarks;
    const q = searchQuery.toLowerCase();
    return bookmarks.filter((b: BookmarkItem) => {
      const content = b.messagePreview?.toLowerCase() || "";
      const title = b.conversationTitle?.toLowerCase() || "";
      const note = b.note?.toLowerCase() || "";
      const tags = b.tags?.join(" ").toLowerCase() || "";
      return (
        content.includes(q) ||
        title.includes(q) ||
        note.includes(q) ||
        tags.includes(q)
      );
    });
  }, [bookmarks, searchQuery]);

  const handleBookmarkPress = useCallback(
    (bookmark: BookmarkItem) => {
      haptic.light();
      router.push({
        pathname: "/(drawer)/chat/[id]",
        params: {
          id: bookmark.conversationId,
          messageId: bookmark.messageId,
        },
      });
    },
    [router],
  );

  const handleBookmarkLongPress = useCallback((bookmark: BookmarkItem) => {
    haptic.medium();
    setSelectedBookmark(bookmark);
    setIsMenuOpen(true);
  }, []);

  const handleGoToChat = useCallback(() => {
    if (!selectedBookmark) return;
    router.push({
      pathname: "/(drawer)/chat/[id]",
      params: {
        id: selectedBookmark.conversationId,
        messageId: selectedBookmark.messageId,
      },
    });
  }, [selectedBookmark, router]);

  const handleRemoveBookmark = useCallback(async () => {
    if (!selectedBookmark) return;
    try {
      await removeBookmark({ bookmarkId: selectedBookmark._id });
    } catch (_error) {
      haptic.error();
    }
  }, [selectedBookmark, removeBookmark]);

  const isLoading = bookmarks === undefined;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader title="Bookmarks" leftAction="menu" />

      {/* Search */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: palette.glassLow,
            borderRadius: layout.radius.md,
            paddingHorizontal: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Search size={18} color={palette.starlightDim} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookmarks..."
            placeholderTextColor={palette.starlightDim}
            style={{
              flex: 1,
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlight,
              paddingVertical: spacing.sm,
            }}
          />
        </View>
      </View>

      {/* Bookmarks List */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : !filteredBookmarks || filteredBookmarks.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <Bookmark size={48} color={palette.starlightDim} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 16,
              color: palette.starlight,
              marginTop: spacing.md,
              textAlign: "center",
            }}
          >
            {searchQuery.trim()
              ? "No bookmarks match your search"
              : "No bookmarks yet"}
          </Text>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlightDim,
              marginTop: spacing.xs,
              textAlign: "center",
            }}
          >
            Bookmark messages from any conversation
          </Text>
        </View>
      ) : (
        <FlashList<BookmarkItem>
          data={filteredBookmarks}
          renderItem={({ item }) => (
            <BookmarkCard
              bookmark={item}
              onPress={() => handleBookmarkPress(item)}
              onLongPress={() => handleBookmarkLongPress(item)}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingVertical: spacing.sm,
          }}
        />
      )}

      {/* Bookmark Menu Sheet */}
      <BookmarkMenuSheet
        isOpen={isMenuOpen}
        onClose={() => {
          setIsMenuOpen(false);
          setSelectedBookmark(null);
        }}
        bookmark={selectedBookmark}
        onGoToChat={handleGoToChat}
        onRemove={handleRemoveBookmark}
      />
    </SafeAreaView>
  );
}
