import { useCallback, useRef } from "react";
import type { RegisterVerificationInput, VerificationHandle, VerificationRuntime } from "../types";

export interface UseVerificationRefOptions
  extends Omit<RegisterVerificationInput, "element" | "verificationTag"> {
  verificationTag?: string | null;
}

/**
 * Binds verification to the committed element supplied by React.
 * The callback ref identity tracks the registration tuple, so React invokes the
 * old ref with null before a changed tuple is attached to the element again.
 */
export function useVerificationRef(
  runtime: VerificationRuntime,
  options: UseVerificationRefOptions,
): (element: HTMLElement | null) => void {
  const handleRef = useRef<VerificationHandle | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  return useCallback(
    (element: HTMLElement | null) => {
      if (element && elementRef.current === element && handleRef.current) {
        return;
      }
      handleRef.current?.dispose();
      handleRef.current = null;
      elementRef.current = element;
      if (element && options.verificationTag?.trim() && options.renderKey) {
        handleRef.current = runtime.register({
          element,
          verificationTag: options.verificationTag,
          renderKey: options.renderKey,
        });
      }
    },
    [runtime, options.verificationTag, options.renderKey],
  );
}
