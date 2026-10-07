// Explicit bootstrap only. Normal editing/rendering uses the shared gateway.
import { runnerImport } from "vite";
import { readFile, writeFile, realpath, lstat, rename } from "node:fs/promises";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { revisionOf, acquireTestFileGuard, checkedTestOutput, TEST_FILE_MAX_BYTES } from "./test-site-store.mjs";
const root = path.resolve(process.env.STUDIO_TEST_PATH ?? "../test");
if (await realpath(root) !== root) throw new Error("Use Test's canonical project path.");
for (const relative of ["content", "dist", "content/site.json", "dist/index.html"]) {
  const target = path.join(root, relative);
  if (await realpath(target) !== target || (await lstat(target)).isSymbolicLink()) throw new Error("Test contains an unsafe path.");
}
const releaseGuard = await acquireTestFileGuard(root);
try {
for (const name of ["state.json"]) {
  try { await lstat(path.join(root, ".studio", name)); throw new Error("Test is already initialised. Use its editor save service; bootstrap cannot overwrite it."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const oldOutput = await readFile(path.join(root, "dist/index.html"), "utf8");
const { module: { validTestSiteDocument, renderTestSite } } = await runnerImport(path.resolve("app/studio/test-site/render.tsx"), { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } });
  const source = await readFile(path.join(root, "content/site.json"), "utf8");
  if (Buffer.byteLength(source, "utf8") > TEST_FILE_MAX_BYTES) throw new Error("Test source is too large.");
  const document = JSON.parse(source);
  if (!validTestSiteDocument(document)) throw new Error("Test document is invalid.");
  const revision = revisionOf(document); const output = checkedTestOutput(renderTestSite(document, revision));
  if (await readFile(path.join(root, "content/site.json"), "utf8") !== source || await readFile(path.join(root, "dist/index.html"), "utf8") !== oldOutput) throw new Error("Test changed during bootstrap; its files were preserved.");
  await writeFile(path.join(root, ".studio/original-index.html"), oldOutput, { flag: "wx", mode: 0o600 });
  const temp = path.join(root, "dist", `index.${randomBytes(12).toString("hex")}.tmp`);
  await writeFile(temp, output, { flag: "wx", mode: 0o600 });
  if (await readFile(path.join(root, "content/site.json"), "utf8") !== source || await readFile(path.join(root, "dist/index.html"), "utf8") !== oldOutput) throw new Error("Test changed during bootstrap; the existing output was preserved.");
  await rename(temp, path.join(root, "dist/index.html"));
  await writeFile(path.join(root, ".studio/state.json"), JSON.stringify({ revision, outputHash: createHash("sha256").update(output).digest("hex") }), { flag: "wx", mode: 0o600 });
} finally { await releaseGuard(); }
