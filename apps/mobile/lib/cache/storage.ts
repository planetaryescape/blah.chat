import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({
  id: "blah-chat-storage",
});

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
