import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { AppError, baseURL, type Event, endpoints } from "@topsort/sdk-core";
import { TopsortClient } from "../src";
import { mswServer, returnError, returnStatus } from "../src/constants/handlers.constant";
import {
  type AppStateSource,
  type ConnectivitySource,
  createMemoryStorageAdapter,
  isRecordStorageKey,
} from "../src/queue";

const sampleEvent: Event = {
  impressions: [
    {
      id: "imp-offline-1",
      occurredAt: "2024-10-31T12:00:00Z",
      opaqueUserId: "user-1",
      resolvedBidId: "bid-1",
    },
  ],
};

function createConnectivityMock(initial = true): ConnectivitySource & {
  setConnected: (value: boolean) => void;
} {
  let connected = initial;
  const listeners = new Set<(value: boolean) => void>();
  return {
    async getIsConnected() {
      return connected;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setConnected(value: boolean) {
      connected = value;
      for (const listener of listeners) {
        listener(value);
      }
    },
  };
}

function createAppStateMock(): AppStateSource & { emit: (state: string) => void } {
  const listeners = new Set<(state: string) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(state: string) {
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}

async function queuedRecordCount(
  adapter: ReturnType<typeof createMemoryStorageAdapter>,
): Promise<number> {
  return (await adapter.getAllKeys()).filter(isRecordStorageKey).length;
}

describe("reportEvent with offlineQueue", () => {
  let storage: ReturnType<typeof createMemoryStorageAdapter>;
  let connectivity: ReturnType<typeof createConnectivityMock>;
  let appState: ReturnType<typeof createAppStateMock>;
  let client: TopsortClient;

  beforeAll(() => mswServer.listen());
  afterEach(() => {
    client?.dispose();
    mswServer.resetHandlers();
  });
  beforeEach(async () => {
    storage = createMemoryStorageAdapter();
    connectivity = createConnectivityMock(true);
    appState = createAppStateMock();
    client = new TopsortClient({
      apiKey: "apiKey",
      offlineQueue: {
        storage,
        connectivity,
        appState,
        maxSize: 50,
        maxAttempts: 5,
      },
    });
    await client.whenReady();
  });

  it("enqueues retryable HTTP failures and returns ok after accept", async () => {
    returnStatus(429, `${baseURL}/${endpoints.events}`);

    await expect(client.reportEvent(sampleEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
    expect(await queuedRecordCount(storage)).toBe(1);
  });

  it("enqueues transport/network failures", async () => {
    returnError(`${baseURL}/${endpoints.events}`);

    await expect(client.reportEvent(sampleEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
    expect(await queuedRecordCount(storage)).toBe(1);
  });

  it("does not enqueue permanent 4xx failures", async () => {
    returnStatus(401, `${baseURL}/${endpoints.events}`);

    await expect(client.reportEvent(sampleEvent)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
    expect(await queuedRecordCount(storage)).toBe(0);
  });

  it("flushes queued events when connectivity is restored", async () => {
    connectivity.setConnected(false);
    returnError(`${baseURL}/${endpoints.events}`);

    await client.reportEvent(sampleEvent);
    expect(await queuedRecordCount(storage)).toBe(1);

    mswServer.resetHandlers();
    returnStatus(204, `${baseURL}/${endpoints.events}`);
    connectivity.setConnected(true);

    // Allow the async flush triggered by connectivity to settle.
    await Bun.sleep(10);
    await client.flush();

    expect(await queuedRecordCount(storage)).toBe(0);
  });

  it("flushes on AppState active/background transitions", async () => {
    returnError(`${baseURL}/${endpoints.events}`);
    await client.reportEvent(sampleEvent);

    mswServer.resetHandlers();
    returnStatus(204, `${baseURL}/${endpoints.events}`);
    appState.emit("background");
    await Bun.sleep(10);
    await client.flush();

    expect(await queuedRecordCount(storage)).toBe(0);
  });

  it("survives a simulated app restart via the shared storage adapter", async () => {
    returnError(`${baseURL}/${endpoints.events}`);
    await client.reportEvent(sampleEvent);
    client.dispose();

    mswServer.resetHandlers();
    returnStatus(204, `${baseURL}/${endpoints.events}`);

    const restarted = new TopsortClient({
      apiKey: "apiKey",
      offlineQueue: {
        storage,
        connectivity: createConnectivityMock(true),
        appState: createAppStateMock(),
      },
    });
    await restarted.whenReady();
    await restarted.flush();

    expect(await queuedRecordCount(storage)).toBe(0);
    restarted.dispose();
  });

  it("keeps Phase 2 semantics when offlineQueue is disabled", async () => {
    const plain = new TopsortClient({ apiKey: "apiKey" });
    returnStatus(429, `${baseURL}/${endpoints.events}`);
    await expect(plain.reportEvent(sampleEvent)).resolves.toEqual({
      ok: false,
      retry: true,
    });

    returnError(`${baseURL}/${endpoints.events}`);
    await expect(plain.reportEvent(sampleEvent)).rejects.toBeInstanceOf(AppError);
  });

  it("returns retryable result when newest dropPolicy rejects a full queue", async () => {
    client.dispose();
    const fullStorage = createMemoryStorageAdapter();
    client = new TopsortClient({
      apiKey: "apiKey",
      offlineQueue: {
        storage: fullStorage,
        connectivity: createConnectivityMock(true),
        appState: createAppStateMock(),
        maxSize: 1,
        dropPolicy: "newest",
        maxAttempts: 5,
      },
    });
    await client.whenReady();

    returnStatus(429, `${baseURL}/${endpoints.events}`);
    await expect(client.reportEvent(sampleEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
    expect(await queuedRecordCount(fullStorage)).toBe(1);

    // Queue is full; rejecting newest must not throw a raw Error through reportEvent.
    await expect(client.reportEvent(sampleEvent)).resolves.toEqual({
      ok: false,
      retry: true,
    });
    expect(await queuedRecordCount(fullStorage)).toBe(1);
  });

  it("still reports events when connectivity startup rejects", async () => {
    client.dispose();
    const flakyConnectivity: ConnectivitySource = {
      async getIsConnected() {
        throw new Error("NetInfo unavailable");
      },
      subscribe() {
        return () => {};
      },
    };

    client = new TopsortClient({
      apiKey: "apiKey",
      offlineQueue: {
        storage: createMemoryStorageAdapter(),
        connectivity: flakyConnectivity,
        appState: createAppStateMock(),
      },
    });

    returnStatus(204, `${baseURL}/${endpoints.events}`);
    await expect(client.reportEvent(sampleEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("preserves FIFO when backlog exists before a live send", async () => {
    const { HttpResponse, http } = await import("msw");
    client.dispose();

    connectivity = createConnectivityMock(false);
    storage = createMemoryStorageAdapter();
    client = new TopsortClient({
      apiKey: "apiKey",
      offlineQueue: {
        storage,
        connectivity,
        appState: createAppStateMock(),
        maxAttempts: 5,
      },
    });
    await client.whenReady();

    const eventA: Event = {
      impressions: [
        {
          id: "imp-a",
          occurredAt: "2024-10-31T12:00:00Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
    };
    const eventB: Event = {
      impressions: [
        {
          id: "imp-b",
          occurredAt: "2024-10-31T12:00:01Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
    };
    const eventC: Event = {
      impressions: [
        {
          id: "imp-c",
          occurredAt: "2024-10-31T12:00:02Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
    };

    returnError(`${baseURL}/${endpoints.events}`);
    await client.reportEvent(eventA);
    await client.reportEvent(eventB);

    const sentIds: string[] = [];
    mswServer.resetHandlers();
    mswServer.use(
      http.post(`${baseURL}/${endpoints.events}`, async ({ request }) => {
        const body = (await request.json()) as Event;
        const id = body.impressions?.[0]?.id;
        if (id) {
          sentIds.push(id);
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );

    // Still offline with backlog — C must enqueue behind A/B, not jump the line.
    await client.reportEvent(eventC);
    connectivity.setConnected(true);
    await Bun.sleep(10);
    await client.flush();

    expect(sentIds).toEqual(["imp-a", "imp-b", "imp-c"]);
    expect(await queuedRecordCount(storage)).toBe(0);
  });
});
