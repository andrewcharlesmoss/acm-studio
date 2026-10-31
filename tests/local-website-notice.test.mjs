import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateProductionModule, loadProductionModule } from "./production-module.mjs";

const { createStudioPreferenceRepository } = await loadProductionModule(new URL("../app/studio/studio-preference-repository.mjs", import.meta.url));

test("local website notice dismissal survives hook remounts and route changes", async () => {
  const storageValues = new Map();
  const listeners = new Map();
  const storage = {
    getItem: key => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, String(value)),
  };
  const window = {
    localStorage: storage,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    dispatchEvent: event => listeners.get(event.type)?.(event),
  };
  let currentSlots;
  let effect;
  const react = {
    useState(initial) {
      const index = currentSlots.length;
      currentSlots.push(initial);
      return [currentSlots[index], value => { currentSlots[index] = typeof value === "function" ? value(currentSlots[index]) : value; }];
    },
    useEffect(callback) { effect = callback; },
  };
  const source = await readFile(new URL("../app/studio/controls/use-local-website-notice.ts", import.meta.url), "utf8");
  const exports = {};
  evaluateProductionModule(source, {
    exports,
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier.endsWith("studio-preference-repository.mjs")) return {
        createStudioPreferenceRepository: options => createStudioPreferenceRepository({
          ...options,
          ownership: { canWrite: () => true, write: operation => operation() },
        }),
      };
      if (specifier.endsWith("studio-preference-broker.mjs")) return { saveStudioPreferenceThroughOwner: async () => ({ saved: false }) };
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    window,
    Event,
    navigator: { locks: undefined },
  });

  const mount = () => {
    currentSlots = [];
    effect = undefined;
    const state = exports.useLocalWebsiteNotice();
    effect?.();
    return state;
  };
  let [dismissed, dismiss] = mount();
  assert.equal(dismissed, true, "the notice starts hidden until its saved preference loads");
  assert.equal(currentSlots[0], false, "an unset preference shows the notice after mount");
  await dismiss();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(storage.getItem("acm-studio-local-website-notice-dismissed-v1"), "true");
  assert.equal(currentSlots[0], true);

  [dismissed] = mount();
  assert.equal(currentSlots[0], true, "a newly mounted route reads the saved dismissal");
  assert.equal(listeners.has("acm-studio-local-website-notice-saved"), true);
});
