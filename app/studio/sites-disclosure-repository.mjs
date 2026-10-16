import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { readSitesDisclosure, sitesDisclosureKey, validSitesDisclosure } from "./sites-disclosure-contract.mjs";
import { saveSitesDisclosureThroughOwner } from "./sites-disclosure-broker.mjs";
export { sitesDisclosureKey } from "./sites-disclosure-contract.mjs";

let latestSave = Promise.resolve({ saved: true });
/** Full-page context switches must not outrun a preference acknowledgement. */
export async function flushSitesDisclosureSaves() {
  let observed;
  do {
    observed = latestSave;
    if (!(await observed).saved) return false;
  } while (observed !== latestSave);
  return true;
}

export function createSitesDisclosureRepository(options) {
  const local = createStudioPreferenceRepository({ ...options, key: sitesDisclosureKey, read: readSitesDisclosure, validate: validSitesDisclosure });
  let queue = Promise.resolve();
  return {
    read: local.read,
    save(mode) {
      const result = queue.then(async () => {
        const result = await local.save(mode);
        if (result.saved || result.reason !== "blocked") return result;
        try { return await saveSitesDisclosureThroughOwner(mode); }
        catch { return { saved: false, reason: "owner-unavailable" }; }
      });
      latestSave = result;
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
