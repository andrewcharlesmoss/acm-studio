import test from "node:test";
import assert from "node:assert/strict";
import { createFocusOutlineRepository, focusOutlinePreferenceKey, readFocusOutlinePreference } from "../app/studio/focus-outline-repository.mjs";

function fixture({ denied = false, writable = false, readFailure = false, writeFailure = false } = {}) {
  const values = new Map();
  const calls = [];
  let held = false;
  const storage = {
    getItem(key) { calls.push("read"); if (readFailure) throw Error("unavailable"); return values.get(key) ?? null; },
    setItem(key, value) { assert.ok(held || writable); calls.push(`write:${value}`); if (writeFailure) throw Error("unavailable"); values.set(key, value); },
  };
  const ownership = { canWrite: () => writable, async write(operation) { calls.push("owner-write"); return operation(); } };
  const locks = { async request(name, options, callback) {
    assert.equal(name, "acm-studio-writer-v1");
    assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
    calls.push("claim");
    if (denied) return callback(null);
    assert.equal(held, false);
    held = true;
    try { return await callback({ name }); } finally { held = false; calls.push("release"); }
  } };
  return { values, calls, storage, ownership, locks, held: () => held };
}

test("focus preference reads accept only enumerated modes and default safely", () => {
  const fixtureValue = fixture();
  for (const value of [null, "bad", '{"mode":"off"}']) {
    fixtureValue.values.set(focusOutlinePreferenceKey, value);
    assert.equal(readFocusOutlinePreference(fixtureValue.storage), "keyboard");
  }
  for (const value of ["on", "off", "keyboard"]) {
    fixtureValue.values.set(focusOutlinePreferenceKey, value);
    assert.equal(readFocusOutlinePreference(fixtureValue.storage), value);
  }
});

test("library preference claims the Studio lock, loads first and releases after saving", async () => {
  const f = fixture();
  assert.deepEqual(await createFocusOutlineRepository(f).save("off"), { saved: true });
  assert.deepEqual(f.calls, ["claim", "read", "write:off", "release"]);
  assert.equal(f.held(), false);
  assert.equal(f.values.get(focusOutlinePreferenceKey), "off");
});

test("existing workspace writer saves through its coordinator without another claim", async () => {
  const f = fixture({ writable: true });
  await createFocusOutlineRepository(f).save("on");
  assert.deepEqual(f.calls, ["owner-write", "read", "write:on"]);
});

test("denied, unavailable and invalid saves never write or hang", async () => {
  const f = fixture({ denied: true });
  const repository = createFocusOutlineRepository(f);
  assert.deepEqual(await repository.save("off"), { saved: false, reason: "blocked" });
  assert.deepEqual(await repository.save("invalid"), { saved: false, reason: "invalid" });
  assert.deepEqual(f.calls, ["claim"]);
  assert.deepEqual(await createFocusOutlineRepository({ ...f, locks: null }).save("off"), { saved: false, reason: "unavailable" });
});

test("storage failure releases ownership and failed initial load cannot save", async () => {
  for (const failure of ["readFailure", "writeFailure"]) {
    const f = fixture({ [failure]: true });
    assert.deepEqual(await createFocusOutlineRepository(f).save("off"), { saved: false, reason: "storage" });
    assert.equal(f.held(), false);
    assert.equal(f.calls.at(-1), "release");
    if (failure === "readFailure") assert.equal(f.calls.some(call => call.startsWith("write:")), false);
  }
});

test("rapid choices save in order and the newest preference survives reload", async () => {
  const f = fixture();
  const repository = createFocusOutlineRepository(f);
  await Promise.all([repository.save("on"), repository.save("off"), repository.save("keyboard")]);
  assert.deepEqual(f.calls.filter(call => call.startsWith("write:")), ["write:on", "write:off", "write:keyboard"]);
  assert.equal(createFocusOutlineRepository(f).read(), "keyboard");
  assert.equal(f.held(), false);
});
