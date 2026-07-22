import { describe, expect, it } from "bun:test";
import type { Event, EventResult } from "@topsort/sdk-core";
import { AppError } from "@topsort/sdk-core";
import { createMemoryStorageAdapter, EventQueue } from "../src/queue";

const sampleEvent: Event = {
  impressions: [
    {
      id: "imp-1",
      occurredAt: "2024-10-31T12:00:00Z",
      opaqueUserId: "user-1",
      resolvedBidId: "bid-1",
    },
  ],
};

describe("EventQueue", () => {
  it("persists across a new queue instance (simulated app restart)", async () => {
    const storage = createMemoryStorageAdapter();
    let sends = 0;

    const first = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => {
        sends += 1;
        return { ok: true, retry: false };
      },
      now: () => 1_000,
      createId: () => "rec-1",
    });

    await first.enqueue(sampleEvent);
    expect(await first.size()).toBe(1);

    const restarted = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => {
        sends += 1;
        return { ok: true, retry: false };
      },
    });

    expect(await restarted.size()).toBe(1);
    const result = await restarted.flush();
    expect(result).toEqual({ sent: 1, remaining: 0 });
    expect(sends).toBe(1);
  });

  it("retries on { ok: false, retry: true } and drops after maxAttempts", async () => {
    const storage = createMemoryStorageAdapter();
    let calls = 0;
    let clock = 0;

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 3,
      send: async (): Promise<EventResult> => {
        calls += 1;
        return { ok: false, retry: true };
      },
      now: () => clock,
      createId: () => "rec-retry",
    });

    await queue.enqueue(sampleEvent);

    for (let i = 0; i < 3; i += 1) {
      clock += 60_000;
      await queue.flush();
    }

    expect(calls).toBe(3);
    expect(await queue.size()).toBe(0);
  });

  it("drops permanent 4xx failures without retrying forever", async () => {
    const storage = createMemoryStorageAdapter();
    let calls = 0;

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 10,
      send: async () => {
        calls += 1;
        throw new AppError(401, "Unauthorized", {}, false);
      },
      createId: () => "rec-perm",
    });

    await queue.enqueue(sampleEvent);
    await queue.flush();

    expect(calls).toBe(1);
    expect(await queue.size()).toBe(0);
  });

  it("drops oldest records when the queue cap is reached", async () => {
    const storage = createMemoryStorageAdapter();
    let id = 0;
    let clock = 0;

    const queue = new EventQueue({
      storage,
      maxSize: 2,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: false, retry: true }),
      now: () => {
        clock += 1;
        return clock;
      },
      createId: () => {
        id += 1;
        return `rec-${id}`;
      },
    });

    await queue.enqueue(sampleEvent);
    await queue.enqueue(sampleEvent);
    await queue.enqueue(sampleEvent);

    expect(await queue.size()).toBe(2);
    const keys = await storage.getAllKeys();
    expect(keys.some((key) => key.endsWith("rec-1"))).toBe(false);
    expect(keys.some((key) => key.endsWith("rec-2"))).toBe(true);
    expect(keys.some((key) => key.endsWith("rec-3"))).toBe(true);
  });

  it("respects maxSize under concurrent enqueue", async () => {
    const storage = createMemoryStorageAdapter();
    let id = 0;
    let clock = 0;

    const queue = new EventQueue({
      storage,
      maxSize: 3,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: false, retry: true }),
      now: () => {
        clock += 1;
        return clock;
      },
      createId: () => {
        id += 1;
        return `rec-${id}`;
      },
    });

    await Promise.all(Array.from({ length: 10 }, () => queue.enqueue(sampleEvent)));

    expect(await queue.size()).toBe(3);
  });

  it("migrates legacy records into the index on first load", async () => {
    const storage = createMemoryStorageAdapter();
    await storage.setItem(
      "topsort.event.legacy-1",
      JSON.stringify({
        id: "legacy-1",
        event: sampleEvent,
        enqueuedAt: "2024-10-31T12:00:00.000Z",
        attempts: 0,
        nextAttemptAt: 0,
      }),
    );

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: true, retry: false }),
    });

    expect(await queue.size()).toBe(1);
    expect(await storage.getItem("topsort.event.__index__")).toBe(JSON.stringify(["legacy-1"]));

    await queue.flush();
    expect(await queue.size()).toBe(0);
    expect(await storage.getItem("topsort.event.__index__")).toBe("[]");
  });

  it("keeps an empty index so size() does not rescan storage after flush", async () => {
    const base = createMemoryStorageAdapter();
    let getAllKeysCalls = 0;
    const storage = {
      getItem: (key: string) => base.getItem(key),
      setItem: (key: string, value: string) => base.setItem(key, value),
      removeItem: (key: string) => base.removeItem(key),
      getAllKeys: async () => {
        getAllKeysCalls += 1;
        return base.getAllKeys();
      },
    };

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: true, retry: false }),
      createId: () => "rec-1",
    });

    await queue.enqueue(sampleEvent);
    await queue.flush();
    const callsAfterFlush = getAllKeysCalls;

    expect(await queue.size()).toBe(0);
    expect(await storage.getItem("topsort.event.__index__")).toBe("[]");
    expect(getAllKeysCalls).toBe(callsAfterFlush);
  });

  it("keeps the index consistent when size() races with enqueue on first launch", async () => {
    const base = createMemoryStorageAdapter();
    let releaseGetAllKeys!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGetAllKeys = resolve;
    });
    let blockedOnce = false;

    const storage = {
      getItem: (key: string) => base.getItem(key),
      setItem: (key: string, value: string) => base.setItem(key, value),
      removeItem: (key: string) => base.removeItem(key),
      getAllKeys: async () => {
        if (!blockedOnce) {
          blockedOnce = true;
          await gate;
        }
        return base.getAllKeys();
      },
    };

    let id = 0;
    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: false, retry: true }),
      createId: () => {
        id += 1;
        return `rec-${id}`;
      },
    });

    // size() starts unlocked-looking migration; write lock must serialize enqueue behind it.
    const sizePromise = queue.size();
    await Bun.sleep(5);
    const enqueuePromise = queue.enqueue(sampleEvent);
    releaseGetAllKeys();
    await Promise.all([sizePromise, enqueuePromise]);

    expect(await queue.size()).toBe(1);
    expect(await storage.getItem("topsort.event.__index__")).toBe(JSON.stringify(["rec-1"]));
    expect(await storage.getItem("topsort.event.rec-1")).not.toBeNull();
  });

  it("prunes phantom index entries left by a crash mid-remove", async () => {
    const storage = createMemoryStorageAdapter();
    await storage.setItem("topsort.event.__index__", JSON.stringify(["gone", "alive"]));
    await storage.setItem(
      "topsort.event.alive",
      JSON.stringify({
        id: "alive",
        event: sampleEvent,
        enqueuedAt: "2024-10-31T12:00:00.000Z",
        attempts: 0,
        nextAttemptAt: 0,
      }),
    );

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: true, retry: false }),
    });

    expect(await queue.size()).toBe(1);
    expect(await storage.getItem("topsort.event.__index__")).toBe(JSON.stringify(["alive"]));

    await queue.flush();
    expect(await queue.size()).toBe(0);
    expect(await storage.getItem("topsort.event.__index__")).toBe("[]");
  });

  it("recovers orphan record bodies missing from the index", async () => {
    const storage = createMemoryStorageAdapter();
    await storage.setItem("topsort.event.__index__", "[]");
    await storage.setItem(
      "topsort.event.orphan-1",
      JSON.stringify({
        id: "orphan-1",
        event: sampleEvent,
        enqueuedAt: "2024-10-31T12:00:00.000Z",
        attempts: 0,
        nextAttemptAt: 0,
      }),
    );

    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: true, retry: false }),
    });

    expect(await queue.size()).toBe(1);
    expect(await storage.getItem("topsort.event.__index__")).toBe(JSON.stringify(["orphan-1"]));

    const result = await queue.flush();
    expect(result).toEqual({ sent: 1, remaining: 0 });
  });

  it("enqueueIfBacklog is a no-op when the queue is empty", async () => {
    const storage = createMemoryStorageAdapter();
    let id = 0;
    const queue = new EventQueue({
      storage,
      maxSize: 10,
      dropPolicy: "oldest",
      maxAttempts: 5,
      send: async () => ({ ok: true, retry: false }),
      createId: () => {
        id += 1;
        return `rec-${id}`;
      },
    });

    expect(await queue.enqueueIfBacklog(sampleEvent)).toBeNull();
    expect(await queue.size()).toBe(0);

    await queue.enqueue(sampleEvent);
    expect(await queue.enqueueIfBacklog(sampleEvent)).not.toBeNull();
    expect(await queue.size()).toBe(2);
  });
});
