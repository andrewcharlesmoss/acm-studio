import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { iconNames, iconGeometry, iconMetadata, iconScales, svgAssetPath } from "../dist/index.js";
import { keyboardKeys, keyboardAsset, createKeyboardSvg } from "../src/keyboard.js";
import { AcmKeycap } from "../src/keyboard-react.js";

test("UK inventory covers the common ISO legends, full key families and platform variants", () => {
  const uniqueIcons = [...new Set(keyboardKeys.map((key) => key.icon))];
  assert.equal(keyboardKeys.length, 176);
  assert.equal(new Set(keyboardKeys.map((key) => key.id)).size, keyboardKeys.length);
  assert.deepEqual(iconNames.filter(name => uniqueIcons.includes(name)), uniqueIcons);
  assert.deepEqual(iconNames.filter(name => ["keyboard.command", "keyboard.option", "keyboard.delete-backward"].includes(name)), ["keyboard.command", "keyboard.option", "keyboard.delete-backward"]);
  for (const letter of "abcdefghijklmnopqrstuvwxyz") assert.ok(keyboardKeys.some((key) => key.id === `letter-${letter}`));
  for (const id of ["digit-one", "digit-two", "mac-digit-two", "digit-three", "mac-digit-three", "digit-four", "digit-five", "digit-six", "digit-seven", "digit-eight", "digit-nine", "digit-zero"]) assert.ok(keyboardKeys.some((key) => key.id === id));
  for (const id of ["punct-backtick", "mac-punct-section", "mac-punct-backtick", "punct-left-bracket", "punct-hash", "punct-backslash", "punct-apostrophe", "mac-punct-apostrophe"]) assert.ok(keyboardKeys.some((key) => key.id === id));
  for (const id of ["f1", "f12", "mac-f13", "mac-f19", "keypad-0", "keypad-9", "keypad-enter", "page-up", "arrow-left", "windows-control-right", "windows-altgr", "mac-command-left", "mac-command-right", "mac-brightness-down", "mac-media-play", "fn-globe", "touch-id", "power", "copilot", "windows-menu"]) assert.ok(keyboardKeys.some((key) => key.id === id));
  assert.equal(keyboardKeys.find((key) => key.id === "digit-three").label, "3 / £");
  assert.equal(keyboardKeys.find((key) => key.id === "punct-backtick").label, "` / ¬ / ¦");
  assert.deepEqual(keyboardKeys.find((key) => key.id === "digit-two").platforms, ["windows"]);
  assert.deepEqual(keyboardKeys.find((key) => key.id === "mac-digit-two").platforms, ["mac"]);
  assert.equal(keyboardKeys.find((key) => key.id === "mac-digit-two").label, "2 / @");
  assert.deepEqual(keyboardKeys.find((key) => key.id === "punct-apostrophe").platforms, ["windows"]);
  assert.deepEqual(keyboardKeys.find((key) => key.id === "mac-punct-apostrophe").platforms, ["mac"]);
  assert.equal(keyboardKeys.find((key) => key.id === "windows-altgr").label, "AltGr");
  assert.ok(keyboardKeys.find((key) => key.id === "mac-digit-two").aliases.includes("euro"));
  assert.equal(keyboardKeys.find((key) => key.id === "enter").shape, "iso");
  assert.equal(keyboardKeys.find((key) => key.id === "mac-punct-section").platforms[0], "mac");
  assert.equal(keyboardKeys.find((key) => key.id === "punct-backtick").platforms[0], "windows");
  assert.equal(keyboardKeys.find((key) => key.id === "keypad-enter").shape, "tall");
  assert.equal(keyboardKeys.find((key) => key.id === "keypad-add").shape, "tall");
  assert.equal(keyboardAsset("backspace").width, 84);
  assert.equal(keyboardAsset("backspace").transform, "translate(30 12)");
  assert.equal(keyboardAsset("keypad-0").width, 96);
  assert.equal(keyboardAsset("space").width, 240);
  assert.equal(keyboardAsset("space").transform, "translate(108 12)");
  assert.equal(keyboardAsset("space").glyph.paths.length, 0);
  assert.ok(keyboardAsset("space", { mode: "symbol" }).glyph.paths.length);
  assert.equal(keyboardAsset("mac-shift-left").width, 84);
  assert.equal(keyboardAsset("mac-shift-left").transform, "translate(30 12)");
  assert.equal(keyboardAsset("mac-shift-right").width, 96);
  assert.equal(keyboardAsset("mac-shift-right").transform, "translate(36 12)");
  assert.ok(keyboardKeys.filter((key) => key.platforms.includes("mac")).length > 100);
  assert.ok(keyboardKeys.filter((key) => key.platforms.includes("windows")).length > 90);
  for (const id of ["backspace", "delete-forward", "insert", "print-screen", "scroll-lock", "pause-break", "num-lock"]) {
    assert.deepEqual(keyboardKeys.find((key) => key.id === id).platforms, ["windows"]);
  }
  for (const key of keyboardKeys) {
    assert.ok(key.group);
    assert.equal(iconMetadata[key.icon].golden, false);
    for (const scale of iconScales) assert.ok(import.meta.resolve(svgAssetPath(key.icon, scale)).endsWith(`${scale}.svg`));
  }
});

test("stacked UK legends keep distinct optical bands at every scale", () => {
  const bounds = (path) => {
    const values = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const xs = values.filter((_, index) => index % 2 === 0);
    const ys = values.filter((_, index) => index % 2 === 1);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };
  const stacked = [
    ...["one", "two", "four", "five", "six", "seven", "eight", "nine", "zero"].map((name) => `keyboard.digit-${name}`),
    ...["minus", "equals", "left-bracket", "right-bracket", "semicolon", "apostrophe", "hash", "backslash", "comma", "period", "slash"].map((name) => `keyboard.punct-${name}`),
    "keyboard.mac-punct-apostrophe", "keyboard.mac-punct-section", "keyboard.mac-punct-backtick",
  ];
  const triple = ["keyboard.punct-backtick", "keyboard.mac-digit-two", "keyboard.mac-digit-three"];

  for (const name of [...stacked, ...triple]) for (const scale of iconScales) {
    const paths = iconGeometry[name][scale].paths.map((path) => bounds(path.d));
    const [upper, ...lower] = paths;
    assert.equal(paths.length, triple.includes(name) ? 3 : 2, `${name} ${scale} should keep its intended legend count`);
    assert.ok(upper.top >= 0.75 && upper.bottom <= 10.5, `${name} ${scale} upper legend should stay in its optical band`);
    assert.ok(lower.every((path) => path.top >= 11.5 && path.bottom <= 23.25), `${name} ${scale} lower legend should stay in its optical band`);
    assert.ok(Math.min(...lower.map((path) => path.top)) - upper.bottom >= 2, `${name} ${scale} stacked legends should have at least two units of painted separation`);
    if (lower.length === 2) {
      assert.ok(lower[1].left - lower[0].right >= 2, `${name} ${scale} lower primary and alternate legends should remain separate`);
      const centres = lower.map((path) => (path.top + path.bottom) / 2);
      assert.ok(Math.abs(centres[0] - centres[1]) <= 0.25, `${name} ${scale} lower legends should share an optical row`);
    }
  }

  for (const scale of iconScales) {
    const combinedPath = iconGeometry["keyboard.digit-three"][scale].paths[0].d;
    const components = combinedPath.split(/(?=M )/).filter(Boolean).map(bounds);
    const upper = components.filter((component) => component.bottom <= 11);
    const lower = components.filter((component) => component.top >= 13);
    assert.equal(upper.length + lower.length, components.length, `keyboard.digit-three ${scale} components should stay in one optical band`);
    assert.ok(upper.length > 0 && lower.length > 0, `keyboard.digit-three ${scale} should retain both legends`);
    assert.ok(Math.min(...lower.map((component) => component.top)) - Math.max(...upper.map((component) => component.bottom)) >= 2, `keyboard.digit-three ${scale} stacked legends should retain two units of painted separation`);
  }
});

test("every active keyboard symbol stays inside its 24-unit canvas", () => {
  const uniqueIcons = [...new Set(keyboardKeys.map((key) => key.icon))];
  for (const name of uniqueIcons) for (const scale of iconScales) {
    const glyph = iconGeometry[name][scale];
    for (const path of glyph.paths) {
      const values = (path.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const xs = values.filter((_, index) => index % 2 === 0);
      const ys = values.filter((_, index) => index % 2 === 1);
      const strokeRadius = path.stroke === "none" ? 0 : glyph.strokeWidth / 2;
      assert.ok(Math.min(...xs) - strokeRadius >= 0, `${name} ${scale} should clear the left canvas edge`);
      assert.ok(Math.max(...xs) + strokeRadius <= 24, `${name} ${scale} should clear the right canvas edge`);
      assert.ok(Math.min(...ys) - strokeRadius >= 0, `${name} ${scale} should clear the top canvas edge`);
      assert.ok(Math.max(...ys) + strokeRadius <= 24, `${name} ${scale} should clear the bottom canvas edge`);
    }
  }
});

test("keycap and bare symbol exports share the exact optical paths without font dependencies", () => {
  for (const key of keyboardKeys) for (const scale of iconScales) for (const mode of ["keycap", "symbol"]) {
    const asset = keyboardAsset(key.id, { mode, scale });
    const svg = createKeyboardSvg(key.id, { mode, scale, height: 128, colour: "#F2F2F7" });
    assert.match(svg, new RegExp(`width="${Math.round(128 * asset.width / asset.height)}" height="128"`));
    assert.doesNotMatch(svg, /<text\b|<font\b|\bfont-family\s*=|<image\b|<script\b|\bhref=|currentColor/);
    assert.match(svg, /stroke="#F2F2F7"/);
    assert.equal(Boolean(asset.frame), mode === "keycap");
    for (const path of asset.glyph.paths) assert.ok(svg.includes(`d="${path.d}"`));
    const rendered = renderToStaticMarkup(createElement(AcmKeycap, { name: key.id, mode, scale, height: 128, label: key.label }));
    assert.match(rendered, /role="img"/);
    assert.match(rendered, /aria-label=/);
    assert.match(rendered, new RegExp(`viewBox="0 0 ${asset.width} ${asset.height}"`));
    for (const path of asset.glyph.paths) assert.ok(rendered.includes(`d="${path.d}"`));
  }
  assert.match(renderToStaticMarkup(createElement(AcmKeycap, { name: "command" })), /aria-hidden="true"/);
});

test("Mac navigation utility keeps a fine framed box and separate lines", () => {
  for (const scale of iconScales) {
    const glyph = keyboardAsset('mac-navigation-utility', { scale, mode: 'symbol' }).glyph;
    const path = glyph.paths[0].d;
    assert.equal(glyph.strokeWidth, 1);
    assert.equal((path.match(/\bM\b/g) ?? []).length, 3);
    assert.equal((path.match(/\bZ\b/g) ?? []).length, 1);
    assert.equal(glyph.paths[1].fill, "currentColor");
    assert.equal((glyph.paths[1].d.match(/\bZ\b/g) ?? []).length, 2);
    const numbers = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    const xs = numbers.filter((_, i) => i % 2 === 0);
    assert.ok(Math.max(...xs) - Math.min(...xs) <= 9, 'utility mark remains compact');
  }
});

test("Mac minus key has a longer upper mark and fine strokes", () => {
  for (const scale of iconScales) {
    const paths = keyboardAsset('mac-punct-minus', { scale, mode: 'symbol' }).glyph.paths;
    const dimensions = paths.map(({d}) => {
      const n = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
      const x = n.filter((_, i) => i % 2 === 0), y = n.filter((_, i) => i % 2 === 1);
      return { width: Math.max(...x) - Math.min(...x), height: Math.max(...y) - Math.min(...y) };
    });
    assert.ok(dimensions[0].width > dimensions[1].width * 1.5);
    assert.ok(dimensions.every(({height}) => height <= 1));
  }
});

test("A–F keyboard legends share a consistent Inter-derived cap height", () => {
  for (const scale of iconScales) {
    const heights = [..."abcdef"].map((letter) => {
      const path = iconGeometry[`keyboard.letter-${letter}`][scale].paths[0].d;
      const coordinates = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);
      return Math.max(...yCoordinates) - Math.min(...yCoordinates);
    });
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 0.35, `${scale} A–F legends should share their cap-height band`);
  }
});

test("Mac modifier captions remain legible and inside the wide keycap at every optical scale", () => {
  const modifiers = keyboardKeys.filter((key) => /keyboard\.mac-(?:command|option|control)(?:-(?:left|right))?$/.test(key.icon));
  assert.equal(modifiers.length, 8);
  for (const key of modifiers) for (const scale of iconScales) {
    const asset = keyboardAsset(key.id, { scale, colour: "#123456" });
    const symbol = keyboardAsset(key.id, { mode: "symbol", scale });
    assert.ok(asset.captionPath);
    assert.equal(symbol.captionPath, undefined);
    const coordinates = [...asset.captionPath.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    const xs = coordinates.filter((_, index) => index % 2 === 0);
    const ys = coordinates.filter((_, index) => index % 2 === 1);
    assert.ok(Math.min(...xs) > 3 && Math.max(...xs) < 69, `${key.id} caption must clear the border`);
    assert.ok(Math.min(...ys) < 32 && Math.max(...ys) < 39, `${key.id} caption must be at least five units high`);
    assert.ok(Math.max(...ys) < 43, `${key.id} caption must clear the keycap bottom`);
    const svg = createKeyboardSvg(key.id, { scale, colour: "#123456" });
    const react = renderToStaticMarkup(createElement(AcmKeycap, { name: key.id, scale, colour: "#123456" }));
    for (const output of [svg, react]) assert.ok(output.includes(`d="${asset.captionPath}" fill="#123456" stroke="none"`));
    assert.ok(!createKeyboardSvg(key.id, { mode: "symbol", scale }).includes(asset.captionPath));
  }
});

test("left and right Command keycap symbols sit towards their outer edges", () => {
  for (const scale of iconScales) {
    const left = keyboardAsset("mac-command-left", { scale });
    const right = keyboardAsset("mac-command-right", { scale });
    assert.equal(left.transform, "translate(17 6)");
    assert.equal(right.transform, "translate(40 8)");
    const captionCoordinates = [...left.captionPath.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    assert.ok(Math.min(...captionCoordinates.filter((_, index) => index % 2 === 0)) >= 9, "left Command caption stays inset from the frame");
    assert.equal(keyboardAsset("command", { scale }).transform, "translate(24 8)");
    assert.equal(keyboardAsset("mac-command-left", { scale, mode: "symbol" }).transform, undefined);
  }
});

test("Mac function pictograms fill a readable upper band above their F legends", () => {
  const bounds = (path) => {
    const tokens = path.match(/[MLCQZ]|-?\d+(?:\.\d+)?/g) ?? [];
    const arity = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };
    const xs = [];
    const ys = [];
    while (tokens.length) {
      const command = tokens.shift();
      const count = arity[command];
      for (let index = 0; index < count; index++) {
        const coordinate = Number(tokens.shift());
        (index % 2 === 0 ? xs : ys).push(coordinate);
      }
    }
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };

  for (const name of ["brightness-down", "brightness-up", "mission-control", "spotlight", "dictation", "focus", "media-previous", "media-play", "media-next", "mute", "volume-down", "volume-up"]) {
    const master = readFileSync(new URL(`../masters/keyboard.mac-${name}.svg`, import.meta.url), "utf8");
    const groups = [...master.matchAll(/<g id="Regular-[SML]" stroke-width="([\d.]+)">([\s\S]*?)<\/g>/g)];
    assert.equal(groups.length, 3);
    for (const [, strokeWidth, body] of groups) {
      const paths = [...body.matchAll(/<path d="([^"]+)"/g)].map(([, path]) => path);
      const label = bounds(paths.at(-1));
      const artwork = paths.slice(0, -1).map(bounds);
      const paintedPictogramBottom = Math.max(...artwork.map((path) => path.bottom)) + Number(strokeWidth) / 2;
      const paintedPictogramWidth = Math.max(...artwork.map((path) => path.right)) - Math.min(...artwork.map((path) => path.left)) + Number(strokeWidth);
      assert.ok(paintedPictogramWidth >= (name === 'mute' ? 5 : 9), `${name} action mark is too small for a keycap`);
      assert.ok(paintedPictogramWidth <= (name === 'mute' ? 8 : 18), `${name} action mark is too large for a keycap`);
      assert.ok(label.top - paintedPictogramBottom >= 2, `${name} F legend crowds the painted pictogram`);
      assert.ok(label.bottom < 24, `${name} F legend touches the symbol canvas edge`);
    }
  }

  const globeMaster = readFileSync(new URL("../masters/keyboard.mac-fn-globe.svg", import.meta.url), "utf8");
  const globeGroups = [...globeMaster.matchAll(/<g id="Regular-[SML]" stroke-width="([\d.]+)">([\s\S]*?)<\/g>/g)];
  assert.equal(globeGroups.length, 3);
  for (const [, strokeWidth, body] of globeGroups) {
    const paths = [...body.matchAll(/<path d="([^"]+)"/g)].map(([, path]) => path);
    const globe = paths.slice(0, -1).map(bounds);
    const fn = bounds(paths.at(-1));
    const strokeRadius = Number(strokeWidth) / 2;
    assert.ok(fn.left - Math.max(...globe.map((path) => path.right)) - strokeRadius >= 1.5, "Fn lettering must clear the globe stroke");
    assert.ok(Math.min(...globe.map((path) => path.left)) - strokeRadius >= 0, "globe must stay within the symbol canvas");
    assert.ok(Math.max(...globe.map((path) => path.bottom)) + strokeRadius <= 24, "globe must stay within the symbol canvas");
    assert.ok(fn.right <= 24, "Fn lettering must stay within the symbol canvas");
  }

  for (const scale of iconScales) {
    const paths = iconGeometry["keyboard.copilot"][scale].paths;
    assert.equal(paths.length, 1);
    assert.ok(paths.every((path) => path.fill === "currentColor" && path.stroke === "none" && /Z\s*$/.test(path.d)), "Copilot preserves the sourced filled brand silhouette");
  }
  for (const scale of iconScales) assert.equal(iconGeometry["keyboard.mac-delete-forward"][scale].paths.length, 1);
});

test("Mac Dictation keeps a slender capsule and open cradle above its F5 legend", () => {
  const bounds = path => {
    const coordinates = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    const xs = coordinates.filter((_, index) => index % 2 === 0);
    const ys = coordinates.filter((_, index) => index % 2 === 1);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };
  for (const scale of iconScales) {
    const glyph = iconGeometry['keyboard.mac-dictation'][scale];
    const [capsule, cradle, stand] = glyph.paths.map(bounds);
    assert.ok(glyph.strokeWidth <= 1.5, 'microphone contours remain light');
    assert.ok(capsule.bottom - capsule.top > 2 * (capsule.right - capsule.left), 'capsule is tall and narrow');
    assert.ok(capsule.left - cradle.left - glyph.strokeWidth >= 1, 'left cradle gap stays open');
    assert.ok(cradle.right - capsule.right - glyph.strokeWidth >= 1, 'right cradle gap stays open');
    assert.ok(stand.bottom - stand.top >= 1.5, 'stand is distinct below the cradle');
  }
});

test("Mac Focus has a broad, scale-specific crescent above its separate F6 legend", () => {
  const bounds = (path) => {
    const values = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const xs = values.filter((_, index) => index % 2 === 0);
    const ys = values.filter((_, index) => index % 2 === 1);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };
  const glyphs = iconScales.map((scale) => iconGeometry["keyboard.mac-focus"][scale].paths);
  assert.ok(glyphs.every((paths) => paths.length === 2));
  assert.equal(new Set(glyphs.map((paths) => paths[0].d)).size, 3);
  for (const [moon] of glyphs) {
    const size = bounds(moon.d);
    assert.ok(size.width >= 9, "crescent should have a recognisable silhouette");
    assert.ok(size.height >= 9, "crescent should remain legible at small sizes");
    const coordinates = [...moon.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    assert.ok(coordinates[0] < coordinates[6] && coordinates[1] < coordinates[7], "crescent opens towards the upper right");
  }
});

test("keyboard exports reject invalid names, modes, scales, sizes and injected colours", () => {
  for (const height of [0, 23, 513, NaN, Infinity, 64.5]) assert.throws(() => createKeyboardSvg("enter", { height }));
  for (const colour of ['red', '#fff', '#123456" onload="x', 'url(https://example.invalid)']) assert.throws(() => createKeyboardSvg("enter", { colour }));
  assert.throws(() => keyboardAsset("missing"));
  assert.throws(() => keyboardAsset("enter", { mode: "unknown" }));
  assert.throws(() => keyboardAsset("enter", { scale: "unknown" }));
  assert.doesNotThrow(() => createKeyboardSvg("enter", { height: 24 }));
  assert.doesNotThrow(() => createKeyboardSvg("enter", { height: 512 }));
  assert.match(createKeyboardSvg("command", { height: 512 }), /width="768" height="512"/);
  assert.match(createKeyboardSvg("enter", { height: 512 }), /width="427" height="512"/);
});


test("independent keycap colours match React and exports without changing dimensions", () => {
  for (const key of keyboardKeys) for (const mode of ["keycap", "symbol"]) {
    const options = { mode, colour: "#123456", borderColour: "#ABCDEF", fillColour: "#FEDCBA" };
    const svg = createKeyboardSvg(key.id, options);
    const react = renderToStaticMarkup(createElement(AcmKeycap, { name: key.id, ...options }));
    for (const output of [svg, react]) {
      assert.match(output, /stroke="#123456"/);
      if (mode === "keycap") {
        assert.match(output, /stroke="#ABCDEF"/);
        assert.match(output, /fill="#FEDCBA"/);
      } else {
        assert.doesNotMatch(output, /#ABCDEF|#FEDCBA/);
      }
      if (["letter-a", "digit-three", "control", "windows"].includes(key.id)) assert.match(output, /fill="#123456"/);
    }
    const before = keyboardAsset(key.id, { mode });
    const after = keyboardAsset(key.id, options);
    assert.equal(after.width, before.width);
    assert.equal(after.height, before.height);
    assert.equal(after.frame, before.frame);
    assert.equal(after.transform, before.transform);
  }
  const defaults = keyboardAsset("command");
  assert.equal(defaults.fillColour, "none");
  assert.equal(defaults.colour, "currentColor");
  assert.equal(defaults.borderColour, "currentColor");
  assert.equal(keyboardAsset("command", { colour: "#123456" }).borderColour, "#123456");
});

test("all colour channels reject unsafe values in SVG and React", () => {
  for (const field of ["colour", "borderColour", "fillColour"]) {
    for (const value of [null, 123, "red", "#fff", '#123456" onload="x', "url(https://example.invalid)"]) {
      const options = { [field]: value };
      assert.throws(() => createKeyboardSvg("command", options));
      assert.throws(() => renderToStaticMarkup(createElement(AcmKeycap, { name: "command", ...options })));
    }
  }
  assert.doesNotThrow(() => createKeyboardSvg("command", { fillColour: "none" }));
});


test("Copilot vector exports retain the upstream MIT notice", () => {
  for (const mode of ["keycap", "symbol"]) {
    const svg = createKeyboardSvg("copilot", { mode });
    assert.match(svg, /<metadata>MIT License/);
    assert.match(svg, /Copyright \(c\) 2023 LobeHub/);
    assert.match(svg, /Permission is hereby granted/);
  }
  assert.doesNotMatch(createKeyboardSvg("letter-a"), /<metadata>/);
});

test('Fn globe and Touch ID retain open artwork in keys and portable exports', () => {
  for (const scale of iconScales) {
    const globe = iconGeometry['keyboard.mac-fn-globe'][scale];
    const fingerprint = iconGeometry['keyboard.mac-touch-id'][scale];
    assert.ok(globe.strokeWidth <= 1.5, `${scale} globe must leave its small counters open`);
    assert.equal(globe.paths.length, 4, `${scale} retains globe and licensed fn lettering`);
    assert.equal(globe.paths.at(-1).stroke, 'none');
    assert.ok(fingerprint.strokeWidth <= 1.5, `${scale} fingerprint ridges need clear spacing`);
    assert.equal(fingerprint.paths.length, 6, `${scale} fingerprint retains separate ridges`);
    for (const [id, glyph] of [['fn-globe', globe], ['touch-id', fingerprint]]) {
      const asset = keyboardAsset(id, { scale });
      assert.deepEqual(asset.glyph, glyph);
      const svg = createKeyboardSvg(id, { scale });
      for (const path of glyph.paths) assert.ok(svg.includes(path.d), `${id} ${scale} export preserves geometry`);
    }
  }
});

test('Mac F3 shows two horizontal windows left of a tall window', () => {
  for (const scale of iconScales) {
    const paths = keyboardAsset('mac-mission-control', { mode: 'symbol', scale }).glyph.paths.slice(0, 3);
    const boxes = paths.map(({ d }) => {
      const values = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
      const xs = values.filter((_, i) => i % 2 === 0), ys = values.filter((_, i) => i % 2 === 1);
      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    });
    const stroke = keyboardAsset('mac-mission-control', { mode: 'symbol', scale }).glyph.strokeWidth;
    assert.ok(boxes[1].top - boxes[0].bottom > stroke, 'stacked windows remain visibly separate');
    assert.ok(boxes[2].left - Math.max(boxes[0].right, boxes[1].right) > stroke, 'right window remains visibly separate');
    assert.ok(boxes[2].bottom - boxes[2].top > boxes[2].right - boxes[2].left);
    for (const box of boxes.slice(0, 2)) assert.ok(box.right - box.left > box.bottom - box.top);
  }
});
