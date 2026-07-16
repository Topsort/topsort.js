import type { EventStorageAdapter } from "../types";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
};

function loadAsyncStorage(): AsyncStorageLike {
  try {
    // Lazy require keeps the peer optional for consumers who pass a custom adapter.
    const mod = require("@react-native-async-storage/async-storage") as {
      default: AsyncStorageLike;
    };
    return mod.default;
  } catch {
    throw new Error(
      "@topsort/react-native-sdk: offlineQueue requires " +
        "@react-native-async-storage/async-storage, or pass offlineQueue.storage.",
    );
  }
}

/** Default durable adapter (plaintext). Prefer {@link createMMKVStorageAdapter} for encryption. */
export function createAsyncStorageAdapter(): EventStorageAdapter {
  const storage = loadAsyncStorage();
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    getAllKeys: async () => [...(await storage.getAllKeys())],
  };
}
