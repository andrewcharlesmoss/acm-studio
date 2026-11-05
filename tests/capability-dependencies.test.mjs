import assert from "node:assert/strict";
import test from "node:test";
import { blockCapabilityProfiles, capabilityProfileFor, navigationCapabilityProfile, retainedLegacyStyleControls } from "../app/studio/blocks/capability-profiles.ts";

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
  assert.equal(group.controls.find(control => control.id === "grid-item-sizing").dependency, "parent-grid-layout");
});

test("control descriptions and availability identify their separate purposes", () => {
  const crop = capabilityProfileFor("image").controls.find(item => item.id === "crop");
  assert.ok(crop.description);
  assert.equal(crop.dependency, "source");
  assert.equal(crop.availableWhen, "When the image source resolves.");
  for (const [type, id] of [["cover", "video-background"], ["cover", "native-video-source"]]) {
    const control = capabilityProfileFor(type).controls.find(item => item.id === id);
    assert.ok(control.description);
    assert.equal(control.availableWhen, undefined);
  }
  const retained = retainedLegacyStyleControls(capabilityProfileFor("image"), { textColor: "#123456" });
  assert.ok(retained.length);
  assert.ok(retained.every(control => control.dependency === "retained-style-value"));
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

test("Featured Image records Duotone as a supported Gutenberg Filters control", () => {
  const featuredImage = capabilityProfileFor("cover-image");
  assert.deepEqual(featuredImage.controls.find(control => control.id === "duotone").fields, ["duotone"]);
  assert.equal(featuredImage.controls.find(control => control.id === "duotone").source, "gutenberg");
  assert.equal(featuredImage.unsupported.some(item => /Duotone/.test(item)), false);
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
test('Image and Cover crop inventory maps the canonical toolbar edit', () => {
  for (const type of ['image', 'cover']) {
    const crop = capabilityProfileFor(type).controls.find(control => control.id === 'crop');
    assert.deepEqual(crop.fields, ['imageEdit']);
    assert.deepEqual(crop.resetFields, ['imageEdit']);
    assert.equal(crop.placement, 'canvas');
    assert.equal(crop.dependency, 'source');
  }
});
