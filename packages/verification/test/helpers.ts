import type { ProviderSession, ProviderStartHook, ProviderStartInput } from "../src/provider";
import type { ConsentSource, ConsentState } from "../src/types";

export class MutableConsentSource implements ConsentSource {
  readonly listeners = new Set<(state: ConsentState) => void>();

  constructor(private state: ConsentState) {}

  current(): ConsentState {
    return this.state;
  }

  subscribe(listener: (state: ConsentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  set(state: ConsentState): void {
    this.state = state;
    for (const listener of [...this.listeners]) {
      listener(state);
    }
  }
}

export class TestElement {
  constructor(public isConnected = true) {}
}

export function asHTMLElement(element: TestElement): HTMLElement {
  return element as unknown as HTMLElement;
}

export function isTestElement(value: unknown): value is HTMLElement {
  return value instanceof TestElement;
}

export class FakeSession implements ProviderSession {
  disposeCalls = 0;

  dispose(): void {
    this.disposeCalls += 1;
  }
}

export class ImmediateProvider {
  readonly starts: ProviderStartInput[] = [];
  readonly sessions: FakeSession[] = [];

  readonly start: ProviderStartHook = async (input: ProviderStartInput) => {
    this.starts.push(input);
    const session = new FakeSession();
    this.sessions.push(session);
    return session;
  };
}

interface PendingStart {
  input: ProviderStartInput;
  resolve(session: ProviderSession): void;
  reject(error: unknown): void;
}

export class ControlledProvider {
  readonly pending: PendingStart[] = [];

  readonly start: ProviderStartHook = (input: ProviderStartInput) => {
    return new Promise((resolve, reject) => {
      this.pending.push({ input, resolve, reject });
    });
  };
}

export async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
