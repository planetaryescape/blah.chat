import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { BookOpen, FileText, Globe, Type, Youtube } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type KnowledgeSource = Doc<"knowledgeSources">;

const TYPE_FILTERS = [
  { label: "All", value: undefined, icon: BookOpen },
  { label: "Files", value: "file", icon: FileText },
  { label: "Text", value: "text", icon: Type },
  { label: "Web", value: "web", icon: Globe },
  { label: "YouTube", value: "youtube", icon: Youtube },
] as const;

export default function KnowledgeScreen() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const sources = useQuery(api.knowledgeBank.index.list, {
    type: typeFilter as any,
  }) as KnowledgeSource[] | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const removeSource = useMutation(api.knowledgeBank.index.remove);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const reprocessSource = useMutation(api.knowledgeBank.index.reprocess);

  const handleDelete = useCallback(
    (sourceId: string) => {
      Alert.alert(
        "Delete Source",
        "This will permanently delete this knowledge source and all its chunks.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await removeSource({ sourceId: sourceId as any });
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch (error) {
                console.error("Failed to delete:", error);
              }
            },
          },
        ],
      );
    },
    [removeSource],
  );

  const handleRetry = useCallback(
    async (sourceId: string) => {
      try {
        await reprocessSource({ sourceId: sourceId as any });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to retry:", error);
      }
    },
    [reprocessSource],
  );

  const renderItem = useCallback(
    ({ item }: { item: KnowledgeSource }) => (
      <KnowledgeCard
        source={item}
        onDelete={() => handleDelete(item._id)}
        onRetry={() => handleRetry(item._id)}
      />
    ),
    [handleDelete, handleRetry],
  );

  if (sources === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Knowledge Bank" }} />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Knowledge Bank" }} />

      {/* Type filters */}
      <View style={styles.filtersContainer}>
        {TYPE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = typeFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => {
                setTypeFilter(filter.value);
                Haptics.selectionAsync();
              }}
            >
              <Icon
                size={14}
                color={
                  isActive ? colors.primaryForeground : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          Add knowledge sources from the web app. Mobile viewing only.
        </Text>
      </View>

      {/* List */}
      {sources.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} color={colors.mutedForeground} />}
          title="No knowledge sources"
          subtitle="Add PDFs, text, web pages, or YouTube videos from the web app"
        />
      ) : (
        <FlashList
          data={sources}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={160}
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
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
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
