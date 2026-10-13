import { createHash } from "node:crypto";
import { parseSiteImageName, siteImageNames, siteImageSignature, SITE_IMAGE_MAX_BYTES, SITE_IMAGE_BUNDLE_MAX_BYTES } from "../app/content/site-featured-image.mjs";

export function checkedSiteImages(document, attachments = []) {
  if (!Array.isArray(attachments) || attachments.length > 32) throw new Error("The featured image transfer is invalid.");
  const referenced = new Set(siteImageNames(document));
  const images = new Map();
  let total = 0;
  for (const item of attachments) {
    const parsed = parseSiteImageName(item?.name);
    if (!parsed || !referenced.has(parsed.name) || images.has(parsed.name) || Object.keys(item).sort().join() !== "dataBase64,name" || typeof item.dataBase64 !== "string" || item.dataBase64.length > SITE_IMAGE_MAX_BYTES * 1.4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.dataBase64)) throw new Error("The featured image transfer is invalid.");
    const bytes = Buffer.from(item.dataBase64, "base64");
    total += bytes.length;
    if (total > SITE_IMAGE_BUNDLE_MAX_BYTES || bytes.toString("base64") !== item.dataBase64 || !siteImageSignature(bytes, parsed.extension) || createHash("sha256").update(bytes).digest("hex") !== parsed.digest) throw new Error("The featured image transfer contains invalid image data.");
    images.set(parsed.name, bytes);
  }
  return { referenced, images };
}

export function checkedSavedSiteImage(name, bytes) {
  const parsed = parseSiteImageName(name);
  return parsed && siteImageSignature(bytes, parsed.extension) && createHash("sha256").update(bytes).digest("hex") === parsed.digest;
}
