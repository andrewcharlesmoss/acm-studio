import { StudioWriteOwnership, studioWriteOwnership } from "../../write-ownership.ts";

export function createSharedStylesClient({ fetcher = globalThis.fetch, ownership = studioWriteOwnership, locks = globalThis.navigator?.locks, scope = "website" } = {}) {
  if (!["website", "interface"].includes(scope)) throw new Error("Unsupported shared styles scope.");
  let uncertain = false;
  async function request(input, token) {
    const response = await fetcher("/__studio/shared-styles", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", ...(token ? { "X-Studio-Styles-Token": token } : {}) },
      body: JSON.stringify(input), cache: "no-store",
    });
    let result;
    try { result = await response.json(); } catch { throw new Error("Source saving is available only in the local development Studio."); }
    if (!response.ok) throw new Error(result.error || "The source could not be loaded or saved.");
    if (!result.preset || typeof result.source?.document !== "string" || !/^[a-f0-9]{64}$/.test(result.revision) || !/^[a-f0-9]{64}$/.test(result.token)) throw new Error("The source response could not be verified.");
    return result;
  }
  async function ownedSave(operation) {
    if (ownership.canWrite()) return ownership.write(operation);
    if (!locks) throw new Error("This browser cannot coordinate safe saving.");
    return locks.request("acm-studio-writer-v1", { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) throw new Error("Another Studio tab owns saving. Close that editor or save shared styles from its window.");
      const temporary = new StudioWriteOwnership();
      let release;
      try {
        return await new Promise((resolve, reject) => {
          release = temporary.acquire(token => {
            temporary.loaded(token, true);
            void temporary.write(operation).then(resolve, reject);
          }, { request: (_name, _options, callback) => callback(lock) });
        });
      } finally { release?.(); temporary.dispose(); }
    });
  }
  return {
    async load(token) { const result = await request(scope === "website" ? { action: "load" } : { action: "load", scope }, token); uncertain = false; return result; },
    save(preset, state) {
      if (uncertain) return Promise.reject(new Error("The previous save could not be confirmed. Reload Source to check the files before saving again."));
      return ownedSave(async () => {
        // Ownership is held across the fresh read, revision comparison and save.
        const current = await request(scope === "website" ? { action: "load" } : { action: "load", scope }, state.token);
        if (current.revision !== state.revision) throw new Error("STYLE_GUIDE.md changed. Your draft is preserved. Reload Source before saving.");
        uncertain = true;
        const saved = await request({ action: "save", ...(scope === "website" ? {} : { scope }), preset, revision: state.revision }, current.token);
        uncertain = false;
        return saved;
      });
    },
  };
}
