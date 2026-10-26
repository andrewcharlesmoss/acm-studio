import { listMediaLibrary } from "./media-store";
import { isSafeManagedImageType } from "../content/image-source";

/** Studio and Templates share this reader; other editors supply their own capability. */
export async function loadStoredInlineImages() {
  const library = await listMediaLibrary();
  return library.assets.filter(asset => isSafeManagedImageType(asset.type) && isSafeManagedImageType(asset.blob.type));
}
