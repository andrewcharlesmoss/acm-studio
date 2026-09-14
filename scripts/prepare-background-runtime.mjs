import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve("onnxruntime-web"));
const target = new URL("../public/background-removal-runtime/v1.30.0/", import.meta.url);
await mkdir(target, { recursive: true });
// Serve the upstream runtime verbatim. Vite's rewritten dynamic imports pull
// its window-dependent HMR client into a worker during local development.
for (const file of ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  await copyFile(join(runtime, file), new URL(file, target));
}
