import { parseBlob } from "music-metadata";
import { summariseMediaFile, type MediaMetadataResult } from "./media-file-metadata";

globalThis.onmessage = async ({ data: blob }: MessageEvent<Blob>) => {
  let result: MediaMetadataResult = { metadata: null };
  try {
    const parsed = await parseBlob(blob, {
      duration: true,
      skipCovers: true,
      maxMemoryAllocation: 2 * 1024 * 1024,
      maxMetadataEntries: 2048,
    });
    result = { metadata: summariseMediaFile(parsed) };
  } catch {
    // The file details panel still shows the name, type, and size.
  }
  globalThis.postMessage(result);
};
