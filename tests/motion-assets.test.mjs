import test from "node:test";
import assert from "node:assert/strict";
import { orderedSiteIds } from "../app/studio/site-order-repository.mjs";
import { dashboardToolIds } from "../app/studio/dashboard-order-contract.mjs";
import { readStudioNavigationHiddenTools, studioNavigationVisibilityKey } from "../app/studio/studio-navigation-visibility-contract.mjs";
import { softFadeDefaults, motionPreset, motionGeometry, motionLottie, motionProject, motionSvg, readMotionProject } from "../app/studio/motion-assets/motion-asset.ts";
import { fireBurst } from "../app/studio/motion-assets/fire-burst.ts";
import { fireShockwave } from "../app/studio/motion-assets/fire-shockwave.ts";
import { softFadeFireball, rollingFireball, volumetricFireball } from "../app/studio/motion-assets/motion-effects.ts";
import { motionCatalogue } from "../app/studio/motion-assets/motion-catalogue.ts";
import { resizeMotion } from "../app/studio/motion-assets/motion-resize.ts";

test("motion resizes respect export limits and keep an unmodified edge dimension", () => {
  const landscape = { width: 1600, height: 800 };
  const portrait = { width: 800, height: 1600 };
  assert.deepEqual(resizeMotion(landscape, "se", 1000, 0, true), { width: 1920, height: 960 });
  assert.deepEqual(resizeMotion(portrait, "sw", -1000, 0, true), { width: 960, height: 1920 });
  assert.deepEqual(resizeMotion(landscape, "s", 0, 1000, false), { width: 1600, height: 1080 });
  assert.deepEqual(resizeMotion(portrait, "w", -1000, 0, false), { width: 1080, height: 1600 });
  assert.deepEqual(resizeMotion(portrait, "se", 910, 0, false), { width: 1080, height: 1600 });
  const square = { width: 800, height: 800 };
  const firstSize = resizeMotion(square, "se", 300, 320, false);
  assert.deepEqual(resizeMotion(square, "se", 330, 320, false, firstSize), firstSize);
  assert.deepEqual(resizeMotion(landscape, "se", -1700, -900, true), { width: 256, height: 128 });
});

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

test("preview bounds follow the cubic extrema and every stroke at the current thickness", () => {
  const asset = {
    ...motionPreset("wave"), width: 268, height: 168, viewBox: [0, 0, 100, 100],
    path: "M0 50 C0 0 100 0 100 50 M20 70 L60 90",
  };
  const { preview, pathAt } = motionGeometry(asset);
  assert.deepEqual(preview.boxFor(asset), { x: 23.5, y: 36, width: 221, height: 98.5 });
  assert.deepEqual(motionGeometry({ ...asset, thickness: 19 }).preview.boxFor(asset), {
    x: 18.5, y: 31, width: 231, height: 108.5,
  });
  assert.match(motionSvg(asset, pathAt(30)), /viewBox="0 0 268 168"/);
  assert.deepEqual(motionProject(asset).asset.viewBox, [0, 0, 100, 100]);
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

test("special effects round-trip as bounded, versioned projects", () => {
  const asset = { ...fireBurst, name: "Intro", width: 1280, height: 720, durationFrames: 45 };
  const saved = motionProject(asset);
  assert.equal(saved.version, "0.3.0");
  assert.deepEqual(readMotionProject(JSON.parse(JSON.stringify(saved))), asset);
  assert.throws(() => readMotionProject({ ...saved, version: "0.2.0" }));
  for (const changes of [{ effect: "missing" }, { durationFrames: 17 }, { durationFrames: 19 },
    { durationFrames: 93 }, { width: 1920, height: 1920 }, { name: " " }]) {
    assert.throws(() => readMotionProject({ ...saved, asset: { ...asset, ...changes } }));
  }
});

test("Fire Shockwave has its own project identity and preserves the Fire Burst format", () => {
  const variant = { ...fireShockwave, name: "Opening Shockwave", width: 1080, height: 1920, durationFrames: 45 };
  const project = motionProject(variant);
  assert.equal(project.version, "0.4.0");
  assert.deepEqual(readMotionProject(JSON.parse(JSON.stringify(project))), variant);
  assert.throws(() => readMotionProject({ ...project, version: "0.3.0" }), /v0\.4\.0/);
  const original = motionProject(fireBurst);
  assert.equal(original.version, "0.3.0");
  assert.deepEqual(readMotionProject(original), fireBurst);
});

test("Volumetric Fireball round-trips its authored size and longer duration independently of vector effects", () => {
  const asset = { ...volumetricFireball, name: "Cinematic intro", width: 720, height: 1280, durationFrames: 450 };
  const project = motionProject(asset);
  assert.equal(project.version, "0.5.0");
  assert.deepEqual(readMotionProject(JSON.parse(JSON.stringify(project))), asset);
  assert.throws(() => readMotionProject({ ...project, version: "0.4.0" }), /v0\.5\.0/);
  assert.throws(() => motionProject({ ...asset, durationFrames: 453 }), /15 s/);
  assert.throws(() => motionProject({ ...fireBurst, durationFrames: 93 }), /3 s/);
});

test("Rolling Fireball reopens as its own preset with the full volumetric duration range", () => {
  const asset = { ...rollingFireball, name: "Opening flame", durationFrames: 450 };
  const project = motionProject(asset);
  assert.equal(project.version, "0.6.0");
  assert.equal(asset.effect, "rolling-fireball");
  assert.deepEqual(readMotionProject(JSON.parse(JSON.stringify(project))), asset);
  assert.throws(() => readMotionProject({ ...project, version: "0.5.0" }), /v0\.6\.0/);
  assert.throws(() => motionProject({ ...asset, durationFrames: 453 }), /15 s/);
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

test("Soft Fade settings round-trip with a version gate and bounded whole percentages", () => {
  const legacy = motionProject(softFadeFireball);
  assert.equal(legacy.version, "0.7.0");
  assert.deepEqual(readMotionProject(legacy), softFadeFireball);
  assert.deepEqual(motionProject({ ...softFadeFireball, softFade: softFadeDefaults }), legacy);

  const asset = { ...softFadeFireball, softFade: { fadeOut: 70, fadeIn: 15, flameMotion: 20, coverage: 120 } };
  const saved = motionProject(asset);
  assert.equal(saved.version, "0.8.0");
  assert.deepEqual(readMotionProject(saved), asset);
  assert.throws(() => readMotionProject({ ...saved, version: legacy.version }), /v0.8.0/);
  for (const setting of [{ fadeIn: -1 }, { fadeOut: 101 }, { flameMotion: 0.5 }, { coverage: 0 }, { coverage: 181 }, { fadeIn: "20" }]) {
    assert.throws(() => motionProject({ ...asset, softFade: { ...asset.softFade, ...setting } }));
  }
  assert.throws(() => motionProject({ ...volumetricFireball, softFade: asset.softFade }));
});
