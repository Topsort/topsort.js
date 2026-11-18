import { beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const dist = (file: string) => `${packageRoot}dist/${file}`;

function declaredValueExports(declarationFile: string): string[] {
  const source = readFileSync(dist(declarationFile), "utf8");
  const values = new Set(
    [...source.matchAll(/^(?:export )?declare (?:const|let|var|function|class|enum) (\w+)/gm)].map(
      ([, name]) => name,
    ),
  );
  const exportList = [...source.matchAll(/^export \{([^}]*)\};?$/gm)].flatMap(([, list]) =>
    list
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [local, exported = local] = entry.split(/\s+as\s+/);
        return { local, exported };
      }),
  );
  expect(exportList.length).toBeGreaterThan(0);
  return exportList
    .filter(({ local }) => values.has(local))
    .map(({ exported }) => exported)
    .sort();
}

describe("built package exports", () => {
  beforeAll(() => {
    const build = Bun.spawnSync(["bun", "run", "build"], { cwd: packageRoot });
    expect(build.exitCode).toBe(0);
  });

  it("ships every value declared in index.d.ts from the ESM bundle", async () => {
    const runtime = Object.keys(await import(dist("index.js"))).sort();
    expect(declaredValueExports("index.d.ts")).toEqual(runtime);
  });

  it("ships every value declared in index.d.cts from the CJS bundle", () => {
    const runtime = Object.keys(createRequire(import.meta.url)(dist("index.cjs"))).sort();
    expect(declaredValueExports("index.d.cts")).toEqual(runtime);
  });
});
