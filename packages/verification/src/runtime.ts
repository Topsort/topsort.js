import type { ProviderStartHook } from "./provider";
import {
  IasAdapterError,
  type IasProviderSession,
  type ParsedIasTag,
  parseIasTag,
  startIasProvider,
} from "./providers/ias";
import type {
  ConsentState,
  RegisterVerificationInput,
  VerificationDiagnosticCode,
  VerificationHandle,
  VerificationRuntime,
  VerificationRuntimeOptions,
} from "./types";

type VerificationStatus =
  | "registered"
  | "waiting_for_consent"
  | "waiting_for_element"
  | "loading_provider"
  | "active"
  | "failed"
  | "disposed";

interface RuntimeDependencies {
  startProvider: ProviderStartHook;
  parseTag: (value: string, document: Document) => ParsedIasTag;
  isHTMLElement: (value: unknown) => value is HTMLElement;
  now: () => number;
}

interface Registration {
  readonly element: HTMLElement;
  readonly renderKey: string;
  readonly tagIdentity: string;
  parsedTag?: ParsedIasTag;
  readonly startedAt: number;
  readonly handle: VerificationHandle;
  status: VerificationStatus;
  generation: number;
  consentState: ConsentState;
  providerStarted: boolean;
  session: IasProviderSession | null;
  unsubscribeConsent: (() => void) | null;
}

const defaultDependencies: RuntimeDependencies = {
  startProvider: (input) => {
    if (!input.parsedTag) throw new Error("parsed IAS tag missing");
    return startIasProvider({
      element: input.element,
      parsedTag: input.parsedTag,
    });
  },
  parseTag: parseIasTag,
  isHTMLElement(value): value is HTMLElement {
    if (!value || typeof value !== "object") return false;
    const ownerDocument = (value as { ownerDocument?: Document }).ownerDocument;
    const RealmHTMLElement = ownerDocument?.defaultView?.HTMLElement;
    if (typeof RealmHTMLElement === "function") return value instanceof RealmHTMLElement;
    return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
  },
  now: Date.now,
};

export function createVerificationRuntime(
  options: VerificationRuntimeOptions,
): VerificationRuntime {
  return createVerificationRuntimeInternal(options, defaultDependencies);
}

/** Internal seam for lifecycle tests. Provider injection is not exported from the package entrypoint. */
export function createVerificationRuntimeInternal(
  options: VerificationRuntimeOptions,
  dependencies: Partial<RuntimeDependencies> & Pick<RuntimeDependencies, "startProvider">,
): VerificationRuntime {
  const deps: RuntimeDependencies = { ...defaultDependencies, ...dependencies };
  const registrationsByElement = new WeakMap<HTMLElement, Registration>();
  const registrations = new Set<Registration>();
  let runtimeDisposed = false;

  function emit(record: Registration, code: VerificationDiagnosticCode): void {
    try {
      options.onDiagnostic?.({
        code,
        provider: "ias",
        elapsedMs: Math.max(0, deps.now() - record.startedAt),
      });
    } catch {
      // Diagnostics are observational and must never affect creative or verification lifecycle.
    }
  }

  function removeOwnership(record: Registration): void {
    registrations.delete(record);
    if (registrationsByElement.get(record.element) === record) {
      registrationsByElement.delete(record.element);
    }
  }

  function unsubscribeConsent(record: Registration): void {
    const unsubscribe = record.unsubscribeConsent;
    record.unsubscribeConsent = null;
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {
        // A caller-owned consent source cannot be allowed to break cleanup.
      }
    }
  }

  function disposeSession(record: Registration): void {
    const session = record.session;
    record.session = null;
    if (session) {
      try {
        session.dispose();
      } catch {
        // Provider cleanup is best-effort and isolated from the creative.
      }
    }
  }

  function terminate(
    record: Registration,
    status: Extract<VerificationStatus, "failed" | "disposed">,
    code: VerificationDiagnosticCode,
  ): void {
    if (record.status === "failed" || record.status === "disposed") {
      return;
    }

    record.generation += 1;
    record.status = status;
    unsubscribeConsent(record);
    disposeSession(record);
    removeOwnership(record);
    emit(record, code);
  }

  function isCurrent(record: Registration, generation: number): boolean {
    return (
      !runtimeDisposed &&
      record.generation === generation &&
      (record.status === "loading_provider" || record.status === "active") &&
      registrationsByElement.get(record.element) === record
    );
  }

  function observeSession(
    record: Registration,
    generation: number,
    session: IasProviderSession,
  ): void {
    void session.settled.catch((error: unknown) => {
      if (!isCurrent(record, generation)) return;
      const code = error instanceof IasAdapterError ? error.code : "provider_start_failed";
      if (code === "provider_aborted") return;
      terminate(record, "failed", code);
    });
  }

  function activateProvider(
    record: Registration,
    generation: number,
    session: { dispose(): void; settled?: Promise<void> },
  ): void {
    if (!isCurrent(record, generation) || record.consentState !== "granted") {
      try {
        session.dispose();
      } catch {
        // A stale provider completion is contained even if its cleanup throws.
      }
      return;
    }

    const normalizedSession: IasProviderSession = {
      dispose: session.dispose.bind(session),
      settled: session.settled ?? Promise.resolve(),
    };
    record.session = normalizedSession;
    observeSession(record, generation, normalizedSession);
    void normalizedSession.settled.then(
      () => {
        if (!isCurrent(record, generation) || record.consentState !== "granted") return;
        record.status = "active";
        emit(record, "active");
      },
      () => {
        // observeSession owns failure diagnostics; this branch prevents a derived
        // promise from becoming an unhandled rejection.
      },
    );
  }

  async function startProvider(record: Registration, generation: number): Promise<void> {
    try {
      const parsedTag = record.parsedTag;
      if (!parsedTag) throw new Error("parsed IAS tag missing");
      const result = deps.startProvider({
        element: record.element,
        renderKey: record.renderKey,
        tagIdentity: record.tagIdentity,
        parsedTag,
      });
      if (result instanceof Promise) {
        const session = await result;
        activateProvider(record, generation, session);
      } else {
        activateProvider(record, generation, result);
      }
    } catch {
      if (isCurrent(record, generation)) {
        terminate(record, "failed", "provider_start_failed");
      }
    }
  }

  function beginProvider(record: Registration): void {
    if (record.providerStarted || record.status === "failed" || record.status === "disposed") {
      return;
    }

    if (!record.element.isConnected) {
      record.status = "waiting_for_element";
      terminate(record, "failed", "element_not_ready");
      return;
    }

    record.providerStarted = true;
    record.status = "loading_provider";
    const generation = record.generation;
    try {
      if (record.element.ownerDocument) {
        record.parsedTag = deps.parseTag(record.tagIdentity, record.element.ownerDocument);
      } else {
        record.parsedTag = { src: record.tagIdentity, async: true, identity: record.tagIdentity };
      }
    } catch {
      terminate(record, "failed", "invalid_tag");
      return;
    }
    void startProvider(record, generation);
  }

  function handleConsent(record: Registration, state: ConsentState): void {
    if (record.status === "failed" || record.status === "disposed") {
      return;
    }

    const previousState = record.consentState;
    record.consentState = state;

    if (state === "denied") {
      const code = record.providerStarted ? "consent_withdrawn" : "consent_denied";
      terminate(record, "disposed", code);
      return;
    }

    if (state === "unknown") {
      if (record.status === "active") {
        // Once provider code has executed, losing consent is terminal for this registration.
        terminate(record, "disposed", "consent_withdrawn");
        return;
      }

      if (record.status === "loading_provider") {
        // Invalidate pending work and abort any already-created provider session.
        record.generation += 1;
        record.providerStarted = false;
        disposeSession(record);
      }
      record.status = "waiting_for_consent";
      return;
    }

    if (state === "granted" && (previousState !== "granted" || record.status === "registered")) {
      beginProvider(record);
    }
  }

  function attachConsent(record: Registration): void {
    let subscriptionAttached = false;
    let subscriptionDisposed = false;
    let rawUnsubscribe: (() => void) | null = null;

    record.unsubscribeConsent = () => {
      subscriptionDisposed = true;
      if (subscriptionAttached && rawUnsubscribe) {
        rawUnsubscribe();
      }
    };

    try {
      rawUnsubscribe = options.consentSource.subscribe((state) => handleConsent(record, state));
      subscriptionAttached = true;
      if (subscriptionDisposed) {
        rawUnsubscribe();
        return;
      }
      handleConsent(record, options.consentSource.current());
    } catch {
      terminate(record, "failed", "provider_start_failed");
    }
  }

  function createStandaloneHandle(): VerificationHandle {
    return {
      dispose() {},
    };
  }

  function register(input: RegisterVerificationInput): VerificationHandle {
    if (runtimeDisposed) {
      return createStandaloneHandle();
    }

    if (!deps.isHTMLElement(input?.element)) {
      return createStandaloneHandle();
    }

    if (typeof input.verificationTag !== "string" || !input.verificationTag.trim()) {
      const existing = registrationsByElement.get(input.element);
      if (existing) terminate(existing, "disposed", "replaced_registration");
      const handle = createStandaloneHandle();
      try {
        options.onDiagnostic?.({ code: "invalid_tag", provider: "ias", elapsedMs: 0 });
      } catch {
        // Diagnostics must not escape register.
      }
      return handle;
    }
    const tagIdentity = input.verificationTag.trim();
    const renderKey = typeof input.renderKey === "string" ? input.renderKey : "";
    const existing = registrationsByElement.get(input.element);

    if (!tagIdentity) {
      if (existing) {
        terminate(existing, "disposed", "replaced_registration");
      }
      const handle = createStandaloneHandle();
      try {
        options.onDiagnostic?.({ code: "invalid_tag", provider: "ias", elapsedMs: 0 });
      } catch {
        // Diagnostics must not escape register.
      }
      return handle;
    }

    if (!renderKey) {
      if (existing) {
        terminate(existing, "disposed", "replaced_registration");
      }
      return createStandaloneHandle();
    }

    if (
      existing &&
      existing.renderKey === renderKey &&
      existing.tagIdentity === tagIdentity &&
      existing.status !== "failed" &&
      existing.status !== "disposed"
    ) {
      return existing.handle;
    }

    if (existing) {
      terminate(existing, "disposed", "replaced_registration");
    }

    const record = {} as Registration;
    const handle: VerificationHandle = {
      dispose: () => terminate(record, "disposed", "disposed"),
    };

    Object.assign(record, {
      element: input.element,
      renderKey,
      tagIdentity,
      parsedTag: undefined,
      startedAt: deps.now(),
      handle,
      status: "registered" as const,
      generation: 0,
      consentState: "unknown" as const,
      providerStarted: false,
      session: null,
      unsubscribeConsent: null,
    });

    registrationsByElement.set(record.element, record);
    registrations.add(record);
    emit(record, "registered");
    attachConsent(record);
    return handle;
  }

  return {
    register,
    dispose() {
      if (runtimeDisposed) {
        return;
      }
      runtimeDisposed = true;
      for (const record of [...registrations]) {
        terminate(record, "disposed", "disposed");
      }
    },
  };
}
