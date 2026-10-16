export const sitesDisclosureKey = "acm-studio-sites-disclosure-v1";
export const sitesDisclosureChangedEvent = "acm-studio-sites-disclosure-saved-v1";
export const validSitesDisclosure = value => value === "expanded" || value === "collapsed";
export function readSitesDisclosure(storage) {
  const value = storage.getItem(sitesDisclosureKey);
  return validSitesDisclosure(value) ? value : "expanded";
}
