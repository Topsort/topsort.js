import { mkdir, mkdtemp, readFile, rename, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

interface PackResult {
  filename: string;
  files: Array<{ path: string; size: number }>;
}

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

async function run(command: string[], cwd = packageRoot): Promise<string> {
  const process = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed (${exitCode})\n${stdout}\n${stderr}`);
  }
  return stdout.trim();
}

function parsePackResult(output: string): PackResult {
  const parsed = JSON.parse(output) as PackResult[];
  const result = parsed[0];
  if (!result) throw new Error("npm pack returned no artifact metadata");
  return result;
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, contents);
}

async function main(): Promise<void> {
  const baseBundlePath = join(packageRoot, "dist/index.js");
  const reactBundlePath = join(packageRoot, "dist/react.js");
  const baseBundle = await readFile(baseBundlePath, "utf8");
  if (/\bfrom\s*["']react(?:\/|["'])|\brequire\(["']react(?:\/|["'])/.test(baseBundle)) {
    throw new Error("base bundle unexpectedly depends on React");
  }

  const sizes = await Promise.all(
    [baseBundlePath, reactBundlePath].map(async (path) => {
      const bytes = (await stat(path)).size;
      const gzipBytes = gzipSync(await readFile(path)).byteLength;
      return { file: path.slice(packageRoot.length), bytes, gzipBytes };
    }),
  );
  console.log(`bundle sizes: ${JSON.stringify(sizes)}`);

  const temporaryRoot = await mkdtemp(join(tmpdir(), "topsort-verification-pack-"));
  try {
    const npmCache = join(temporaryRoot, "npm-cache");
    const dryRun = parsePackResult(
      await run(["npm", "pack", "--dry-run", "--json", "--ignore-scripts", "--cache", npmCache]),
    );
    const packedPaths = dryRun.files.map(({ path }) => path).sort();
    const expectedPaths = [
      "LICENSE",
      "README.md",
      "dist/index.d.ts",
      "dist/index.js",
      "dist/react.d.ts",
      "dist/react.js",
      "package.json",
    ];
    if (JSON.stringify(packedPaths) !== JSON.stringify(expectedPaths)) {
      throw new Error(`unexpected npm pack contents: ${JSON.stringify(packedPaths)}`);
    }
    console.log(`npm pack --dry-run files: ${JSON.stringify(packedPaths)}`);

    const pack = parsePackResult(
      await run([
        "npm",
        "pack",
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        temporaryRoot,
        "--cache",
        npmCache,
      ]),
    );
    const extractedRoot = join(temporaryRoot, "extracted");
    await mkdir(extractedRoot, { recursive: true });
    await run(["tar", "-xzf", join(temporaryRoot, pack.filename), "-C", extractedRoot]);

    const consumerRoot = join(temporaryRoot, "consumer");
    const installedPackage = join(consumerRoot, "node_modules/@topsort/verification");
    await mkdir(dirname(installedPackage), { recursive: true });
    await rename(join(extractedRoot, "package"), installedPackage);
    await symlink(
      join(repositoryRoot, "node_modules/react"),
      join(consumerRoot, "node_modules/react"),
    );
    await write(join(consumerRoot, "package.json"), '{"private":true,"type":"module"}\n');
    await write(
      join(consumerRoot, "base.mjs"),
      `if (typeof window !== "undefined" || typeof document !== "undefined") {
  throw new Error("SSR fixture unexpectedly has browser globals");
}
const entry = await import("@topsort/verification");
if (typeof entry.createVerificationRuntime !== "function") throw new Error("base export missing");
`,
    );
    await write(
      join(consumerRoot, "react.mjs"),
      `const entry = await import("@topsort/verification/react");
if (typeof entry.useVerificationRef !== "function") throw new Error("React subpath export missing");
`,
    );

    await run(["bun", "run", "base.mjs"], consumerRoot);
    await run(["bun", "run", "react.mjs"], consumerRoot);
    console.log("packed artifact imports: base SSR-safe; React subpath resolved");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
