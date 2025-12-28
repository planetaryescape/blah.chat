import { createMMKV } from "react-native-mmkv";

// MMKV instance - 10x faster than AsyncStorage
export const storage = createMMKV({
  id: "blah-chat-storage",
});

// Sync storage interface for React Query persister
export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  getItem: (key: string) => {
    return storage.getString(key) ?? null;
  },
  removeItem: (key: string) => {
    storage.remove(key);
  },
};
