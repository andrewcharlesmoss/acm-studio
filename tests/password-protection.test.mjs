import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function compileModule(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    const resolved = specifier.startsWith(".") ? await compileModule(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier);
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const { createPasswordProtection, verifyPassword } = await import(await compileModule(new URL("../app/content/password-protection.ts", import.meta.url)));

test("password protection stores a salted verifier and checks the supplied password", async () => {
  const protection = await createPasswordProtection("correct horse battery staple");
  assert.notEqual(protection.hash, "correct horse battery staple");
  assert.notEqual(protection.salt, protection.hash);
  assert.equal(await verifyPassword("correct horse battery staple", protection), true);
  assert.equal(await verifyPassword("wrong password", protection), false);
});

test("the same password receives an independent salt and verifier", async () => {
  const first = await createPasswordProtection("same password");
  const second = await createPasswordProtection("same password");
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
});
