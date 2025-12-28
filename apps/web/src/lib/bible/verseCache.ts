export interface CachedVerse {
  reference: string;
  osis: string;
  text: string;
  version: string;
  cachedAt: number;
}

interface CacheData {
  verses: Record<string, CachedVerse>;
  accessOrder: string[];
}

const STORAGE_KEY = "blah-chat-bible-cache-v2";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ENTRIES = 500;

const ERROR_PATTERNS = [
  /api.?key/i,
  /unauthorized/i,
  /forbidden/i,
  /rate.?limit/i,
  /quota/i,
  /error/i,
  /not.?found/i,
];

function isErrorText(text: string): boolean {
  if (!text || text.length < 10) return true;
  return ERROR_PATTERNS.some((p) => p.test(text));
}

function loadCache(): CacheData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { verses: {}, accessOrder: [] };
    return JSON.parse(raw) as CacheData;
  } catch {
    return { verses: {}, accessOrder: [] };
  }
}

function saveCache(data: CacheData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full, give up
    }
  }
}

export function getCachedVerse(osis: string): CachedVerse | null {
  if (typeof window === "undefined") return null;

  try {
    const data = loadCache();
    const verse = data.verses[osis];
    if (!verse) return null;

    // Expired
    if (Date.now() - verse.cachedAt > MAX_AGE_MS) {
      delete data.verses[osis];
      data.accessOrder = data.accessOrder.filter((k) => k !== osis);
      saveCache(data);
      return null;
    }

    // Update LRU order
    data.accessOrder = data.accessOrder.filter((k) => k !== osis);
    data.accessOrder.push(osis);
    saveCache(data);

    return verse;
  } catch {
    return null;
  }
}

export function setCachedVerse(verse: CachedVerse): void {
  if (typeof window === "undefined") return;
  if (isErrorText(verse.text)) return;

  try {
    const data = loadCache();

    data.verses[verse.osis] = { ...verse, cachedAt: Date.now() };
    data.accessOrder = data.accessOrder.filter((k) => k !== verse.osis);
    data.accessOrder.push(verse.osis);

    // LRU eviction
    while (data.accessOrder.length > MAX_ENTRIES) {
      const oldest = data.accessOrder.shift();
      if (oldest) delete data.verses[oldest];
    }

    saveCache(data);
  } catch {
    // Cache is optional
  }
}

export function clearVerseCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
