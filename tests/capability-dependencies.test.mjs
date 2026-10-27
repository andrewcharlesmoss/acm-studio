import assert from "node:assert/strict";
import test from "node:test";
import { blockCapabilityProfiles, capabilityProfileFor, navigationCapabilityProfile } from "../app/studio/blocks/capability-profiles.ts";

test("every conditional capability identifies its controlling field or editor context", () => {
  for (const profile of Object.values(blockCapabilityProfiles)) {
    for (const control of profile.controls) {
      if (control.availableWhen) assert.ok(control.dependency, `${profile.type}:${control.id}`);
    }
    for (const nested of profile.nestedProfiles ?? []) {
      for (const control of nested.controls) {
        if (control.availableWhen) assert.ok(control.dependency, `${profile.type}/${nested.type}:${control.id}`);
      }
    }
  }
});

test("Group wrapping and content width depend on layout", () => {
  const group = capabilityProfileFor("group");
  const wrapping = group.controls.find(control => control.id === "wrapping");
  const width = group.controls.find(control => control.id === "content-width");
  assert.equal(wrapping.dependency, "layout");
  assert.equal(wrapping.availableWhen, "When the layout is Row.");
  assert.equal(width.dependency, "layout");
  assert.equal(width.availableWhen, "When the layout is Group.");
  assert.equal(width.source, "gutenberg");
});

test("Columns preset availability describes the pending editor choice", () => {
  const columns = capabilityProfileFor("columns");
  const preset = columns.controls.find(control => control.id === "preset");
  assert.equal(preset.dependency, "pending-columns-layout");
  assert.equal(preset.availableWhen, "When this newly inserted Columns block has a pending layout choice.");
  assert.equal(preset.placement, "canvas");
  assert.deepEqual(preset.fields, ["children"]);
  assert.equal(columns.dependencies.some(dependency => dependency.id === "pending-columns-layout"), false);
});

test("Navigation link controls declare their selected-entry context", () => {
  const link = navigationCapabilityProfile.controls.find(control => control.id === "link");
  assert.equal(link.dependency, "selected-navigation-entry");
  assert.equal(link.availableWhen, "A menu entry is selected.");
  assert.ok(link.fields.every(field => field.startsWith("TemplateSet.navigation[].")));
});

test("variation reset removes only registered classes; Advanced class reset remains complete", async () => {
  const { resetInspectorStyleFields } = await import('../app/studio/blocks/capability-profiles.ts');
  const controls = capabilityProfileFor('paragraph').controls;
  const style = { className: 'custom is-style-display extra', color: '#123456' };
  assert.deepEqual(resetInspectorStyleFields(style, ['style-variation'], controls), { className: 'custom extra', color: '#123456' });
  const classControl = controls.find(control => control.id !== 'style-variation' && control.resetFields.includes('className'));
  assert.ok(classControl);
  assert.deepEqual(resetInspectorStyleFields(style, ['style-variation', classControl.id], controls), { color: '#123456' });
  assert.equal(style.className, 'custom is-style-display extra');
});
