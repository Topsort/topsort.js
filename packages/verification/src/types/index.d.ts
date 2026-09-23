export type ConsentState = "unknown" | "granted" | "denied";

export interface ConsentSource {
  current(): ConsentState;
  subscribe(listener: (state: ConsentState) => void): () => void;
}

export interface RegisterVerificationInput {
  verificationTag?: string | null;
  renderKey: string;
  element: HTMLElement;
  onDiagnostic?: (event: VerificationDiagnostic) => void;
}

export type VerificationDiagnosticCode =
  | "registered"
  | "active"
  | "disposed"
  | "invalid_tag"
  | "consent_denied"
  | "consent_withdrawn"
  | "consent_source_failed"
  | "invalid_element"
  | "invalid_render_key"
  | "element_not_ready"
  | "provider_load_failed"
  | "provider_start_failed"
  | "replaced_registration"
  | "runtime_disposed";

export interface VerificationDiagnostic {
  code: VerificationDiagnosticCode;
  provider: "ias";
  elapsedMs: number;
}

export interface VerificationRuntimeOptions {
  consentSource: ConsentSource;
  onDiagnostic?: (event: VerificationDiagnostic) => void;
}

export interface VerificationHandle {
  dispose(): void;
}

export interface VerificationRuntime {
  register(input: RegisterVerificationInput): VerificationHandle;
  dispose(): void;
}
