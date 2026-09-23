import type { StudioPasswordProtection } from "../studio/editor-model";

const PBKDF2_ITERATIONS = 180_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt).buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS }, key, 256));
}

export async function createPasswordProtection(password: string): Promise<StudioPasswordProtection> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: bytesToBase64(salt), hash: bytesToBase64(await derivePasswordHash(password, salt)) };
}

export async function verifyPassword(password: string, protection: StudioPasswordProtection) {
  try {
    const expected = base64ToBytes(protection.hash);
    const actual = await derivePasswordHash(password, base64ToBytes(protection.salt));
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}
