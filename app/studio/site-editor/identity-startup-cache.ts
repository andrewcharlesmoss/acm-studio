import { type IdentitySnapshot } from "./identity-repository";
import { type IdentityValues, type SiteIdentity } from "./identity-preview-state";

export const identityStartupCacheKey = "acm-studio-identity-startup-v1";
export function validateIdentityStartupCache(value: unknown): IdentitySnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid identity startup cache");
  const snapshot = value as IdentitySnapshot;
  if (Object.keys(snapshot).sort().join() !== "revision,values,version" || snapshot.version !== 1 || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1 || !snapshot.values || Object.keys(snapshot.values).sort().join() !== "global,test,test2") throw new Error("Invalid identity startup cache");
  for (const identity of Object.values(snapshot.values)) {
    if (!identity || typeof identity !== "object" || Array.isArray(identity) || Object.keys(identity).some(key => !["title", "tagline", "hidden"].includes(key))) throw new Error("Invalid identity startup cache");
    for (const field of ["title", "tagline"] as const) {
      const text = identity[field];
      if (text !== undefined && text !== null && (typeof text !== "string" || text.length > (field === "title" ? 200 : 500))) throw new Error("Invalid identity startup cache");
    }
    if (identity.hidden !== undefined && (!identity.hidden || typeof identity.hidden !== "object" || Array.isArray(identity.hidden) || Object.entries(identity.hidden).some(([key, hidden]) => !["title", "tagline", "logo", "icon"].includes(key) || typeof hidden !== "boolean"))) throw new Error("Invalid identity startup cache");
  }
  return snapshot;
}
export function readIdentityStartupCache(storage: Pick<Storage, "getItem">): IdentitySnapshot | null {
  try {
    const text = storage.getItem(identityStartupCacheKey);
    return text === null || text.length > 20000 ? null : validateIdentityStartupCache(JSON.parse(text));
  } catch { return null; }
}
export function writeIdentityStartupCache(storage: Pick<Storage, "setItem">, snapshot: IdentitySnapshot) {
  const values = Object.fromEntries(Object.entries(snapshot.values).map(([scope, identity]) => {
    const text: SiteIdentity = {};
    if (identity.title !== undefined) text.title = identity.title;
    if (identity.tagline !== undefined) text.tagline = identity.tagline;
    if (identity.hidden) text.hidden = { ...identity.hidden };
    return [scope, text];
  })) as IdentityValues;
  storage.setItem(identityStartupCacheKey, JSON.stringify(validateIdentityStartupCache({ version: 1, revision: snapshot.revision, values })));
}
