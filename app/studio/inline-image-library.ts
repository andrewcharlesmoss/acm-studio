import { listMediaLibrary } from "./media-store";

/** Studio and Templates share this reader; other editors supply their own capability. */
export async function loadStoredInlineImages() {
  const library = await listMediaLibrary();
  return library.assets.filter(asset => asset.type.startsWith("image/"));
}
