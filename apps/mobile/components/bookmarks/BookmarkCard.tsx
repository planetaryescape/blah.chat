import { Bookmark, MessageSquare } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

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

interface BookmarkCardProps {
  bookmark: BookmarkWithData;
  onPress: () => void;
}

export function BookmarkCard({ bookmark, onPress }: BookmarkCardProps) {
  const date = new Date(bookmark.createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  // Strip HTML/markdown for preview
  const messagePreview = bookmark.message.content
    ? bookmark.message.content.replace(/<[^>]*>/g, "").slice(0, 120)
    : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Bookmark size={18} color={colors.primary} fill={colors.primary} />
        </View>
        <View style={styles.titleRow}>
          <MessageSquare size={14} color={colors.mutedForeground} />
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {bookmark.conversation.title || "Untitled Chat"}
          </Text>
        </View>
      </View>

      {messagePreview && (
        <Text style={styles.preview} numberOfLines={3}>
          {messagePreview}
          {bookmark.message.content && bookmark.message.content.length > 120
            ? "..."
            : ""}
        </Text>
      )}

      {bookmark.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Note:</Text>
          <Text style={styles.noteText} numberOfLines={2}>
            {bookmark.note}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>{formattedDate}</Text>
        {bookmark.tags && bookmark.tags.length > 0 && (
          <View style={styles.tags}>
            {bookmark.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {bookmark.tags.length > 3 && (
              <Text style={styles.moreText}>+{bookmark.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  conversationTitle: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  noteContainer: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  moreText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
