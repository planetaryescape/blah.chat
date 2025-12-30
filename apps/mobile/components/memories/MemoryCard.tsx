import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { Brain, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type Memory = Doc<"memories">;

interface MemoryCardProps {
  memory: Memory;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  preference: colors.primary,
  fact: colors.success,
  context: colors.link,
  instruction: "#a78bfa",
  relationship: "#f472b6",
  behavior: "#fb923c",
  other: colors.mutedForeground,
};

export function MemoryCard({ memory, onDelete }: MemoryCardProps) {
  const category = memory.metadata?.category || "other";
  const importance = memory.metadata?.importance || 0;
  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Brain size={16} color={categoryColor} />
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {category}
          </Text>
        </View>
        <View style={styles.spacer} />
        <Text style={styles.date}>{formatDate(memory.createdAt)}</Text>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          onPress={handleDelete}
        >
          <Trash2 size={16} color={colors.error} />
        </Pressable>
      </View>

      <Text style={styles.content} numberOfLines={4}>
        {memory.content}
      </Text>

      <View style={styles.footer}>
        <View style={styles.importanceContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.importanceDot,
                i < importance && { backgroundColor: categoryColor },
              ]}
            />
          ))}
        </View>
        {memory.metadata?.confidence !== undefined && (
          <Text style={styles.confidence}>
            {Math.round(memory.metadata.confidence * 100)}% confident
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  spacer: {
    flex: 1,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: `${colors.error}15`,
  },
  content: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  importanceContainer: {
    flexDirection: "row",
    gap: 4,
  },
  importanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  confidence: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
