import { Bot, User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface SearchResult {
  _id: string;
  content?: string;
  role: string;
  conversationId: string;
  createdAt: number;
}

interface SearchResultCardProps {
  result: SearchResult;
  onPress: () => void;
}

export function SearchResultCard({ result, onPress }: SearchResultCardProps) {
  const date = new Date(result.createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isAssistant = result.role === "assistant";

  // Strip HTML/markdown for preview
  const contentPreview = result.content
    ? result.content.replace(/<[^>]*>/g, "").slice(0, 150)
    : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            isAssistant ? styles.assistantIcon : styles.userIcon,
          ]}
        >
          {isAssistant ? (
            <Bot size={16} color={colors.primary} />
          ) : (
            <User size={16} color={colors.foreground} />
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.role}>{isAssistant ? "Assistant" : "You"}</Text>
          <Text style={styles.date}>
            {formattedDate} at {formattedTime}
          </Text>
        </View>
      </View>

      {contentPreview && (
        <Text style={styles.preview} numberOfLines={3}>
          {contentPreview}
          {result.content && result.content.length > 150 ? "..." : ""}
        </Text>
      )}
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
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantIcon: {
    backgroundColor: `${colors.primary}15`,
  },
  userIcon: {
    backgroundColor: colors.secondary,
  },
  meta: {
    flex: 1,
  },
  role: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
});
