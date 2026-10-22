import { studioWriteOwnership } from '../write-ownership';
import { readIdentityStartupCache, writeIdentityStartupCache } from './identity-startup-cache';
import type { IdentityValues } from './identity-preview-state';
export const websiteDesignStartupKey = 'acm-studio-website-design-startup-v1';
export function readWebsiteDesignStartup() {
  try { return readIdentityStartupCache({getItem:()=>window.localStorage.getItem(websiteDesignStartupKey)})?.values ?? null; } catch { return null; }
}
/** Display-only metadata is refreshed only inside a successful owned gateway read/write. */
export function refreshWebsiteDesignStartup(value: unknown) {
  if (!studioWriteOwnership.canWrite() || !value || typeof value !== 'object' || !('identityValues' in value)) return;
  try {
    writeIdentityStartupCache({setItem:(_key,text)=>window.localStorage.setItem(websiteDesignStartupKey,text)}, {version:1,revision:Date.now(),values:value.identityValues as IdentityValues});
  } catch { /* A cache failure never invalidates the canonical save. */ }
}
