import { loadProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";

import test from "node:test";

const { createPasswordProtection, verifyPassword } = await loadProductionModule(new URL("../app/content/password-protection.ts", import.meta.url));

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
