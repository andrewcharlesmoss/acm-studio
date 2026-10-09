import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateUniversalStylePreset } from "../../acm-styles/src/index.ts";
import { projectStyleGuideTokens } from "../app/studio/ui/styles/style-guide-tokens.mjs";
import { createStyleGuideSource, guideProvenance } from "./style-guide-source.mjs";

export class SharedStylesError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const hash = value => createHash("sha256").update(value).digest("hex");

export function serializeSharedStylePreset(preset) {
  // Keep the canonical file's compact responsive metrics. Saving a colour
  // should not expand every unrelated typography property.
  return `${JSON.stringify(preset, null, 2).replace(/"(size|lineHeight|letterSpacing)": \{[\s\S]*?\n {6}\}/g, match => {
    const value = JSON.parse(match.slice(match.indexOf(":") + 1));
    const metrics = Object.entries(value).map(([viewport, metric]) => `"${viewport}": { "value": ${metric.value}, "unit": "${metric.unit}" }`);
    return `${match.slice(0, match.indexOf(":") + 1)} { ${metrics.join(", ")} }`;
  })}\n`;
}

// Fixed targets only. The browser supplies values and a revision, never paths.
export function createSharedStylesStore({ root, provenance = guideProvenance, replaceFile } = {}) {
  const projects = path.dirname(root);
  const files = [
    path.join(projects, "acm-styles/src/universal-style-preset.json"),
    path.join(projects, "workspace-governance/STYLE_GUIDE.md"),
    path.join(root, "app/studio/ui/styles/style-guide-source.json"),
  ];
  const guard = path.join(root, "work/shared-styles.lock");
  const recovery = path.join(root, "work/shared-styles-recovery.json");
  let queue = Promise.resolve();
  let blocked = false;

  async function safe(file) {
    // Refuse symlinked files and parent directories, including sibling roots.
    if (await realpath(path.dirname(file)) !== path.dirname(file)) throw new SharedStylesError("Shared styles contain an unsafe file path.", 503);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new SharedStylesError("Shared styles contain an unsupported file.", 503);
  }
  async function exists(file) {
    try { await lstat(file); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }
  async function snapshot() {
    if (blocked || await exists(recovery)) throw new SharedStylesError("Shared styles need recovery. Stop the local server and inspect work/shared-styles-recovery.json before saving again.", 503);
    for (const file of files) await safe(file);
    const contents = await Promise.all(files.map(file => readFile(file, "utf8")));
    let preset;
    try { preset = validateUniversalStylePreset(JSON.parse(contents[0])); }
    catch { throw new SharedStylesError("The preset file is invalid. Its contents have been preserved.", 503); }
    const guide = contents[1].replace(/\r\n/g, "\n");
    // Check table structure even when external values have not been synced yet.
    projectStyleGuideTokens(guide, preset);
    const source = provenance(path.join(projects, "workspace-governance"));
    const indexed = createStyleGuideSource(guide, preset, source.revision, guide !== source.committed);
    const projected = projectStyleGuideTokens(guide, preset);
    const expectedBundle = `${JSON.stringify(createStyleGuideSource(projected, preset, source.revision, projected !== source.committed), null, 2)}\n`;
    return { contents, preset, revision: hash(JSON.stringify(contents)), source: indexed, needsSynchronisation: projected !== guide || expectedBundle !== contents[2] };
  }
  async function atomic(file, value) {
    await safe(file);
    const temp = `${file}.${randomBytes(12).toString("hex")}.tmp`;
    try {
      const stat = await lstat(file);
      await writeFile(temp, value, { flag: "wx", mode: stat.mode & 0o777 });
      await safe(file);
      if (replaceFile) await replaceFile(temp, file);
      else await rename(temp, file);
    } finally { await unlink(temp).catch(error => { if (error.code !== "ENOENT") throw error; }); }
  }
  async function save(input) {
    if (!input || Object.keys(input).sort().join(",") !== "preset,revision" || typeof input.revision !== "string" || !/^[a-f0-9]{64}$/.test(input.revision)) throw new SharedStylesError("Invalid shared styles request.");
    let preset;
    try {
      preset = structuredClone(validateUniversalStylePreset(input.preset));
      for (const key of Object.keys(preset.palette)) preset.palette[key] = preset.palette[key].toUpperCase();
      for (const button of Object.values(preset.buttons)) for (const key of Object.keys(button)) if (typeof button[key] === "string") button[key] = button[key].toUpperCase();
    }
    catch { throw new SharedStylesError("The style values are invalid. No files were changed."); }
    await mkdir(path.dirname(guard), { recursive: true });
    if (await realpath(path.dirname(guard)) !== path.dirname(guard)) throw new SharedStylesError("Shared styles contain an unsafe recovery path.", 503);
    try { await writeFile(guard, String(process.pid), { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code === "EEXIST") throw new SharedStylesError("Another local server is saving shared styles. If it has stopped, inspect work/shared-styles.lock before removing it.", 423); throw error; }
    try {
      const before = await snapshot();
      if (before.revision !== input.revision) throw new SharedStylesError("The source files changed. Your draft is preserved. Reload Source before saving.", 409);
      if (preset.version !== before.preset.version) throw new SharedStylesError("Style editing cannot change the preset schema version.");
      const guide = projectStyleGuideTokens(before.source.document, preset);
      const info = provenance(path.join(projects, "workspace-governance"));
      const next = [
        JSON.stringify(preset) === JSON.stringify(before.preset) ? before.contents[0] : serializeSharedStylePreset(preset), guide,
        `${JSON.stringify(createStyleGuideSource(guide, preset, info.revision, guide !== info.committed), null, 2)}\n`,
      ];
      // A durable journal preserves both states if the process stops between
      // replacements. Never infer completion from only the first file.
      await writeFile(recovery, JSON.stringify({ version: 1, files: files.map((file, index) => ({ file, before: before.contents[index], after: next[index] })) }, null, 2), { flag: "wx", mode: 0o600 });
      try {
        for (let index = 0; index < files.length; index++) {
          if (await readFile(files[index], "utf8") !== before.contents[index]) throw new SharedStylesError("A source file changed during saving.", 409);
          if (next[index] !== before.contents[index]) await atomic(files[index], next[index]);
        }
        const readback = await Promise.all(files.map(file => readFile(file, "utf8")));
        if (readback.some((value, index) => value !== next[index])) throw new SharedStylesError("Shared styles could not be verified after saving.", 503);
      } catch (error) {
        let restored = true;
        for (let index = files.length - 1; index >= 0; index--) {
          try {
            const current = await readFile(files[index], "utf8");
            if (current === next[index] && current !== before.contents[index]) await atomic(files[index], before.contents[index]);
            else if (current !== before.contents[index]) restored = false;
          } catch { restored = false; }
        }
        if (!restored) { blocked = true; throw new SharedStylesError("Saving stopped and needs recovery. Your draft is preserved; inspect work/shared-styles-recovery.json.", 503); }
        await unlink(recovery);
        throw error;
      }
      await unlink(recovery);
      const saved = await snapshot();
      return { preset: saved.preset, revision: saved.revision, source: saved.source, needsSynchronisation: saved.needsSynchronisation };
    } finally { await unlink(guard); }
  }
  function serial(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  return {
    load: () => serial(async () => { const state = await snapshot(); return { preset: state.preset, revision: state.revision, source: state.source, needsSynchronisation: state.needsSynchronisation }; }),
    save: input => serial(() => save(input)),
  };
}
