import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const TEST_MODULE_QUERY = "studio-test-module";

export function resolveSource(specifier, importer) {
  const raw = specifier.endsWith("?raw");
  const name = raw ? specifier.slice(0, -4) : specifier;
  const base = path.resolve(path.dirname(importer), name);
  const candidates = path.extname(base) === ".ts" ? [base, `${base}x`]
    : path.extname(base) ? [base] : [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`];
  return { filename: candidates.find(existsSync) ?? candidates[0], raw };
}

export const rawModule = filename => ({ __esModule: true, default: readFileSync(filename, "utf8") });
