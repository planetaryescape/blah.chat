import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type Template = Doc<"templates">;

const CATEGORIES = [
  { label: "All", value: undefined },
  { label: "Writing", value: "writing" },
  { label: "Coding", value: "coding" },
  { label: "Analysis", value: "analysis" },
  { label: "Creative", value: "creative" },
  { label: "Business", value: "business" },
];

export default function TemplatesScreen() {
  const [category, setCategory] = useState<string | undefined>(undefined);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const templates = useQuery(api.templates.list, {
    category,
  }) as Template[] | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  const handleUse = useCallback(async (template: Template) => {
    // Copy prompt to clipboard for use in chat
    await Clipboard.setStringAsync(template.prompt as string);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Copied!",
      "Template prompt copied to clipboard. Paste it in a new chat.",
    );
  }, []);

  const handleDelete = useCallback(
    (templateId: string) => {
      Alert.alert("Delete Template", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTemplate({ id: templateId as any });
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (error) {
              console.error("Failed to delete:", error);
            }
          },
        },
      ]);
    },
    [deleteTemplate],
  );

  const renderItem = useCallback(
    ({ item }: { item: Template }) => (
      <TemplateCard
        template={item}
        onUse={() => handleUse(item)}
        onDelete={item.isBuiltIn ? undefined : () => handleDelete(item._id)}
      />
    ),
    [handleUse, handleDelete],
  );

  if (templates === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Templates" }} />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Templates" }} />

      {/* Category filters */}
      <View style={styles.filtersContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.categoryChip,
              category === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => {
              setCategory(cat.value);
              Haptics.selectionAsync();
            }}
          >
            <Text
              style={[
                styles.categoryChipText,
                category === cat.value && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          Tap a template to copy its prompt to clipboard
        </Text>
      </View>

      {/* List */}
      {templates.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={48} color={colors.mutedForeground} />}
          title="No templates"
          subtitle="Create custom templates from the web app"
        />
      ) : (
        <FlashList
          data={templates}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={180}
          contentContainerStyle={styles.listContent}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersContainer: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  categoryChipTextActive: {
    color: colors.primaryForeground,
  },
  infoBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: spacing.md,
  },
});
