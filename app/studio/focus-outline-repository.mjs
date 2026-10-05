import { StudioWriteOwnership, studioWriteOwnership } from "./write-ownership.ts";

export const focusOutlinePreferenceKey = "acm-studio-focus-outline-v1";
export const focusOutlineModes = ["on", "off", "keyboard"];
export function readFocusOutlinePreference(storage) {
  const value = storage.getItem(focusOutlinePreferenceKey);
  return focusOutlineModes.includes(value) ? value : "keyboard";
}

/** This repository writes only the preference, under Studio's existing lock. */
export function createFocusOutlineRepository({ storage, ownership = studioWriteOwnership, locks = globalThis.navigator?.locks }) {
  let queue = Promise.resolve();
  async function save(mode) {
    if (!focusOutlineModes.includes(mode)) return { saved: false, reason: "invalid" };
    try {
      if (ownership.canWrite()) {
        await ownership.write(async () => {
          readFocusOutlinePreference(storage);
          storage.setItem(focusOutlinePreferenceKey, mode);
        });
        return { saved: true };
      }
      if (!locks) return { saved: false, reason: "unavailable" };
      return await locks.request("acm-studio-writer-v1", { mode: "exclusive", ifAvailable: true }, async lock => {
        if (!lock) return { saved: false, reason: "blocked" };
        const temporary = new StudioWriteOwnership();
        // The outer request already owns the real lock. The coordinator owns
        // this bounded operation and drains its writes before we release it.
        const claimedLocks = { request: (_name, _options, callback) => callback(lock) };
        let release;
        const result = await new Promise(resolve => {
          release = temporary.acquire(token => {
            try {
              readFocusOutlinePreference(storage);
              temporary.loaded(token, true);
              void temporary.write(async () => storage.setItem(focusOutlinePreferenceKey, mode))
                .then(() => resolve({ saved: true }), () => resolve({ saved: false, reason: "storage" }));
            } catch {
              temporary.loaded(token, false);
              resolve({ saved: false, reason: "storage" });
            }
          }, claimedLocks);
        });
        release();
        temporary.dispose();
        return result;
      });
    } catch { return { saved: false, reason: "storage" }; }
  }
  return {
    read: () => readFocusOutlinePreference(storage),
    save(mode) {
      const result = queue.then(() => save(mode));
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
