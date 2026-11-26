import { describe, expect, it } from "bun:test";
import React, { StrictMode } from "react";
import { act, create } from "react-test-renderer";
import { type UseVerificationRefOptions, useVerificationRef } from "../src/react";
import type {
  RegisterVerificationInput,
  VerificationHandle,
  VerificationRuntime,
} from "../src/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function runtimeStub() {
  const registrations: Array<{
    element: HTMLElement;
    renderKey: string;
    tag: string | null | undefined;
    onDiagnostic: RegisterVerificationInput["onDiagnostic"];
  }> = [];
  const disposed: string[] = [];
  const runtime: VerificationRuntime = {
    register(input) {
      registrations.push({
        element: input.element,
        renderKey: input.renderKey,
        tag: input.verificationTag,
        onDiagnostic: input.onDiagnostic,
      });
      const handle: VerificationHandle = {
        dispose: () => disposed.push(input.renderKey),
      };
      return handle;
    },
    dispose() {},
  };
  return { runtime, registrations, disposed };
}

function Banner({
  runtime,
  options,
}: {
  runtime: VerificationRuntime;
  options: UseVerificationRefOptions;
}) {
  const ref = useVerificationRef(runtime, options);
  return React.createElement("div", { ref });
}

describe("React verification ref", () => {
  it("registers the supplied element once across rerenders and cleans up", () => {
    const { runtime, registrations, disposed } = runtimeStub();
    const element = {} as HTMLElement;
    const banner = (renderKey: string) =>
      React.createElement(Banner, { runtime, options: { verificationTag: "tag", renderKey } });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(banner("a"), {
        createNodeMock: () => element,
      });
    });
    act(() => tree.update(banner("a")));
    expect(registrations).toHaveLength(1);
    act(() => tree.update(banner("b")));
    expect(registrations).toHaveLength(2);
    expect(disposed).toEqual(["a"]);
    act(() => tree.unmount());
    expect(disposed).toEqual(["a", "b"]);
  });

  it("does not register without a tag or render key", () => {
    const { runtime, registrations } = runtimeStub();
    act(() => {
      create(
        React.createElement(Banner, { runtime, options: { verificationTag: "", renderKey: "" } }),
        { createNodeMock: () => ({}) },
      );
    });
    expect(registrations).toHaveLength(0);
  });

  it("keeps exactly one live registration under the supported StrictMode ref lifecycle", () => {
    const { runtime, registrations, disposed } = runtimeStub();
    const element = {} as HTMLElement;
    const banner = React.createElement(Banner, {
      runtime,
      options: { verificationTag: "tag", renderKey: "a" },
    });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(React.createElement(StrictMode, null, banner), {
        createNodeMock: () => element,
      });
    });
    expect(registrations.length).toBeGreaterThanOrEqual(1);
    expect(registrations.length - disposed.length).toBe(1);
    act(() => tree.unmount());
    expect(disposed).toHaveLength(registrations.length);
  });

  it("uses the latest diagnostic callback without restarting verification", () => {
    const { runtime, registrations } = runtimeStub();
    const element = {} as HTMLElement;
    const first: string[] = [];
    const second: string[] = [];
    const banner = (destination: string[]) =>
      React.createElement(Banner, {
        runtime,
        options: {
          verificationTag: "tag",
          renderKey: "a",
          onDiagnostic: ({ code }) => destination.push(code),
        },
      });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(banner(first), {
        createNodeMock: () => element,
      });
    });
    act(() => tree.update(banner(second)));

    expect(registrations).toHaveLength(1);
    registrations[0]?.onDiagnostic?.({ code: "active", provider: "ias", elapsedMs: 1 });
    expect(first).toEqual([]);
    expect(second).toEqual(["active"]);
  });
});
