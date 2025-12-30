import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FileText, Pin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

// Explicit type to avoid Convex type depth issues
interface Note {
  _id: string;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  updatedAt: number;
}

interface NoteCardProps {
  note: Doc<"notes">;
  onPress: () => void;
}

export function NoteCard({ note: rawNote, onPress }: NoteCardProps) {
  const note = rawNote as unknown as Note;
  const date = new Date(note.updatedAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  // Strip HTML tags for preview
  const contentPreview = note.content
    ? note.content.replace(/<[^>]*>/g, "").slice(0, 150)
    : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <FileText size={18} color={colors.mutedForeground} />
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title || "Untitled"}
          </Text>
          {note.isPinned && (
            <Pin size={14} color={colors.primary} fill={colors.primary} />
          )}
        </View>
      </View>

      {contentPreview && (
        <Text style={styles.preview} numberOfLines={2}>
          {contentPreview}
          {note.content && note.content.length > 150 ? "..." : ""}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>{formattedDate}</Text>
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tags}>
            {note.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {note.tags.length > 3 && (
              <Text style={styles.moreText}>+{note.tags.length - 3}</Text>
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
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.foreground,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.sm,
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
