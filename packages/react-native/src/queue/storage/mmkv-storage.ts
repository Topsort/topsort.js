import type { EventStorageAdapter } from "../types";

type MMKVLike = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
};

type MMKVConstructor = new (options?: { id?: string; encryptionKey?: string }) => MMKVLike;

export interface MMKVStorageOptions {
  /** MMKV instance id. Defaults to `"topsort-events"`. */
  id?: string;
  /**
   * When set, uses MMKV's AES encryption — the practical analog of Android
   * `EncryptedSharedPreferences`. Omit for plaintext MMKV.
   */
  encryptionKey?: string;
}

function loadMMKV(): MMKVConstructor {
  try {
    const mod = require("react-native-mmkv") as { MMKV: MMKVConstructor };
    return mod.MMKV;
  } catch {
    throw new Error(
      "@topsort/react-native-sdk: createMMKVStorageAdapter requires react-native-mmkv.",
    );
  }
}

/**
 * Optional encrypted (or plaintext) MMKV-backed adapter.
 * Prefer this over AsyncStorage when matching Android's encrypted-cache posture.
 */
export function createMMKVStorageAdapter(options: MMKVStorageOptions = {}): EventStorageAdapter {
  const MMKV = loadMMKV();
  const storage = new MMKV({
    id: options.id ?? "topsort-events",
    encryptionKey: options.encryptionKey,
  });

  return {
    async getItem(key) {
      return storage.getString(key) ?? null;
    },
    async setItem(key, value) {
      storage.set(key, value);
    },
    async removeItem(key) {
      storage.delete(key);
    },
    async getAllKeys() {
      return storage.getAllKeys();
    },
  };
}
