import { api } from "@blah-chat/backend/convex/_generated/api";
import { FlashList } from "@shopify/flash-list";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing } from "@/lib/theme/spacing";

interface SearchResult {
  _id: string;
  content?: string;
  role: string;
  conversationId: string;
  createdAt: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const hybridSearch = useAction(api.search.hybrid.hybridSearch);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await (
          hybridSearch as (args: {
            query: string;
            limit?: number;
          }) => Promise<SearchResult[]>
        )({
          query: searchQuery.trim(),
          limit: 30,
        });
        setResults(searchResults);
        setHasSearched(true);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [hybridSearch],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      // TODO: Implement scroll-to-message when messageId support is added
      router.push(`/chat/${result.conversationId}` as never);
    },
    [router],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }, []);

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <SearchResultCard result={item} onPress={() => handleResultPress(item)} />
    ),
    [handleResultPress],
  );

  return (
    <View style={styles.container}>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        onClear={handleClear}
        placeholder="Search your messages..."
      />

      {isSearching && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!isSearching && !hasSearched && !query && (
        <EmptyState
          icon={<Search size={56} color={colors.border} strokeWidth={1.5} />}
          title="Search your chats"
          subtitle="Find messages across all your conversations"
        />
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <EmptyState
          icon={<Search size={56} color={colors.border} strokeWidth={1.5} />}
          title="No results found"
          subtitle={`No messages match "${query}"`}
        />
      )}

      {!isSearching && results.length > 0 && (
        <FlashList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item: SearchResult) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={100}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </Text>
          }
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
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  resultsCount: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
