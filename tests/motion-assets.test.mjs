import test from "node:test";
import assert from "node:assert/strict";
import { orderedSiteIds } from "../app/studio/site-order-repository.mjs";
import { dashboardToolIds } from "../app/studio/dashboard-order-contract.mjs";
import { readStudioNavigationHiddenTools, studioNavigationVisibilityKey } from "../app/studio/studio-navigation-visibility-contract.mjs";
import { motionPreset, motionGeometry, motionLottie, motionProject, motionSvg, readMotionProject } from "../app/studio/motion-assets/motion-asset.ts";
import { motionCatalogue } from "../app/studio/motion-assets/motion-catalogue.ts";

test("each catalogue sketch supports editable and portable exports", () => {
  assert.ok(motionCatalogue.length >= 20);
  for (const asset of motionCatalogue) {
    const restored = readMotionProject(motionProject(asset));
    const geometry = motionGeometry(restored);
    assert.ok(geometry.pathAt(restored.drawFrames), asset.name);
    assert.ok(motionLottie(restored).layers.length, asset.name);
    assert.match(motionSvg(restored, geometry.pathAt(restored.drawFrames)), /<svg/);
  }
});

test("multiple strokes reveal in sequence and round-trip through the versioned project", () => {
  const asset = { ...motionPreset("wave"), path: "M20 100 L300 100 M20 300 L300 300" };
  const project = motionProject(asset);
  assert.equal(project.version, "0.2.0");
  const restored = readMotionProject(JSON.parse(JSON.stringify(project)));
  const geometry = motionGeometry(restored);
  assert.equal(geometry.pathAt(0), "");
  assert.equal(geometry.pathAt(15).match(/M/g)?.length, 1);
  assert.equal(geometry.pathAt(16).match(/M/g)?.length, 2);
  assert.equal(geometry.pathAt(30), geometry.pathAt(89));
  const groups = motionLottie(restored).layers[0].shapes;
  assert.deepEqual(groups.map(group => group.it[2].e.k.map(keyframe => keyframe.t)), [[0, 15], [15, 30]]);
  assert.throws(() => readMotionProject({ ...project, version: "0.1.0" }), /multiple strokes/);
  assert.equal(motionProject(motionPreset("circle")).version, "0.1.0");
});

test("wave and oval projects round-trip the editable geometry and settings", () => {
  for (const preset of ["wave", "circle"]) {
    const asset = { ...motionPreset(preset), width: 1600, colour: "#CC00FF", drawFrames: 45, holdFrames: 72 };
    const saved = motionProject(asset);
    const restored = readMotionProject(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(restored, saved.asset);
    const geometry = motionGeometry(restored);
    assert.equal(geometry.frameCount, 117);
    assert.equal(geometry.pathAt(0), "");
    assert.notEqual(geometry.pathAt(23), geometry.pathAt(45));
    assert.equal(geometry.pathAt(45), geometry.pathAt(116));
    assert.match(motionSvg(restored, geometry.pathAt(116)), /stroke="#CC00FF" stroke-width="9"/);
    const lottie = motionLottie(restored);
    const [shape, stroke, trim] = lottie.layers[0].shapes[0].it;
    assert.equal(shape.ks.k.c, preset === "circle");
    assert.equal(stroke.w.k, 9);
    assert.equal(trim.e.k[1].t, 45);
    assert.equal(lottie.op, 117);
  }
});

test("unsafe or unusable projects are rejected before render", () => {
  const project = motionProject(motionPreset("wave"));
  for (const changes of [
    { path: 'M0 0 L12 12"><script>alert(1)</script>' },
    { path: "M0 0 L2 2 M4 4" },
    { path: "M0 0 L2 2 ".repeat(129) },
    { path: "M0 0 L0 0" },
    { path: "M0 0 C1 2 3 4 1000 1000" },
    { colour: "url(https://example.invalid)" },
    { thickness: 0 }, { width: 1920, height: 1920 }, { drawFrames: 300 },
  ]) {
    assert.throws(() => readMotionProject({ ...project, asset: { ...project.asset, ...changes } }));
  }
  assert.throws(() => readMotionProject({ ...project, version: "99.0.0" }));
});

test("existing dashboard order acquires Motion Assets without reordering saved cards", () => {
  const oldOrder = dashboardToolIds.filter(id => id !== "motion-assets").reverse();
  assert.deepEqual(orderedSiteIds(dashboardToolIds, oldOrder, order => order), [...oldOrder, "motion-assets"]);
});

test("previous navigation visibility preferences retain hidden tools", () => {
  const saved = JSON.stringify(["motion-assets", "files", "site:test"]);
  const storage = { getItem: key => key === studioNavigationVisibilityKey ? saved : null };
  assert.deepEqual(readStudioNavigationHiddenTools(storage), ["motion-assets", "files", "site:test"]);
});


test("normalisation cannot produce a project that fails its own path limit", () => {
  const project = motionProject(motionPreset("wave"));
  const segment = "1.1234567891234 2.1234567891234 3.1234567891234 4.1234567891234 5.1234567891234 6.1234567891234";
  const path = "M0 0C" + Array(124).fill(segment).join(" ");
  assert.throws(() => readMotionProject({ ...project, asset: { ...project.asset, path } }), /shorter SVG path/);
});
