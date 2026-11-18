import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildFiles, parseMaster, scales } from "../scripts/build.mjs";
import { iconNames, iconGeometry, iconMetadata, svgAssetPath, resolveIconName } from "../dist/index.js";
import { AcmIcon } from "../src/react.js";
const root = fileURLToPath(new URL("../", import.meta.url));
test("every master has its documented optical geometry and matching standalone assets", () => {
  assert.equal(iconNames.length, 466);
  assert.equal(readdirSync(resolve(root, "dist/svg"), { recursive: true }).filter((path) => path.endsWith(".svg")).length, 1404);
  for (const name of iconNames) {
    assert.match(iconMetadata[name].provenance, /Microsoft Copilot brand artwork from Lobe Icons, MIT License|Inter v4\.1.*SIL OFL 1\.1|Original ACM/);
    if (name.startsWith("keyboard.") && /Inter v4\.1/.test(iconMetadata[name].provenance)) assert.match(iconMetadata[name].provenance, /SIL OFL 1\.1/, name + " must identify the Inter lettering licence");
    assert.equal(/demo|fictitious/.test(iconMetadata[name].description), false);
    const glyphs = iconGeometry[name];
    assert.equal(new Set(scales.map((scale) => JSON.stringify(glyphs[scale].paths))).size, name === "keyboard.copilot" ? 1 : 3);
    for (const scale of scales) {
      const svg = readFileSync(resolve(root, "dist/svg", name, scale + ".svg"), "utf8");
      assert.match(svg, /viewBox="0 0 24 24"/);
      assert.match(svg, /stroke="currentColor"/);
      assert.doesNotMatch(svg, /<(?:script|image|foreignObject|text)\b|\bhref=|\bstyle=|\bonload=/i);
      assert.equal(svgAssetPath(name, scale), "@acm/icons/svg/" + name + "/" + scale + ".svg");
    }
  }
});
test("generation is deterministic and matches every distribution file", () => {
  const first = buildFiles();
  assert.deepEqual(buildFiles(), first);
  for (const [path, content] of Object.entries(first)) assert.equal(readFileSync(resolve(root,path),"utf8"),content,path);
});
test("legacy brand names resolve to the canonical social service artwork", () => {
  for (const [legacy, canonical] of [["brand.linkedin", "social.service.linkedin"], ["brand.tiktok", "social.service.tiktok"]]) {
    assert.equal(resolveIconName(legacy), canonical);
    assert.ok(iconNames.includes(canonical));
    assert.ok(!iconNames.includes(legacy));
    assert.equal(iconMetadata[legacy].name, legacy);
    for (const scale of scales) {
      assert.deepEqual(iconGeometry[legacy][scale], iconGeometry[canonical][scale]);
      assert.equal(readFileSync(resolve(root, "dist/svg", legacy, scale + ".svg"), "utf8"), readFileSync(resolve(root, "dist/svg", canonical, scale + ".svg"), "utf8"));
      assert.equal(svgAssetPath(legacy, scale), "@acm/icons/svg/" + legacy + "/" + scale + ".svg");
      assert.equal(renderToStaticMarkup(createElement(AcmIcon, { name: legacy, scale })), renderToStaticMarkup(createElement(AcmIcon, { name: canonical, scale })));
    }
  }
  assert.equal(resolveIconName("unknown.invalid"), undefined);
  assert.equal(resolveIconName("toString"), undefined);
});

test("Bandcamp paths stay clear of the canvas edge after their optical stroke is applied", () => {
  const master = readFileSync(resolve(root, "masters/social.service.bandcamp.svg"), "utf8");
  for (const [, scale, strokeWidth, path] of master.matchAll(/<g id="(Regular-[SML])" stroke-width="([^"]+)"><path d="([^"]+)"/g)) {
    const coordinates = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(([value]) => Number(value)).filter(Number.isFinite);
    const inset = Number(strokeWidth) / 2;
    assert.ok(Math.min(...coordinates) >= inset, scale + " keeps its stroked points inside the left and upper edges");
    assert.ok(Math.max(...coordinates) <= 24 - inset, scale + " keeps its stroked points inside the right and lower edges");
  }
});

test("WordPress Social Link service additions are generated ACM brand reproductions at three optical sizes", () => {
  const serviceIcons = iconNames.filter(name => name.startsWith("social.service."));
  assert.equal(serviceIcons.length, 44);
  const filledSocialMarks = new Set(["social.service.amazon", "social.service.bandcamp", "social.service.behance", "social.service.bluesky", "social.service.deviantart", "social.service.discord", "social.service.dropbox", "social.service.etsy", "social.service.facebook", "social.service.flickr", "social.service.foursquare", "social.service.github", "social.service.google", "social.service.gravatar", "social.service.lastfm", "social.service.mastodon", "social.service.meetup", "social.service.medium", "social.service.patreon", "social.service.pinterest", "social.service.pocket", "social.service.reddit", "social.service.snapchat", "social.service.soundcloud", "social.service.spotify", "social.service.telegram", "social.service.tumblr", "social.service.twitter", "social.service.vimeo", "social.service.vk", "social.service.whatsapp", "social.service.wordpress", "social.service.x", "social.service.yelp", "social.service.youtube"]);
  for (const name of filledSocialMarks) for (const scale of scales) assert.ok(iconGeometry[name][scale].paths.some(path => path.fill === "currentColor"), name + "/" + scale + " keeps its filled logo silhouette");
  for (const name of serviceIcons) {
    if (name === "social.service.linkedin" || name === "social.service.tiktok") continue;
    assert.equal(iconMetadata[name].golden, false, name + " is an approximation, not a golden brand mark");
    const master = readFileSync(resolve(root, "masters", name + ".svg"), "utf8");
    assert.deepEqual([...master.matchAll(/<g id="(Regular-[SML])" stroke-width="([^"]+)"/g)].map(([, scale, width]) => [scale, width]), name === "social.service.goodreads" ? [["Regular-S", "1.5"], ["Regular-M", "1.5"], ["Regular-L", "1.5"]] : name === "social.service.fivehundredpx" ? [["Regular-S", "2"], ["Regular-M", "1.75"], ["Regular-L", "1.5"]] : [["Regular-S", "2.7"], ["Regular-M", "2.35"], ["Regular-L", "2.05"]], name + " has its optical stroke widths");
    assert.match(iconMetadata[name].label, /social icon/i, name);
    assert.match(iconMetadata[name].description, /not an official asset/i, name);
    assert.match(iconMetadata[name].provenance, /Original ACM vector geometry.*no third-party source files or paths copied/);
    assert.equal(new Set(scales.map(scale => JSON.stringify(iconGeometry[name][scale].paths))).size, 3, name + " has optical-size-specific geometry");
    for (const scale of scales) {
      const asset = readFileSync(resolve(root, "dist/svg", name, scale + ".svg"), "utf8");
      assert.match(asset, /<path\b/, name + "/" + scale + " contains vector artwork");
      assert.doesNotMatch(asset, /<(?:title|desc)\b/i, name + "/" + scale + " remains a decorative standalone asset");
      assert.equal(svgAssetPath(name, scale), "@acm/icons/svg/" + name + "/" + scale + ".svg");
    }
  }
});

test("Social Icons uses three filled share nodes and two connecting strokes at every optical size", () => {
  assert.match(iconMetadata["social.icons"].description, /share/i);
  for (const scale of scales) {
    const paths = iconGeometry["social.icons"][scale].paths;
    assert.equal(paths.length, 2, scale + " keeps connectors separate from filled nodes");
    assert.equal((paths[0].d.match(/M /g) ?? []).length, 2, scale + " has two share connectors");
    assert.equal(paths[1].fill, "currentColor", scale + " fills the share nodes");
    assert.equal((paths[1].d.match(/ Z/g) ?? []).length, 3, scale + " has three share nodes");
  }
});
test("Paragraph retains its bold ACM stem at all three optical sizes", () => {
  for (const scale of scales) {
    assert.ok(iconGeometry["text.paragraph"][scale].paths.some((path) => path.fill === "currentColor"), scale);
  }
});
test("Link and Unlink share horizontal chain artwork, with Unlink marked by a diagonal", () => {
  for (const scale of scales) {
    const link = iconGeometry["action.link"][scale].paths;
    const unlink = iconGeometry["action.unlink"][scale].paths;
    assert.equal(link.length, 3, scale + " Link has two chain ends and a connector");
    assert.equal(unlink.length, 4, scale + " Unlink adds one break mark");
    assert.deepEqual(unlink.slice(0, 3), link, scale + " retains the same connected chain family");
    for (const path of unlink) {
      assert.equal(path.fill, "currentColor", scale + " uses solid contours");
      assert.equal(path.stroke, "none", scale + " retains square contour ends");
    }
    const connectorCoordinates = link[2].d.match(/[0-9.]+/g).map(Number);
    const strikeCoordinates = unlink[3].d.match(/[0-9.]+/g).map(Number);
    const span = (coordinates, axis) => {
      const values = coordinates.filter((_, index) => index % 2 === axis);
      return Math.max(...values) - Math.min(...values);
    };
    assert.ok(span(connectorCoordinates, 0) > span(connectorCoordinates, 1), scale + " connector is horizontal");
    assert.ok(span(strikeCoordinates, 1) > span(strikeCoordinates, 0), scale + " break mark is steep");
  }
});
test("the horizontal pane chevron points right at all three optical sizes", () => {
  const paths = {
    "Regular-S": "M 9.21 5.49 L 15.72 12 L 9.21 18.51",
    "Regular-M": "M 9 5 L 16 12 L 9 19",
    "Regular-L": "M 8.91 4.79 L 16.12 12 L 8.91 19.21",
  };
  for (const scale of scales) assert.deepEqual(iconGeometry["navigation.chevron-right"][scale].paths, [{ d: paths[scale] }], scale);
});
test("List Item indentation symbols remain distinct and available at every optical size", () => {
  assert.match(iconMetadata["arrange.indent"].description, /Nest the selected list item/);
  assert.match(iconMetadata["arrange.outdent"].description, /parent level/);
  for (const scale of scales) {
    assert.notDeepEqual(iconGeometry["arrange.indent"][scale].paths, iconGeometry["arrange.outdent"][scale].paths, scale);
    assert.equal(iconGeometry["arrange.indent"][scale].paths.length, 2, scale);
    assert.equal(iconGeometry["arrange.outdent"][scale].paths.length, 2, scale);
  }
});
test("master parser rejects unsafe elements, attributes and malformed full lexical inputs", () => {
  const source = readFileSync(resolve(root,"masters/action.undo.svg"),"utf8");
  assert.doesNotThrow(() => parseMaster(source));
  for (const d of ["M 1 . 2", "M 1, ,2", "M 1 2 L 3 4 .", "M 1 2 L 3", "M 1 2 X 3 4", "M 1 2 L 25 4", "M 1 2 C 3 4 5", "M 1 2 L NaN 4", "M 1 2 L 1.2.3 4"]) {
    assert.throws(() => parseMaster(source.replace(/d="M[^"]+"/, 'd="' + d + '"')), undefined, d);
  }
  for (const content of ['<script>alert(1)</script>', '<image href="https://example.invalid"/>', '<path d="M 1 2" onclick="alert(1)" />']) {
    assert.throws(() => parseMaster(source.replace("</g>", content + "</g>")));
  }
});
test("React icons are decorative by default and explicitly labelled when meaningful", () => {
  const decorative = renderToStaticMarkup(createElement(AcmIcon,{name:"action.undo"}));
  assert.match(decorative,/aria-hidden="true"/);
  assert.match(decorative,/focusable="false"/);
  assert.doesNotMatch(decorative,/role="img"|aria-label=/);
  const meaningful = renderToStaticMarkup(createElement(AcmIcon,{name:"security.lock",label:"Locked",scale:"Regular-S",size:16}));
  assert.match(meaningful,/role="img"/); assert.match(meaningful,/aria-label="Locked"/);
  assert.match(meaningful,/stroke-width="2"/); assert.match(meaningful,/width="16"/);
  assert.doesNotMatch(meaningful,/aria-hidden/);
  assert.throws(() => renderToStaticMarkup(createElement(AcmIcon,{name:"missing"})));
});

const objectEditingNames = [
  "action.copy", "action.paste", "arrange.group", "arrange.ungroup",
  "arrange.align-left", "arrange.align-centre-horizontal", "arrange.align-right",
  "arrange.align-top", "arrange.align-centre-vertical", "arrange.align-bottom",
  "view.layers", "image.crop", "arrange.rotate",
];

const textEditingNames = [
  "text.bold", "text.italic", "text.underline", "text.strikethrough",
  "text.align-left", "text.align-centre", "text.align-right", "text.justify",
  "action.link", "action.unlink", "text.list-bulleted", "text.list-numbered",
  "text.paragraph", "text.heading", "text.quote", "text.code",
];

const interfaceNames = [
  "action.add", "action.remove", "action.settings", "action.adjust", "action.more",
  "navigation.menu", "action.filter", "action.sort-ascending",
  "action.sort-descending", "state.info", "action.help", "state.warning", "state.error",
];
const hoverMenuNames = [
  "arrange.reorder", "arrange.move-up", "arrange.move-down", "text.footnote",
  "text.keyboard", "text.language", "text.math", "text.subscript", "text.superscript",
];

const fileMediaTableNames = [
  "action.upload",
  "action.download",
  "view.show",
  "insert.audio",
  "insert.video",
  "action.archive",
  "action.restore",
  "table.row-before",
  "table.row-after",
  "table.column-before",
  "table.column-after",
  "table.row-delete",
  "table.column-delete"
];

const layoutWidthNames = [
  "layout.width-default", "layout.width-wide", "layout.width-full",
];
const groupLayoutNames = ["layout.flow", "layout.row", "layout.stack", "layout.grid"];
const embedNames = ["insert.embed"];

test("additions retain their ordered names and stay outside the golden set", () => {
  const assertOrdered = names => {
    const positions = names.map(name => iconNames.indexOf(name));
    assert.ok(positions.every(position => position >= 0), "Every historical symbol remains present");
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, "Historical symbols retain their relative order");
  };
  for (const names of [objectEditingNames, textEditingNames, interfaceNames, hoverMenuNames, fileMediaTableNames, layoutWidthNames, groupLayoutNames, embedNames]) assertOrdered(names);
  for (const name of [...textEditingNames, ...interfaceNames, ...hoverMenuNames, ...fileMediaTableNames, ...layoutWidthNames, ...groupLayoutNames, ...embedNames]) {
    const keywords = iconMetadata[name].keywords;
    assert.equal(new Set(keywords).size, keywords.length, name);
  }
  assert.deepEqual(iconNames.filter((name) => iconMetadata[name].golden), [
    "action.undo", "action.redo", "tool.select", "insert.image", "insert.text",
    "action.delete", "security.lock", "security.unlock", "view.zoom-in",
    "view.zoom-out", "table.cell", "table.rows", "table.columns", "table.both",
  ]);
  for (const name of [...objectEditingNames, ...textEditingNames, ...interfaceNames, ...hoverMenuNames, ...fileMediaTableNames, ...groupLayoutNames, ...embedNames]) {
    assert.equal(iconMetadata[name].golden, false, name);
    assert.deepEqual(Object.keys(iconGeometry[name]), scales, name);
  }
});

test("every new optical variant resolves through package exports and renders through React", () => {
  const sizes = [16, 24, 32];
  for (const name of [...objectEditingNames, ...textEditingNames, ...interfaceNames, ...hoverMenuNames, ...fileMediaTableNames]) {
    for (const [index, scale] of scales.entries()) {
      const asset = import.meta.resolve(svgAssetPath(name, scale));
      assert.equal(fileURLToPath(asset), resolve(root, "dist/svg", name, scale + ".svg"));
      const standalone = readFileSync(new URL(asset), "utf8");
      const markup = renderToStaticMarkup(createElement(AcmIcon, {
        name, scale, size: sizes[index], label: iconMetadata[name].label,
      }));
      assert.match(markup, /role="img"/);
      assert.ok(markup.includes('aria-label="' + iconMetadata[name].label + '"'));
      assert.ok(markup.includes('width="' + sizes[index] + '"'));
      assert.ok(markup.includes('stroke-width="' + iconGeometry[name][scale].strokeWidth + '"'));
      for (const path of iconGeometry[name][scale].paths) {
        assert.ok(markup.includes('d="' + path.d + '"'), name + "/" + scale);
        assert.ok(standalone.includes('d="' + path.d + '"'), name + "/" + scale);
        if (path.fill) {
          const filledPath = 'd="' + path.d + '" fill="' + path.fill + '"';
          assert.ok(markup.includes(filledPath), name + "/" + scale + " React fill");
          assert.ok(standalone.includes(filledPath), name + "/" + scale + " SVG fill");
        }
      }
    }
  }
});

test("Preview retains an open eyelid and filled pupil separately from Show", () => {
  for (const scale of scales) {
    const paths = iconGeometry["view.preview"][scale].paths;
    assert.equal(paths.length, 2);
    assert.equal(paths[0].d.endsWith("Z"), false);
    assert.equal(paths[1].fill, "currentColor");
    assert.equal(paths[1].stroke, "none");
    assert.notDeepEqual(paths, iconGeometry["view.show"][scale].paths);
  }
});

test('Mac platform mark is available at every catalogue scale', () => {
  const name = 'brand.apple';
  assert.match(iconMetadata[name].description, /not an official asset/i);
  assert.match(iconMetadata[name].provenance, /no third-party source files or paths copied/i);
  for (const scale of scales) {
    assert.ok(iconGeometry[name][scale].paths.some(path => path.fill === 'currentColor' && path.stroke === 'none'));
    assert.match(readFileSync(resolve(root, 'dist/svg', name, `${scale}.svg`), 'utf8'), /<path /);
  }
});
