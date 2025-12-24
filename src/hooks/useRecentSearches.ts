import { useLocalStorage } from "usehooks-ts";

const STORAGE_KEY = "blah-chat-recent-searches";
const MAX_RECENT_SEARCHES = 6;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    STORAGE_KEY,
    [],
  );

  const addSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setRecentSearches((prev) => {
      // Remove if already exists (move to front)
      const filtered = prev.filter((q) => q !== trimmed);
      // Add to front, limit to MAX
      return [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
  };

  return {
    recentSearches,
    isLoading: false, // useLocalStorage handles hydration
    addSearch,
    clearRecent,
  };
}
