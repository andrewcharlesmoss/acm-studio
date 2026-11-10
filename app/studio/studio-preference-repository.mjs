import { StudioWriteOwnership, studioWriteOwnership } from "./write-ownership.ts";

/** This repository writes only the preference, under Studio's existing lock. */
export function createStudioPreferenceRepository({ storage, key, read, validate, ownership = studioWriteOwnership, locks = globalThis.navigator?.locks }) {
  let queue = Promise.resolve();
  async function save(mode) {
    if (!validate(mode)) return { saved: false, reason: "invalid" };
    try {
      if (ownership.canWrite()) {
        await ownership.write(async () => {
          read(storage);
          storage.setItem(key, mode);
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
              read(storage);
              temporary.loaded(token, true);
              void temporary.write(async () => storage.setItem(key, mode))
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
  async function update(transform) {
    try {
      const writeLatest = async () => {
        const mode = transform(read(storage));
        if (!validate(mode)) return { saved: false, reason: "invalid" };
        storage.setItem(key, mode);
        return { saved: true, value: mode };
      };
      if (ownership.canWrite()) return await ownership.write(writeLatest);
      if (!locks) return { saved: false, reason: "unavailable" };
      return await locks.request("acm-studio-writer-v1", { mode: "exclusive", ifAvailable: true }, async lock => {
        if (!lock) return { saved: false, reason: "blocked" };
        const temporary = new StudioWriteOwnership();
        const claimedLocks = { request: (_name, _options, callback) => callback(lock) };
        let release;
        const result = await new Promise(resolve => {
          release = temporary.acquire(token => {
            temporary.loaded(token, true);
            void temporary.write(writeLatest).then(resolve, () => resolve({ saved: false, reason: "storage" }));
          }, claimedLocks);
        });
        release();
        temporary.dispose();
        return result;
      });
    } catch { return { saved: false, reason: "storage" }; }
  }
  return {
    read: () => read(storage),
    save(mode) {
      const result = queue.then(() => save(mode));
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
    update(transform) {
      const result = queue.then(() => update(transform));
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
