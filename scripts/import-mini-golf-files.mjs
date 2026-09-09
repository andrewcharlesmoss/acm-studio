// Capture a reviewable source/asset inventory without modifying Mini Golf.
// Output is an apply_patch patch; private files and generated output are omitted.
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const project = realpathSync(process.argv[2] ?? "../mini-golf-scorecard");
const tracked = execFileSync("git", ["-C", project, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = /(^|\/)(?:node_modules|dist|\.git|\.wrangler|\.next|coverage|\.env(?:\..*)?|\.npmrc|\.netrc|\.ssh|\.aws|\.DS_Store)(\/|$)|\.(?:pem|key|p12|pfx)$|(?:^|\/)(?:credentials?|secrets?|service[-_]?account)(?:[.\-_/]|$)/i;
const allowedRootFiles = new Set([".gitignore", ".openai/hosting.json", "AGENTS.md", "CHANGELOG.md", "README.md", "LICENSE", "package.json", "package-lock.json", "eslint.config.mjs", "next-env.d.ts", "next.config.ts", "postcss.config.mjs", "tsconfig.json", "vite.config.ts"]);
const sourceRoots = new Set(["app", "worker", "tests", "scripts", "docs"]);
const assetRoots = new Set(["public", "assets"]);
const textTypes = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css", ".html", ".txt", ".svg", ".webmanifest", ".toml", ".yaml", ".yml", ".sh"]);
const imageTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon" };
const files = [];
for (const relative of [...new Set(tracked)].sort()) {
  if (forbidden.test(relative)) continue;
  const extension = path.extname(relative).toLowerCase();
  const root = relative.split("/")[0];
  const source = sourceRoots.has(root) && textTypes.has(extension);
  const asset = assetRoots.has(root) && (textTypes.has(extension) || extension in imageTypes || [".woff", ".woff2"].includes(extension) || ["_headers", "_redirects"].includes(path.basename(relative)));
  if (!allowedRootFiles.has(relative) && !source && !asset) continue;
  const filename = path.join(project, relative);
  const stat = lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || !realpathSync(filename).startsWith(`${project}${path.sep}`)) continue;
  const text = textTypes.has(extension) || [".gitignore", "_headers", "_redirects"].includes(path.basename(relative));
  const bytes = readFileSync(filename);
  if (bytes.length > 8 * 1024 * 1024) throw new Error(`File exceeds the pilot limit: ${relative}`);
  if (text) {
    const content = bytes.toString("utf8");
    const credential = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[a-zA-Z0-9_-]{20,}|\b(?:ghp_|github_pat_|xox[baprs]-)[a-zA-Z0-9_-]{16,}|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\beyJ[a-zA-Z0-9_-]{16,}\.[a-zA-Z0-9_-]{16,}\.[a-zA-Z0-9_-]{16,}|(?:client_secret|api_key|access_token|refresh_token|password)\s*["']?\s*[:=]\s*["'][^"'\s]{24,}["']/i;
    const secretAssignment = /\b(?:[a-z0-9_]*(?:secret|token|password|api_key)|authorization|database_url)\s*["']?\s*[:=]\s*(?:["'`][^"'`$\r\n]{16,}["'`]|[a-z0-9_+/@:.=-]{24,})/i;
    const credentialUrl = /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s/:]+:[^\s/@]+@/i;
    if (credential.test(content) || secretAssignment.test(content) || credentialUrl.test(content)) {
      files.push({ path: relative, size: bytes.length, kind: "text", content: "Contents withheld: potential credential detected. Review the original file locally." });
      continue;
    }
    files.push({ path: relative, size: bytes.length, kind: "text", content });
  } else {
    files.push({ path: relative, size: bytes.length, kind: imageTypes[extension] ? "image" : "binary", mime: imageTypes[extension] ?? "application/octet-stream", data: bytes.toString("base64") });
  }
}
const snapshot = { version: 1, siteId: "mini-golf-scorecard", capturedAt: new Date().toISOString(), source: "Local project checkout", revision: execFileSync("git", ["-C", project, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), hasLocalChanges: Boolean(execFileSync("git", ["-C", project, "status", "--porcelain"], { encoding: "utf8" }).trim()), files };
const output = JSON.stringify(snapshot);
process.stdout.write(`*** Begin Patch\n*** Add File: public/site-previews/mini-golf-files.json\n+${output}\n*** End Patch\n`);
