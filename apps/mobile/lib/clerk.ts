import * as SecureStore from "expo-secure-store";

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      console.log(
        `[mobile][tokenCache] getToken(${key}): ${value ? "found" : "null"}`,
      );
      return value;
    } catch (e) {
      console.log(`[mobile][tokenCache] getToken(${key}) ERROR:`, e);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      console.log(`[mobile][tokenCache] saveToken(${key}): success`);
    } catch (e) {
      console.log(`[mobile][tokenCache] saveToken(${key}) ERROR:`, e);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`[mobile][tokenCache] clearToken(${key}): success`);
    } catch (e) {
      console.log(`[mobile][tokenCache] clearToken(${key}) ERROR:`, e);
    }
  },
};
