import type { EventStorageAdapter } from "../types";

/** In-memory adapter for tests and environments without AsyncStorage/MMKV. */
export class MemoryStorageAdapter implements EventStorageAdapter {
  private readonly store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.store.keys()];
  }
}

export function createMemoryStorageAdapter(): EventStorageAdapter {
  return new MemoryStorageAdapter();
}
