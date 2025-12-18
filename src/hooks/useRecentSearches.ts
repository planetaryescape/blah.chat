import { useEffect, useState } from "react";

const STORAGE_KEY = "blah-chat-recent-searches";
const MAX_RECENT_SEARCHES = 6;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setRecentSearches((prev) => {
      // Remove if already exists (move to front)
      const filtered = prev.filter((q: any) => q !== trimmed);

      // Add to front, limit to MAX
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent searches:", error);
      }

      return updated;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  };

  return {
    recentSearches,
    isLoading,
    addSearch,
    clearRecent,
  };
}
