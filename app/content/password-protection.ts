import type { StudioPasswordProtection } from "../studio/editor-model";

/** Self-contained so static local previews run the same verifier after bundling. */
function passwordAlgorithm() {
  const iterations = 180_000;
  function base64ToBytes(value: string) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }
  async function derive(password: string, salt: Uint8Array) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt).buffer as ArrayBuffer, iterations }, key, 256));
  }
  async function verify(password: string, protection: StudioPasswordProtection) {
    try {
      const expected = base64ToBytes(protection.hash);
      const actual = await derive(password, base64ToBytes(protection.salt));
      if (actual.length !== expected.length) return false;
      let difference = 0;
      for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
      return difference === 0;
    } catch { return false; }
  }
  return { derive, verify };
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export async function createPasswordProtection(password: string): Promise<StudioPasswordProtection> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: bytesToBase64(salt), hash: bytesToBase64(await passwordAlgorithm().derive(password, salt)) };
}
export async function verifyPassword(password: string, protection: StudioPasswordProtection) {
  return passwordAlgorithm().verify(password, protection);
}
/** The static local fixture uses exactly the same browser-only verifier. */
export function passwordVerificationScript() {
  return `const verifyPassword = (${passwordAlgorithm.toString()})().verify;`;
}
