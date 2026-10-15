import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";

export const sitesDisclosureKey = "acm-studio-sites-disclosure-v1";
const values = ["expanded", "collapsed"];
function read(storage) {
  const value = storage.getItem(sitesDisclosureKey);
  return values.includes(value) ? value : "expanded";
}
export function createSitesDisclosureRepository(options) {
  return createStudioPreferenceRepository({ ...options, key: sitesDisclosureKey, read, validate: value => values.includes(value) });
}
