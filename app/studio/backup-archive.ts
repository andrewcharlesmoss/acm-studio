/** Binary container v1. The checksummed JSON index precedes uncompressed Blob contents.
 * Digests cover fixed-size pieces so checking one file never buffers the whole library.
 * All offsets are implicit and the reader requires an exact, gap-free payload. */
export const BACKUP_ARCHIVE_VERSION = 1 as const;
const SIGNATURE = `ACM-STUDIO-BACKUP/${BACKUP_ARCHIVE_VERSION}\n`;
const HASH_BYTES = 32;
const CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_INDEX_BYTES = 100 * 1024 * 1024;
const HEADER_BYTES = SIGNATURE.length + 4 + HASH_BYTES;

type Part = { size: number; type: string; hashes: string[] };

async function digest(blob: Blob) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function chunkHashes(blob: Blob) {
  const hashes: string[] = [];
  for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
    hashes.push(hex(await digest(blob.slice(offset, offset + CHUNK_BYTES))));
  }
  return hashes;
}

export async function isBackupArchive(file: Blob) {
  return await file.slice(0, SIGNATURE.length).text() === SIGNATURE;
}

export async function encodeBackupArchive(content: unknown, blobs: Blob[]) {
  const parts: Part[] = [];
  for (const blob of blobs) parts.push({ size: blob.size, type: blob.type, hashes: await chunkHashes(blob) });
  const index = new Blob([JSON.stringify({ content, parts })]);
  if (index.size > MAX_INDEX_BYTES) throw new Error("The backup file index exceeds the 100 MiB metadata limit.");
  const length = new ArrayBuffer(4);
  new DataView(length).setUint32(0, index.size);
  const checksum = await digest(index);
  return new Blob([SIGNATURE, length, checksum, index, ...blobs], { type: "application/octet-stream" });
}

export async function decodeBackupArchive(file: Blob): Promise<{ content: unknown; blobs: Blob[] }> {
  if (file.size < HEADER_BYTES || !await isBackupArchive(file)) throw new Error("This Studio backup file is incomplete or unsupported.");
  const head = await file.slice(SIGNATURE.length, HEADER_BYTES).arrayBuffer();
  const length = new DataView(head).getUint32(0);
  let offset = HEADER_BYTES + length;
  if (!length || length > MAX_INDEX_BYTES || offset > file.size) throw new Error("The Studio backup file index is invalid.");
  const index = file.slice(HEADER_BYTES, offset);
  if (hex(await digest(index)) !== hex(new Uint8Array(head, 4))) throw new Error("The Studio backup file index is damaged.");
  const value = JSON.parse(await index.text());
  if (!value || !Array.isArray(value.parts)) throw new Error("The Studio backup file index is invalid.");
  const blobs = [];
  for (const part of value.parts) {
    if (!part || !Number.isSafeInteger(part.size) || part.size < 0 || part.size > file.size - offset || typeof part.type !== "string" ||
      !Array.isArray(part.hashes) || part.hashes.length !== Math.ceil(part.size / CHUNK_BYTES)) throw new Error("The Studio backup has an invalid file entry.");
    const blob = file.slice(offset, offset + part.size, part.type);
    for (let chunk = 0; chunk < part.hashes.length; chunk++) {
      if (hex(await digest(blob.slice(chunk * CHUNK_BYTES, (chunk + 1) * CHUNK_BYTES))) !== part.hashes[chunk]) throw new Error("A file in the Studio backup is damaged.");
    }
    blobs.push(blob);
    offset += part.size;
  }
  if (offset !== file.size) throw new Error("The Studio backup contains unexpected trailing data.");
  return { content: value.content, blobs };
}
