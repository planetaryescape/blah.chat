import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { Stack } from "expo-router";
import { Brain, Search, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animated chip with bounce effect
function AnimatedChip({
  label,
  isActive,
  onPress,
  style,
  textStyle,
  activeStyle,
  activeTextStyle,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style: object;
  textStyle: object;
  activeStyle?: object;
  activeTextStyle?: object;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
    haptics.selection();
    onPress();
  };

  return (
    <AnimatedPressable
      style={[style, isActive && activeStyle, animatedStyle]}
      onPress={handlePress}
    >
      <Text style={[textStyle, isActive && activeTextStyle]}>{label}</Text>
    </AnimatedPressable>
  );
}

type Memory = Doc<"memories">;

const CATEGORIES = [
  { label: "All", value: undefined },
  { label: "Preference", value: "preference" },
  { label: "Fact", value: "fact" },
  { label: "Context", value: "context" },
  { label: "Instruction", value: "instruction" },
];

const SORT_OPTIONS = [
  { label: "Date", value: "date" },
  { label: "Importance", value: "importance" },
  { label: "Confidence", value: "confidence" },
];

export default function MemoriesScreen() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState("date");
  const [searchQuery, setSearchQuery] = useState("");

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const memories = useQuery(api.memories.queries.listFiltered, {
    category,
    sortBy,
    searchQuery: searchQuery.trim() || undefined,
  }) as Memory[] | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteMemory = useMutation(api.memories.deleteMemory);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteAllMemories = useMutation(api.memories.mutations.deleteAll);

  const handleDelete = useCallback(
    (memoryId: string) => {
      Alert.alert("Delete Memory", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemory({ id: memoryId as any });
              haptics.success();
            } catch (error) {
              console.error("Failed to delete:", error);
            }
          },
        },
      ]);
    },
    [deleteMemory],
  );

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      "Delete All Memories",
      "This will permanently delete all your memories. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllMemories({});
              haptics.success();
            } catch (error) {
              console.error("Failed to delete all:", error);
            }
          },
        },
      ],
    );
  }, [deleteAllMemories]);

  const renderItem = useCallback(
    ({ item }: { item: Memory }) => (
      <SwipeableRow onDelete={() => handleDelete(item._id)}>
        <MemoryCard memory={item} onDelete={() => handleDelete(item._id)} />
      </SwipeableRow>
    ),
    [handleDelete],
  );

  if (memories === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Memories" }} />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Memories",
          headerRight: () =>
            memories.length > 0 ? (
              <TouchableOpacity
                onPress={handleDeleteAll}
                style={styles.headerButton}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search memories..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <AnimatedChip
              key={cat.label}
              label={cat.label}
              isActive={category === cat.value}
              onPress={() => setCategory(cat.value)}
              style={styles.categoryChip}
              textStyle={styles.categoryChipText}
              activeStyle={styles.categoryChipActive}
              activeTextStyle={styles.categoryChipTextActive}
            />
          ))}
        </View>

        {/* Sort options */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {SORT_OPTIONS.map((opt) => (
            <AnimatedChip
              key={opt.value}
              label={opt.label}
              isActive={sortBy === opt.value}
              onPress={() => setSortBy(opt.value)}
              style={styles.sortChip}
              textStyle={styles.sortChipText}
              activeStyle={styles.sortChipActive}
              activeTextStyle={styles.sortChipTextActive}
            />
          ))}
        </View>
      </View>

      {/* List */}
      {memories.length === 0 ? (
        <EmptyState
          icon={<Brain size={48} color={colors.mutedForeground} />}
          title="No memories yet"
          subtitle="Memories are extracted from your conversations to help personalize responses"
        />
      ) : (
        <FlashList
          data={memories}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={140}
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
  headerButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
    marginBottom: spacing.sm,
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
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sortLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  sortChipActive: {
    backgroundColor: colors.secondary,
  },
  sortChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  sortChipTextActive: {
    color: colors.foreground,
    fontFamily: fonts.bodySemibold,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
});
