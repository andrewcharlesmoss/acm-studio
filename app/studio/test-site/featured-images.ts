import { parseSiteImageName, siteImageName, siteImageNames, siteImageSignature, SITE_IMAGE_MAX_BYTES, SITE_IMAGE_BUNDLE_MAX_BYTES } from "../../content/site-featured-image.mjs";
import { getMediaAsset, listMediaLibrary, type MediaAsset } from "../media-store";
import { submitMediaCommand } from "../media-sync";
import type { LocalFixtureSiteId } from "./sites";

export type SiteImageAttachment = { name: string; dataBase64: string };
const digestOf = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>)), byte => byte.toString(16).padStart(2, "0")).join("");
function encode(bytes: Uint8Array) {
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) text += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(text);
}
export async function portableFeaturedImage(asset: MediaAsset, alt: string) {
  if (asset.blob.size > SITE_IMAGE_MAX_BYTES) throw new Error("Choose a featured image smaller than 2 MiB.");
  const bytes = new Uint8Array(await asset.blob.arrayBuffer());
  const name = siteImageName(asset.id, await digestOf(bytes), asset.type);
  if (!siteImageSignature(bytes, parseSiteImageName(name)!.extension)) throw new Error("This featured image does not contain supported image data.");
  return { src: `/media/${name}`, alt };
}
export function siteImagePreviewUrls(value: unknown, siteId: LocalFixtureSiteId | "global"): Record<string, string> {
  return Object.fromEntries(siteImageNames(value).map(name => [`/media/${name}`, `/__studio/site-media/${siteId}/${name}`]));
}
async function imageBytes(name: string, siteId: LocalFixtureSiteId | "global") {
  const parsed = parseSiteImageName(name)!;
  const response = await fetch(`/__studio/site-media/${siteId}/${name}`, { cache: "no-store" });
  if (response.ok) {
    const length = Number(response.headers.get("Content-Length"));
    if (length > SITE_IMAGE_MAX_BYTES) throw new Error("The saved featured image exceeds its size limit.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (siteImageSignature(bytes, parsed.extension) && await digestOf(bytes) === parsed.digest) return { bytes, saved: true };
    throw new Error("The saved featured image changed. Its reference was preserved.");
  }
  if (response.status !== 404) throw new Error("The saved featured image could not be checked. Try again when the local connection is available.");
  let asset = await getMediaAsset(parsed.mediaId);
  let bytes = asset ? new Uint8Array(await asset.blob.arrayBuffer()) : null;
  if (!bytes || await digestOf(bytes) !== parsed.digest) {
    asset = (await listMediaLibrary()).assets.find(item => item.name === name);
    bytes = asset ? new Uint8Array(await asset.blob.arrayBuffer()) : null;
  }
  if ((!bytes || await digestOf(bytes) !== parsed.digest) && siteId === "global") {
    // The former identity owner retained independent bytes after Files deletion.
    // Read that authoritative recovery record; never replace real site identities.
    const { createIdentityStore } = await import("../site-editor/identity-repository");
    const retained = await createIdentityStore(window.indexedDB).read();
    for (const image of [retained?.values.global.logo,retained?.values.global.icon]) {
      if (image?.id !== parsed.mediaId) continue;
      const candidate = new Uint8Array(await image.blob.arrayBuffer());
      if (await digestOf(candidate) === parsed.digest) { bytes = candidate; break; }
    }
  }
  if (!bytes || !siteImageSignature(bytes, parsed.extension) || await digestOf(bytes) !== parsed.digest) throw new Error("The selected featured image changed or is unavailable. Choose it again; your draft was preserved.");
  return { bytes, saved: false };
}
export async function collectSiteImages(value: unknown, siteId: LocalFixtureSiteId | "global", includeSaved = false): Promise<SiteImageAttachment[]> {
  const attachments: SiteImageAttachment[] = [];
  let total = 0;
  const names = siteImageNames(value);
  if (includeSaved && names.length > 32) throw new Error("Featured image backups are limited to 32 images.");
  for (const name of names) {
    const { bytes, saved } = await imageBytes(name, siteId);
    if (saved && !includeSaved) continue;
    total += bytes.length;
    if (total > SITE_IMAGE_BUNDLE_MAX_BYTES) throw new Error("Featured image transfers are limited to 5 MiB per operation.");
    attachments.push({ name, dataBase64: encode(bytes) });
  }
  return attachments;
}
export async function stageSiteImages(value: unknown, source: unknown) {
  if (!Array.isArray(value) || value.length > 32) throw new Error("The featured image backup is invalid.");
  const referenced = new Set(siteImageNames(source));
  const names = new Set<string>();
  let total = 0;
  const files = [];
  for (const item of value) {
    const parsed = parseSiteImageName(item?.name);
    if (!parsed || names.has(parsed.name) || !referenced.has(parsed.name) || typeof item.dataBase64 !== "string" || item.dataBase64.length > SITE_IMAGE_MAX_BYTES * 1.4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.dataBase64)) throw new Error("The featured image backup is invalid.");
    const bytes = Uint8Array.from(atob(item.dataBase64), character => character.charCodeAt(0));
    total += bytes.length;
    if (total > SITE_IMAGE_BUNDLE_MAX_BYTES || encode(bytes) !== item.dataBase64 || !siteImageSignature(bytes, parsed.extension) || await digestOf(bytes) !== parsed.digest) throw new Error("The featured image backup contains invalid image data.");
    names.add(parsed.name);
    files.push({ id: crypto.randomUUID(), name: parsed.name, type: parsed.type!, blob: new Blob([bytes], { type: parsed.type }) });
  }
  if (names.size !== referenced.size) throw new Error("The backup does not include every referenced featured image.");
  if (files.length) await submitMediaCommand({ kind: "upload", folderId: null, createdAt: new Date().toISOString(), files });
}
