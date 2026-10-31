import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** Build/test source resolution; hosted checkouts retain the sibling source input. */
export function governanceSourceRoot(projectRoot) {
  if (process.env.STUDIO_GOVERNANCE_PATH) return path.resolve(process.env.STUDIO_GOVERNANCE_PATH);
  const canonical = path.join(homedir(), "Documents", "Codex", "_Projects", "workspace-governance");
  return existsSync(path.join(canonical, "STYLE_GUIDE.md")) ? canonical : path.resolve(projectRoot, "../workspace-governance");
}
