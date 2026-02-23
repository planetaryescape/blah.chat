import * as SecureStore from "expo-secure-store";

const TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.log("[mobile][tokenCache] Operation timed out after 5s");
        resolve(fallback);
      }, TIMEOUT_MS),
    ),
  ]);
}

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const start = Date.now();
      const value = await withTimeout(SecureStore.getItemAsync(key), null);
      console.log(
        `[mobile][tokenCache] getToken(${key}): ${value ? "found" : "null"} (${Date.now() - start}ms)`,
      );
      return value;
    } catch (e) {
      console.log(`[mobile][tokenCache] getToken(${key}) ERROR:`, e);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      const start = Date.now();
      await withTimeout(
        SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        }),
        undefined,
      );
      console.log(
        `[mobile][tokenCache] saveToken(${key}): success (${Date.now() - start}ms)`,
      );
    } catch (e) {
      console.log(`[mobile][tokenCache] saveToken(${key}) ERROR:`, e);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await withTimeout(SecureStore.deleteItemAsync(key), undefined);
      console.log(`[mobile][tokenCache] clearToken(${key}): success`);
    } catch (e) {
      console.log(`[mobile][tokenCache] clearToken(${key}) ERROR:`, e);
    }
  },
};
