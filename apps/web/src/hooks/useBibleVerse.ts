"use client";

import { useCallback, useEffect, useState } from "react";
import { osisToDisplay } from "@/lib/bible/utils";
import {
  type CachedVerse,
  getCachedVerse,
  setCachedVerse,
} from "@/lib/bible/verseCache";

interface UseBibleVerseResult {
  verse: CachedVerse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBibleVerse(
  osis: string,
  enabled = true,
): UseBibleVerseResult {
  const [verse, setVerse] = useState<CachedVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerse = useCallback(async () => {
    if (!osis) return;

    const cached = getCachedVerse(osis);
    if (cached) {
      setVerse(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/bible/verse?ref=${encodeURIComponent(osis)}`,
      );
      const data = await res.json();

      if (data.status === "success" && data.data) {
        const newVerse: CachedVerse = {
          reference: data.data.reference || osisToDisplay(osis),
          osis,
          text: data.data.text,
          version: data.data.version || "WEB",
          cachedAt: Date.now(),
        };
        setCachedVerse(newVerse);
        setVerse(newVerse);
      } else {
        setError(data.error || "Failed to load verse");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [osis]);

  useEffect(() => {
    if (enabled) fetchVerse();
  }, [enabled, fetchVerse]);

  return { verse, loading, error, refetch: fetchVerse };
}
