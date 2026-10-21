import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateInterfaceStylePreset, validateUniversalStylePreset } from "../../acm-styles/src/index.ts";
import { updateStyleGuideTokensFromDraft, parseStyleGuidePresets } from "../app/studio/ui/styles/style-guide-tokens.mjs";
import { createStyleGuideSource, guideProvenance } from "./style-guide-source.mjs";

export class SharedStylesError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const hash = value => createHash("sha256").update(value).digest("hex");

// Fixed Markdown target only. The browser supplies validated draft values and a
// source revision, never a path or a second persistent preset representation.
export function createSharedStylesStore({ root, provenance = guideProvenance, replaceFile } = {}) {
  const governanceDirectory = path.join(path.dirname(root), "workspace-governance");
  const guideFile = path.join(governanceDirectory, "STYLE_GUIDE.md");
  const guard = path.join(root, "work/shared-styles.lock");
  const recovery = path.join(root, "work/shared-styles-recovery.json");
  let queue = Promise.resolve();
  let blocked = false;

  function response(state, scope) {
    return {
      preset: scope === "interface" ? state.interfacePreset : state.preset,
      revision: state.revision,
      source: state.source,
    };
  }
  async function safe(file) {
    if (await realpath(path.dirname(file)) !== path.dirname(file)) throw new SharedStylesError("The Style Guide has an unsafe file path.", 503);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new SharedStylesError("The Style Guide is not a supported regular file.", 503);
  }
  async function exists(file) {
    try { await lstat(file); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }
  async function snapshot() {
    if (blocked || await exists(recovery)) throw new SharedStylesError("Style saving needs recovery. Stop the local server and inspect work/shared-styles-recovery.json before saving again.", 503);
    await safe(guideFile);
    const guide = (await readFile(guideFile, "utf8")).replace(/\r\n/g, "\n");
    let presets;
    try { presets = parseStyleGuidePresets(guide); }
    catch (error) { throw new SharedStylesError(`STYLE_GUIDE.md could not be parsed: ${error.message}`, 503); }
    const info = provenance(governanceDirectory);
    const source = createStyleGuideSource(guide, presets.universalPreset, presets.interfacePreset, info.revision, guide !== info.committed);
    return { contents: guide, preset: presets.universalPreset, interfacePreset: presets.interfacePreset, revision: hash(guide), source };
  }
  async function atomic(value) {
    await safe(guideFile);
    const temp = `${guideFile}.${randomBytes(12).toString("hex")}.tmp`;
    try {
      const stat = await lstat(guideFile);
      await writeFile(temp, value, { flag: "wx", mode: stat.mode & 0o777 });
      await safe(guideFile);
      if (replaceFile) await replaceFile(temp, guideFile);
      else await rename(temp, guideFile);
    } finally { await unlink(temp).catch(error => { if (error.code !== "ENOENT") throw error; }); }
  }
  async function save(input) {
    const scope = input?.scope ?? "website";
    if (!input || !["website", "interface"].includes(scope) || Object.keys(input).sort().join(",") !== (Object.hasOwn(input, "scope") ? "preset,revision,scope" : "preset,revision") || typeof input.revision !== "string" || !/^[a-f0-9]{64}$/.test(input.revision)) throw new SharedStylesError("Invalid shared styles request.");
    let preset;
    try {
      if (scope === "website") {
        preset = structuredClone(validateUniversalStylePreset(input.preset));
        for (const key of Object.keys(preset.interactions)) preset.interactions[key] = preset.interactions[key].toUpperCase();
        for (const key of Object.keys(preset.palette)) preset.palette[key] = preset.palette[key].toUpperCase();
        for (const button of Object.values(preset.buttons)) for (const key of Object.keys(button)) if (typeof button[key] === "string") button[key] = button[key].toUpperCase();
      } else {
        preset = structuredClone(validateInterfaceStylePreset(input.preset));
        for (const key of Object.keys(preset.colours)) preset.colours[key] = preset.colours[key].toUpperCase();
        for (const button of Object.values(preset.buttons)) for (const key of ["background", "foreground", "border"]) button[key] = button[key].toUpperCase();
        for (const interaction of Object.values(preset.interactions)) for (const key of ["foreground", "background"]) interaction[key] = interaction[key].toUpperCase();
      }
    } catch (error) {
      if (error instanceof SharedStylesError) throw error;
      throw new SharedStylesError("The style values are invalid. No files were changed.");
    }
    await mkdir(path.dirname(guard), { recursive: true });
    if (await realpath(path.dirname(guard)) !== path.dirname(guard)) throw new SharedStylesError("The style recovery path is unsafe.", 503);
    try { await writeFile(guard, String(process.pid), { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code === "EEXIST") throw new SharedStylesError("Another local server is saving styles. If it has stopped, inspect work/shared-styles.lock before removing it.", 423); throw error; }
    try {
      const before = await snapshot();
      if (before.revision !== input.revision) throw new SharedStylesError("STYLE_GUIDE.md changed. Your draft is preserved. Reload Source before saving.", 409);
      const parsed = scope === "website"
        ? { universalPreset: preset, interfacePreset: before.interfacePreset }
        : { universalPreset: before.preset, interfacePreset: preset };
      const next = updateStyleGuideTokensFromDraft(before.source.document, parsed.universalPreset, parsed.interfacePreset);
      // Validate the exact text that will be persisted before touching the source.
      try { parseStyleGuidePresets(next); }
      catch (error) { throw new SharedStylesError(`The updated Style Guide is invalid: ${error.message}`); }
      await writeFile(recovery, JSON.stringify({ version: 1, file: guideFile, before: before.contents, after: next }, null, 2), { flag: "wx", mode: 0o600 });
      try {
        if ((await readFile(guideFile, "utf8")).replace(/\r\n/g, "\n") !== before.contents) throw new SharedStylesError("STYLE_GUIDE.md changed during saving. Your draft is preserved.", 409);
        if (next !== before.contents) await atomic(next);
        const readback = (await readFile(guideFile, "utf8")).replace(/\r\n/g, "\n");
        if (readback !== next) throw new SharedStylesError("STYLE_GUIDE.md could not be verified after saving.", 503);
        parseStyleGuidePresets(readback);
      } catch (error) {
        let restored = true;
        try {
          const current = (await readFile(guideFile, "utf8")).replace(/\r\n/g, "\n");
          if (current === next && current !== before.contents) await atomic(before.contents);
          else if (current !== before.contents) restored = false;
        } catch { restored = false; }
        if (!restored) { blocked = true; throw new SharedStylesError("Saving stopped and needs recovery. Your draft is preserved; inspect work/shared-styles-recovery.json.", 503); }
        await unlink(recovery);
        throw error;
      }
      await unlink(recovery);
      const saved = await snapshot();
      return response(saved, scope);
    } finally { await unlink(guard); }
  }
  function serial(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  return {
    load: (scope = "website") => serial(async () => response(await snapshot(), scope)),
    save: input => serial(() => save(input)),
  };
}
