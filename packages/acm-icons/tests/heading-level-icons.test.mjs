import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { iconGeometry, iconMetadata, iconScales, iconAddedAt } from "../dist/index.js";
test("all six semantic heading levels own licensed Inter three-scale artwork and catalogue metadata", () => {
  for (const [index, word] of ["one", "two", "three", "four", "five", "six"].entries()) {
    const name = `text.heading-${word}`;
    assert.equal(iconMetadata[name].label, `Heading ${index + 1}`);
    assert.ok(iconAddedAt[name]);
    assert.match(iconMetadata[name].provenance, /Inter v4\.1.*SIL OFL 1\.1/);
    assert.match(iconMetadata[name].licenceNotice, /Copyright \(c\) 2016 The Inter Project Authors/);
    assert.equal(new Set(iconScales.map(scale => JSON.stringify(iconGeometry[name][scale].paths))).size, 3);
    assert.ok(iconScales.every(scale => iconGeometry[name][scale].paths.length === 2));
    for (const scale of iconScales) {
      for (const path of iconGeometry[name][scale].paths) {
        assert.equal(path.fill, "currentColor");
        assert.equal(path.stroke, "none");
        assert.ok(path.d.endsWith("Z"));
      }
    }
  }
});

test("standalone Heading assets retain the pinned font licence without text or external fonts", () => {
  for (const word of ["one", "two", "three", "four", "five", "six"]) {
    for (const scale of iconScales) {
      const svg = readFileSync(new URL(`../dist/svg/text.heading-${word}/${scale}.svg`, import.meta.url), "utf8");
      assert.match(svg, /<metadata>Copyright \(c\) 2016 The Inter Project Authors/);
      assert.match(svg, /SIL OPEN FONT LICENSE Version 1.1/);
      assert.doesNotMatch(svg, /<text|font-family|font-face|href=/);
    }
  }
});
