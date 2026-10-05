import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { exportStudioJson } = await loadProductionModule(new URL("../app/studio/studio-json-export.ts", import.meta.url));

// Substitute the browser download boundary; execute the production operation.
async function downloadFixture(run, { clickThrows = false } = {}) {
  const previousDocument = globalThis.document;
  const previousTimeout = globalThis.setTimeout;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  const calls = [], timers = [];
  let blob;
  const link = { click() { calls.push({ action: "click", href: this.href, filename: this.download }); if (clickThrows) throw new Error("Download rejected"); } };
  globalThis.document = { createElement(tag) { assert.equal(tag, "a"); return link; } };
  URL.createObjectURL = value => { blob = value; return "blob:specimen-json"; };
  URL.revokeObjectURL = url => calls.push({ action: "revoke", url });
  globalThis.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return 1; };
  try { await run({ calls, timers, getBlob: () => blob }); }
  finally {
    globalThis.document = previousDocument;
    globalThis.setTimeout = previousTimeout;
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
  }
}

test("document JSON download preserves exact data, filename and MIME type", async () => {
  await downloadFixture(async ({ calls, timers, getBlob }) => {
    const value = { version: 24, document: { title: "Example", blocks: [{ type: "paragraph", text: "Portable text" }] } };
    exportStudioJson(value, "example.json");
    assert.equal(getBlob().type, "application/json");
    assert.equal(await getBlob().text(), JSON.stringify(value, null, 2));
    assert.deepEqual(calls, [{ action: "click", href: "blob:specimen-json", filename: "example.json" }, { action: "revoke", url: "blob:specimen-json" }]);
    assert.deepEqual(timers, []);
  });
});

test("template JSON download retains delayed URL cleanup", async () => {
  await downloadFixture(({ calls, timers }) => {
    exportStudioJson({ templates: [] }, "template.json", 1000);
    assert.equal(calls.length, 1);
    assert.equal(timers.length, 1); assert.equal(timers[0].delay, 1000);
    timers[0].callback();
    assert.deepEqual(calls[1], { action: "revoke", url: "blob:specimen-json" });
  });
});

test("failed download still releases its URL and propagates the error", async () => {
  await downloadFixture(({ calls }) => {
    assert.throws(() => exportStudioJson({}, "failed.json"), /Download rejected/);
    assert.equal(calls.length, 2); assert.equal(calls[1].action, "revoke");
  }, { clickThrows: true });
});
