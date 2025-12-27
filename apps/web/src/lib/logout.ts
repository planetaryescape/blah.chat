/**
 * Logout utility functions
 * Clears all user-specific data from client-side storage on logout
 */

// Keys stored in localStorage that should be cleared on logout
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  "blah-hints-dismissed",
  "conversationsExpanded",
  "blah-recent-searches",
] as const;

// Prefix patterns for sessionStorage keys to clear
const _SESSION_STORAGE_PREFIXES = ["modelHint-"] as const;

/**
 * Clears all user-specific data from browser storage
 * Should be called when user signs out to prevent data leakage
 */
export function clearUserDataOnLogout(): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear specific localStorage keys
    for (const key of LOCAL_STORAGE_KEYS_TO_CLEAR) {
      localStorage.removeItem(key);
    }

    // 2. Clear sessionStorage completely (session-specific data)
    sessionStorage.clear();

    // 3. Clear any IndexedDB databases if used (future-proofing)
    // Currently not used, but pattern is here for future implementation

    console.log("[Logout] User data cleared from client storage");
  } catch (error) {
    console.error("[Logout] Failed to clear user data:", error);
  }
}

/**
 * Clears only sessionStorage data (for quick cleanup without full logout)
 */
export function clearSessionData(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.clear();
  } catch (error) {
    console.error("[Logout] Failed to clear session data:", error);
  }
}
