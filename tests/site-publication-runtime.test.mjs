import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { loadViteModule as runnerImport } from "./production-module.mjs";
import { rolldown } from "rolldown";
const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const load = async file => (await runnerImport(path.resolve(file), options)).module;
const { createPasswordProtection, passwordVerificationScript } = await load("app/content/password-protection.ts");
const { localPublicationScript } = await load("app/studio/test-site/publication-runtime.ts");
const globals = { crypto: webcrypto, TextEncoder, Uint8Array, atob, btoa };

test("the production minified static verifier preserves shared password hashing", async () => {
  const protection = await createPasswordProtection("disposable test password");
  const bundle = await rolldown({ input: "virtual:password", plugins: [{ name: "password-specimen", resolveId: id => id === "virtual:password" ? id : null, load: id => id === "virtual:password" ? passwordVerificationScript() + ";globalThis.check = verifyPassword;" : null }] });
  const { output } = await bundle.generate({ format: "iife", minify: true });
  const code = output.find(item => item.type === "chunk").code;
  await bundle.close();
  const context = vm.createContext(globals);
  vm.runInContext(code, context);
  assert.equal(await context.check("disposable test password", protection), true);
  assert.equal(await context.check("wrong password", protection), false);
});

test("static runtime keeps scheduled bodies inert and gates password bodies until correct unlock", async () => {
  let now = Date.parse("2026-10-14T12:00:00Z");
  const protection = await createPasswordProtection("temporary password");
  const handlers = new Map(); let tick; let revealed = 0;
  class Element {}
  class HTMLFormElement extends Element {}
  function page(id, extra = {}) {
    const value = { dataset: { testDocument: id, ...extra }, revealed: false, focused: false };
    const template = { content: { cloneNode: () => ({}) }, replaceWith: () => { value.revealed = true; } };
    const notice = { hidden: false }; const gate = { hidden: true };
    value.querySelector = selector => selector === "template[data-test-publication-body]" ? value.revealed ? null : template : selector === "[data-test-schedule-notice]" ? notice : selector === "[data-test-password-gate]" ? gate : null;
    value.focus = () => { value.focused = true; };
    return { value, notice, gate };
  }
  const scheduled = page("scheduled", { testScheduledAt: "2026-10-14T12:01:00Z" });
  const password = page("password", { testLocked: "true", testPasswordSalt: protection.salt, testPasswordHash: protection.hash });
  const links = ["scheduled", "password", "private"].map(id => ({ hidden: false, getAttribute: () => `/#document=${id}`, closest() { return this; } }));
  const document = {
    querySelectorAll: selector => selector === "[data-test-document]" ? [scheduled.value, password.value] : links,
    addEventListener: (name, handler) => handlers.set(name, handler),
    dispatchEvent: event => { if (event.type === "acm-local-publication-revealed") revealed++; },
  };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(localPublicationScript(), { ...globals, document, Date: Clock, Element, HTMLFormElement, Event: class { constructor(type) { this.type = type; } }, setInterval(callback) { tick = callback; }, dispatchEvent() {} });
  assert.equal(scheduled.value.revealed, false);
  assert.equal(links[0].hidden, true);
  assert.equal(password.value.revealed, false);
  assert.equal(password.gate.hidden, false);
  assert.equal(links[2].hidden, true);
  const input = { value: "wrong", focus() {} }; const button = { disabled: false }; const error = { textContent: "" };
  const form = new HTMLFormElement(); form.matches = () => true; form.closest = () => password.value;
  form.querySelector = selector => selector === "input" ? input : selector === "[type=submit]" ? button : error;
  let prevented = 0;
  await handlers.get("submit")({ target: form, preventDefault() { prevented++; } });
  assert.equal(error.textContent, "That password is incorrect.");
  assert.equal(password.value.revealed, false);
  input.value = "temporary password";
  await handlers.get("submit")({ target: form, preventDefault() { prevented++; } });
  assert.equal(password.value.revealed, true);
  assert.equal(password.gate.hidden, true);
  assert.equal(password.value.focused, true);
  assert.equal(input.value, "");
  now += 60_000; tick();
  assert.equal(scheduled.value.revealed, true);
  assert.equal(scheduled.notice.hidden, true);
  assert.equal(links[0].hidden, false);
  assert.equal(revealed, 2);
  assert.equal(prevented, 2);
});
