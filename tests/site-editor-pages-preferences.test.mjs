import assert from "node:assert/strict";
import test from "node:test";
import { defaultPagesView } from "../app/studio/site-editor/pages-model.mjs";
import { readPagesView, savePagesViewThroughOwner, validPagesPreferenceMode, pagesPreferenceKey, pagesPreferenceChangedEvent } from "../app/studio/site-editor/pages-preferences.mjs";
import { startStudioPreferenceHost } from "../app/studio/studio-preference-broker.mjs";

function fixture(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); values.set(key, value); } };
  let writable = true;
  const ownership = { captureWriteToken: () => "owner", canWrite: () => writable, write: async action => { if (!writable) throw new Error("not owner"); return action(); } };
  return { values, writes, storage, ownership, setWritable: value => { writable = value; } };
}

test("Pages defaults and saved view preferences are validated independently per site", () => {
  const f = fixture();
  assert.deepEqual(readPagesView(f.storage, "test"), { ...defaultPagesView, properties: [...defaultPagesView.properties] });
  f.storage.setItem(pagesPreferenceKey, JSON.stringify({ test: { ...defaultPagesView, layout: "grid" }, test2: { ...defaultPagesView, layout: "table" } }));
  assert.equal(readPagesView(f.storage, "test").layout, "grid");
  assert.equal(readPagesView(f.storage, "test2").layout, "table");
  f.storage.setItem(pagesPreferenceKey, "{broken");
  assert.equal(readPagesView(f.storage, "test").layout, "list");
  assert.equal(validPagesPreferenceMode(JSON.stringify({ siteId: "test", view: defaultPagesView })), true);
  assert.equal(validPagesPreferenceMode(JSON.stringify({ siteId: "global", view: defaultPagesView })), false);
});

test("preference owner merges Test and Test2 updates and announces each verified save", async () => {
  const f = fixture();
  const events = [];
  const stop = startStudioPreferenceHost({ ...f, notify: event => events.push(event) });
  const testView = { ...defaultPagesView, layout: "grid" };
  const test2View = { ...defaultPagesView, layout: "table", pageSize: 50 };
  try {
    assert.deepEqual(await savePagesViewThroughOwner("test", testView), { saved: true });
    assert.deepEqual(await savePagesViewThroughOwner("test2", test2View), { saved: true });
    const saved = JSON.parse(f.storage.getItem(pagesPreferenceKey));
    assert.deepEqual(saved.test, testView);
    assert.deepEqual(saved.test2, test2View);
    assert.equal(events.filter(event => event === pagesPreferenceChangedEvent).length, 2);
    assert.deepEqual(f.writes.map(([key]) => key), [pagesPreferenceKey, pagesPreferenceKey]);
  } finally { stop(); }
});
