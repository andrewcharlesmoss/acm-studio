import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { iconNames, iconGeometry, iconMetadata, iconScales, svgAssetPath } from "../dist/index.js";
import { AcmIcon } from "../src/react.js";

const additions = [
  "communication.at",
  "communication.bell",
  "communication.comment",
  "communication.envelope",
  "communication.rss",
  "commerce.cart",
  "commerce.payment",
  "commerce.receipt",
  "commerce.store",
  "people.group",
  "navigation.home",
  "location.marker",
  "security.key",
  "security.shield",
  "media.camera",
  "media.video-camera",
  "media.gallery",
  "block.default",
  "block.meta",
  "taxonomy.tag",
  "text.verse",
  "data.chart-bar",
  "view.shadow",
  "rating.star-empty",
  "rating.star-filled",
  "rating.star-half",
  "action.shuffle",
  "action.add-circle",
  "state.published",
  "action.tip",
  "device.desktop",
  "device.laptop",
  "device.mobile",
  "device.tablet",
  "layout.drawer-left",
  "layout.drawer-right",
  "symbol.outline",
  "symbol.filled",
  "taxonomy.category",
  "state.caution",
  "navigation.arrow-up",
  "navigation.arrow-down",
  "navigation.arrow-up-left",
  "navigation.arrow-down-left",
  "navigation.arrow-down-right",
  "navigation.chevron-left",
  "navigation.chevron-up-down",
  "action.more-vertical",
  "navigation.next",
  "navigation.previous"
];

test("website additions resolve through the shared exports and React at all optical sizes", () => {
  assert.equal(additions.length, 50);
  for (const name of additions) {
    assert.ok(iconNames.includes(name), name);
    assert.equal(iconMetadata[name].golden, false, name);
    assert.match(iconMetadata[name].provenance, /Original ACM optical geometry.*no third-party paths/, name);
    assert.equal(new Set(iconMetadata[name].keywords).size, iconMetadata[name].keywords.length, name);
    assert.equal(new Set(iconScales.map(scale => JSON.stringify(iconGeometry[name][scale].paths))).size, 3, name);
    for (const [index, scale] of iconScales.entries()) {
      const asset = readFileSync(new URL(import.meta.resolve(svgAssetPath(name, scale))), "utf8");
      const markup = renderToStaticMarkup(createElement(AcmIcon, { name, scale, size: [16, 24, 32][index], label: iconMetadata[name].label }));
      assert.ok(markup.includes(`aria-label="${iconMetadata[name].label}"`), name);
      assert.ok(markup.includes(`width="${[16, 24, 32][index]}"`), name);
      for (const { d } of iconGeometry[name][scale].paths) {
        assert.ok(asset.includes(`d="${d}"`), `${name}/${scale} asset`);
        assert.ok(markup.includes(`d="${d}"`), `${name}/${scale} React`);
      }
    }
  }
});

test("rating states preserve the common outline and distinguish empty, half, and filled", () => {
  for (const scale of iconScales) {
    const empty = iconGeometry["rating.star-empty"][scale].paths;
    const filled = iconGeometry["rating.star-filled"][scale].paths;
    const half = iconGeometry["rating.star-half"][scale].paths;
    assert.equal(empty.length, 1);
    assert.equal(empty[0].fill, undefined);
    assert.equal(filled[0].d, empty[0].d);
    assert.equal(filled[0].fill, "currentColor");
    assert.equal(half[0].fill, "currentColor");
    assert.equal(half[1].d, empty[0].d);
    assert.notEqual(half[0].d, filled[0].d);
  }
});

test("existing equivalents remain searchable without duplicate share or compact identities", () => {
  const matches = (name, words) => {
    const searchable = `${name} ${iconMetadata[name].label} ${iconMetadata[name].keywords.join(" ")}`.toLowerCase();
    for (const word of words) assert.ok(searchable.includes(word), `${name}: ${word}`);
  };
  matches("social.icons", ["share"]);
  matches("navigation.back", ["arrow", "left"]);
  matches("navigation.forward", ["arrow", "right"]);
  matches("insert.arrow", ["up", "right"]);
  matches("arrange.move-up", ["chevron up small"]);
  matches("navigation.disclosure", ["chevron down small"]);
  matches("navigation.chevron-right", ["chevron right small"]);
  matches("action.more", ["more horizontal"]);
  assert.equal(iconNames.includes("action.share"), false);
  for (const name of additions) assert.equal(name.includes("-small"), false);
});
