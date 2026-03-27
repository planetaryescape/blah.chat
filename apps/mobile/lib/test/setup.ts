import { beforeEach, vi } from "vitest";

const storage = new Map<string, string>();

vi.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    set: (key: string, value: string) => {
      storage.set(key, value);
    },
    getString: (key: string) => storage.get(key),
    remove: (key: string) => {
      storage.delete(key);
    },
  }),
}));

beforeEach(() => {
  storage.clear();
});
