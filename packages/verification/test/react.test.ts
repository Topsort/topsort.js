import { describe, expect, it } from "bun:test";
import React, { StrictMode } from "react";
import { act, create } from "react-test-renderer";
import { useVerificationRef } from "../src/react";
import type {
  RegisterVerificationInput,
  VerificationHandle,
  VerificationRuntime,
} from "../src/types";

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

describe("React verification ref", () => {
  it("registers the supplied element once across rerenders and cleans up", () => {
    const { runtime, registrations, disposed } = runtimeStub();
    const element = {} as HTMLElement;
    function Banner({ keyValue }: { keyValue: string }) {
      const ref = useVerificationRef(runtime, { verificationTag: "tag", renderKey: keyValue });
      return React.createElement("div", { ref });
    }
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(React.createElement(Banner, { keyValue: "a" }), {
        createNodeMock: () => element,
      });
    });
    act(() => tree.update(React.createElement(Banner, { keyValue: "a" })));
    expect(registrations).toHaveLength(1);
    act(() => tree.update(React.createElement(Banner, { keyValue: "b" })));
    expect(registrations).toHaveLength(2);
    expect(disposed).toEqual(["a"]);
    act(() => tree.unmount());
    expect(disposed).toEqual(["a", "b"]);
  });

  it("does not register without a tag or render key", () => {
    const { runtime, registrations } = runtimeStub();
    function Banner() {
      const ref = useVerificationRef(runtime, { verificationTag: "", renderKey: "" });
      return React.createElement("div", { ref });
    }
    act(() => {
      create(React.createElement(Banner), { createNodeMock: () => ({}) });
    });
    expect(registrations).toHaveLength(0);
  });

  it("is safe under React 18 StrictMode ref lifecycle", () => {
    const { runtime, registrations } = runtimeStub();
    const element = {} as HTMLElement;
    function Banner() {
      const ref = useVerificationRef(runtime, { verificationTag: "tag", renderKey: "a" });
      return React.createElement("div", { ref });
    }
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(React.createElement(StrictMode, null, React.createElement(Banner)), {
        createNodeMock: () => element,
      });
    });
    expect(registrations).toHaveLength(1);
    act(() => tree.unmount());
  });

  it("uses the latest diagnostic callback without restarting verification", () => {
    const { runtime, registrations } = runtimeStub();
    const element = {} as HTMLElement;
    const first: string[] = [];
    const second: string[] = [];
    function Banner({ destination }: { destination: string[] }) {
      const ref = useVerificationRef(runtime, {
        verificationTag: "tag",
        renderKey: "a",
        onDiagnostic: ({ code }) => destination.push(code),
      });
      return React.createElement("div", { ref });
    }
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(React.createElement(Banner, { destination: first }), {
        createNodeMock: () => element,
      });
    });
    act(() => tree.update(React.createElement(Banner, { destination: second })));

    expect(registrations).toHaveLength(1);
    registrations[0]?.onDiagnostic?.({ code: "active", provider: "ias", elapsedMs: 1 });
    expect(first).toEqual([]);
    expect(second).toEqual(["active"]);
  });
});
