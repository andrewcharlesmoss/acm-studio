export const SITE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const SITE_IMAGE_BUNDLE_MAX_BYTES = 5 * 1024 * 1024;
const namePattern = /^acm-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-([a-f0-9]{64})\.(png|jpg|webp|gif)$/;
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export function siteImageName(mediaId, digest, type) {
  const extension = extensions[type];
  const name = `acm-${mediaId}-${digest}.${extension}`;
  if (!extension || !namePattern.test(name)) throw new Error("Choose a PNG, JPEG, WebP or GIF featured image.");
  return name;
}

export function parseSiteImageName(name) {
  const match = typeof name === "string" ? name.match(namePattern) : null;
  return match ? { name, mediaId: match[1], digest: match[2], extension: match[3], type: Object.keys(extensions).find(type => extensions[type] === match[3]) } : null;
}

export function siteImageNames(value) {
  const names = new Set();
  function visit(item) {
    if (!item || typeof item !== "object") return;
    if (typeof item.src === "string" && item.src.startsWith("/media/")) {
      const name = item.src.slice(7);
      if (parseSiteImageName(name)) names.add(name);
    }
    for (const child of Object.values(item)) if (typeof child === "object") visit(child);
  }
  visit(value);
  return [...names].sort();
}

export function siteImageSignature(bytes, extension) {
  if (!bytes.length || bytes.length > SITE_IMAGE_MAX_BYTES) return false;
  if (extension === "png") return bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte) && String.fromCharCode(...bytes.slice(12,16)) === "IHDR";
  if (extension === "jpg") return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  if (extension === "webp") return bytes.length >= 16 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return extension === "gif" && bytes.length >= 13 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0,6)));
}
