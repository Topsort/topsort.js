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
    try {
      this.wasConnected = await this.connectivity.getIsConnected();
    } catch {
      // Flaky NetInfo must not take down the client — assume online and continue.
      this.wasConnected = true;
    }

    this.unsubscribers.push(
      this.connectivity.subscribe((isConnected) => {
        if (isConnected && !this.wasConnected) {
          this.safeFlush();
        }
        this.wasConnected = isConnected;
      }),
    );

    this.unsubscribers.push(
      this.appState.subscribe((state) => {
        if (state === "active" || state === "background") {
          this.safeFlush();
        }
      }),
    );

    if (this.wasConnected) {
      try {
        await this.queue.flush();
      } catch {
        // Storage/read failures during startup must not reject `ready`.
      }
    }
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
  }

  private safeFlush(): void {
    void this.queue.flush().catch(() => {
      // Background flushes must not surface as unhandled rejections.
    });
  }
}
