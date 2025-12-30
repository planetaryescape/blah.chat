import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { Crown, MessageSquare, Sparkles, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type Template = Doc<"templates">;

interface TemplateCardProps {
  template: Template;
  onUse: () => void;
  onDelete?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  writing: colors.primary,
  coding: colors.success,
  analysis: colors.link,
  creative: "#a78bfa",
  business: "#fb923c",
  education: "#f472b6",
  other: colors.mutedForeground,
};

export function TemplateCard({ template, onUse, onDelete }: TemplateCardProps) {
  // Cast for TypeScript - Convex Doc types are generic
  const category = template.category as string;
  const name = template.name as string;
  const isBuiltIn = template.isBuiltIn as boolean | undefined;
  const usageCount = (template.usageCount as number) || 0;
  const description = template.description as string | undefined;
  const prompt = template.prompt as string;

  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const canDelete = !isBuiltIn;

  const handleUse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUse();
  };

  const handleDelete = () => {
    if (onDelete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDelete();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleUse}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${categoryColor}15` },
          ]}
        >
          <Sparkles size={18} color={categoryColor} />
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
            {isBuiltIn && (
              <View style={styles.builtInBadge}>
                <Crown size={10} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: `${categoryColor}20` },
              ]}
            >
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {category}
              </Text>
            </View>
            {usageCount > 0 && (
              <View style={styles.usageContainer}>
                <MessageSquare size={10} color={colors.mutedForeground} />
                <Text style={styles.usageText}>{usageCount}</Text>
              </View>
            )}
          </View>
        </View>
        {canDelete && (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
            onPress={handleDelete}
          >
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        )}
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      <Text style={styles.prompt} numberOfLines={3}>
        {prompt}
      </Text>
    </Pressable>
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
  cardPressed: {
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  builtInBadge: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    textTransform: "capitalize",
  },
  usageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  usageText: {
    fontFamily: fonts.body,
    fontSize: 11,
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
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  prompt: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.foreground,
    marginTop: spacing.sm,
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    lineHeight: 18,
  },
});
