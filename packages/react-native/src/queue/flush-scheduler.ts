import type { EventQueue } from "./event-queue";
import type { AppStateSource, ConnectivitySource } from "./types";

/**
 * Flushes the durable queue on reconnect and AppState transitions
 * (RN stand-in for Android WorkManager triggers).
 */
export class FlushScheduler {
  private readonly unsubscribers: Array<() => void> = [];
  private wasConnected = true;

  constructor(
    private readonly queue: EventQueue,
    private readonly connectivity: ConnectivitySource,
    private readonly appState: AppStateSource,
  ) {}

  async start(): Promise<void> {
    this.wasConnected = await this.connectivity.getIsConnected();

    this.unsubscribers.push(
      this.connectivity.subscribe((isConnected) => {
        if (isConnected && !this.wasConnected) {
          void this.queue.flush();
        }
        this.wasConnected = isConnected;
      }),
    );

    this.unsubscribers.push(
      this.appState.subscribe((state) => {
        if (state === "active" || state === "background") {
          void this.queue.flush();
        }
      }),
    );

    if (this.wasConnected) {
      await this.queue.flush();
    }
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
  }
}
