import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AcmIcon } from "../src/react.js";
import { iconGeometry, iconMetadata } from "../dist/index.js";
import { hasFilledIcon, filledIconPaths, filledIconArtwork, createFilledSvg } from "../src/filled.js";
for (const name of ["document.date", "commerce.payment", "social.service.codepen", "view.shadow", "arrange.backward", "arrange.back", "state.info", "media.save", "media.gallery", "social.service.whatsapp", "action.settings", "social.service.instagram", "social.service.dribbble", "insert.highlight", "action.edit", "document.from-template", "state.warning", "action.help", "state.caution", "device.mobile", "insert.video", "layout.column", "text.caption", "arrange.group", "arrange.ungroup", "site.identity", "table.row-before", "table.row-after", "table.column-before", "table.column-after", "table.row-delete", "table.column-delete", "commerce.store", "social.service.twitch", "view.snap", "text.language", "location.marker", "media.camera", "insert.image", "social.block", "view.show", "action.paste", "document.cover", "account.record", "scope.all", "component.block", "action.adjust", "text.keyboard", "block.image", "insert.embed", "layout.columns", "layout.grid", "layout.drawer-left", "layout.drawer-right", "layout.template", "block.table", "document.new-post", "output.backup", "view.fit", "device.tablet", "document.featured-image", "account.author", "media.video-camera", "block.meta", "security.key", "style.colour", "action.tip", "arrange.rotate", "taxonomy.category", "block.default", "view.single", "view.pages", "document.new-page", "commerce.receipt", "action.clear", "state.inherited", "view.zoom-in", "view.zoom-out", "library.designs", "insert.shapes", "insert.step", "action.filter", "insert.button", "time.clock", "view.layers", "tool.select", "security.shield", "communication.comment", "device.desktop", "security.lock", "security.unlock", "action.add-circle", "state.error", "state.published", "navigation.home", "library.files", "action.search", "action.copy", "action.duplicate", "action.archive", "action.delete", "communication.bell", "communication.envelope", "time.calendar", "taxonomy.tag"]) {
  test(`${name} provides matching React and SVG filled artwork at all sizes`, () => {
    assert.equal(hasFilledIcon(name), true);
    for (const [scale,size] of [["Regular-S",16],["Regular-M",24],["Regular-L",32]]) {
      const paths = filledIconPaths(name,scale);
      const originalPaths = iconGeometry[name][scale].paths.map(path => path.d);
      const expectedPaths = originalPaths.flatMap(path => path.split(/ +(?=M )/));
      assert.deepEqual(paths.map(path => path.d), expectedPaths, "Filled must use only the outline master’s paths");
      assert.equal(filledIconArtwork(name,scale).strokeWidth, iconGeometry[name][scale].strokeWidth);
      const rendered = renderToStaticMarkup(createElement(AcmIcon,{name,scale,size,appearance:"filled",label:"Example"}));
      const svg = createFilledSvg(name,scale,size);
      assert.match(rendered, /aria-label="Example"/);
      assert.ok(svg.includes(`<title>${iconMetadata[name].label}</title>`));
      assert.ok(svg.includes(`<desc>${iconMetadata[name].description}</desc>`));
      for (const path of paths) { assert.ok(rendered.includes(path.d)); assert.ok(svg.includes(path.d)); }
      for (const markup of [rendered, svg]) {
        const renderedPaths = [...markup.matchAll(/<path\s+[^>]*d="([^"]+)"/g)].map(match => match[1]);
        assert.ok(renderedPaths.length > 0);
        assert.ok(renderedPaths.every(path => expectedPaths.includes(path)), "Rendering cannot introduce new icon paths");
      }
      assert.notEqual(rendered, renderToStaticMarkup(createElement(AcmIcon,{name,scale,size,label:"Example"})));
    }
  });
}
test("filled artwork rejects unsupported names, scales, sizes and colour variants", () => {
  assert.equal(hasFilledIcon("toString"), false);
  assert.throws(() => filledIconPaths("toString","Regular-S"));
  assert.throws(() => filledIconPaths("action.copy","invalid"));
  assert.throws(() => createFilledSvg("action.copy","Regular-S",'<script>'));
  assert.throws(() => renderToStaticMarkup(createElement(AcmIcon,{name:"library.files",appearance:"filled",variant:"media",mediaColour:"#123456"})));
});

test("Search keeps its original lens and handle, changing only the lens fill", () => {
  for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
    const { paths, faces, strokes, cutouts } = filledIconArtwork("action.search", scale);
    assert.deepEqual(faces, [0]);
    assert.deepEqual(strokes, [0, 1]);
    assert.deepEqual(cutouts, []);
    assert.equal(paths[0].d, iconGeometry["action.search"][scale].paths[0].d);
    assert.equal(paths[1].d, iconGeometry["action.search"][scale].paths[1].d);
  }
});

test("open Upload and Download remain Outline only", () => {
  for (const name of ["action.upload", "action.download"]) {
    assert.equal(hasFilledIcon(name), false);
    assert.throws(() => filledIconPaths(name, "Regular-S"));
    assert.throws(() => renderToStaticMarkup(createElement(AcmIcon, { name, appearance: "filled" })));
  }
});

test("small Search keeps a legible handle beside its filled lens", () => {
  const [lens, handle] = iconGeometry["action.search"]["Regular-S"].paths.map(path => path.d);
  const lensX = [...lens.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0])).filter((_, index) => index % 2 === 0);
  const coordinates = [...handle.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  const handleLength = Math.hypot(coordinates[2] - coordinates[0], coordinates[3] - coordinates[1]);
  const lensDiameter = Math.max(...lensX) - Math.min(...lensX);
  assert.ok(handleLength / lensDiameter >= 0.75, "the 16px handle must remain distinct from the solid lens");
});

test("Delete keeps two separate body marks at every optical size", () => {
  for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
    const artwork = filledIconArtwork("action.delete", scale);
    assert.deepEqual(artwork.cutouts, [3, 4]);
    assert.equal(artwork.paths.length, 5);
  }
});


test("table action fills preserve scale-specific dividers and operation marks", () => {
  for (const name of ["table.row-before", "table.row-after", "table.column-before", "table.column-after", "table.row-delete", "table.column-delete"]) {
    for (const [scale, expected] of [["Regular-S", [1]], ["Regular-M", [1, 2]], ["Regular-L", [1, 2, 3]]]) {
      const { paths, cutouts, strokes } = filledIconArtwork(name, scale);
      assert.deepEqual(cutouts, expected);
      for (const index of expected) assert.equal(strokes.includes(index), false);
      for (let index = expected.length + 1; index < paths.length; index++) assert.equal(strokes.includes(index), true);
    }
  }
});


test("solid master details use their exact shapes as transparent cutouts", () => {
  for (const name of ["state.warning", "action.help", "state.caution", "device.mobile", "insert.video", "layout.column", "text.caption", "arrange.group", "arrange.ungroup", "site.identity"]) {
    for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
      const artwork = filledIconArtwork(name, scale);
      const solidMasterPaths = iconGeometry[name][scale].paths.filter(path => path.fill === "currentColor" && path.stroke === "none").flatMap(path => path.d.split(/ +(?=M )/));
      assert.deepEqual(artwork.solidCutouts.map(index => artwork.paths[index].d), solidMasterPaths);
      for (const index of artwork.solidCutouts) {
        assert.ok(artwork.cutouts.includes(index));
        assert.ok(!artwork.strokes.includes(index));
        assert.ok(createFilledSvg(name, scale, 24).includes(`d="${artwork.paths[index].d}" fill="black" stroke="none"`));
      }
    }
  }
});


test("template fill follows each optical master without obscuring its rear page", () => {
  for (const [scale, faces, cutouts] of [["Regular-S", [1], [2, 3]], ["Regular-M", [2], [3, 4, 5]], ["Regular-L", [2], [3, 4, 5]]]) {
    const artwork = filledIconArtwork("document.from-template", scale);
    assert.deepEqual(artwork.faces, faces);
    assert.deepEqual(artwork.cutouts, cutouts);
    assert.ok(artwork.strokes.includes(0));
  }
});


test("separate solid master details retain their original unstroked geometry", () => {
  for (const name of ["view.shadow", "arrange.backward", "arrange.back"]) for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
    const artwork = filledIconArtwork(name, scale);
    const original = iconGeometry[name][scale].paths.filter(path => path.fill === "currentColor" && path.stroke === "none").flatMap(path => path.d.split(/ +(?=M )/));
    assert.deepEqual(artwork.retainedSolids.map(index => artwork.paths[index].d), original);
    for (const index of artwork.retainedSolids) assert.ok(!artwork.strokes.includes(index));
  }
});

test("information dot cuts out its original filled and stroked shape", () => {
  for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
    const artwork = filledIconArtwork("state.info", scale);
    assert.deepEqual(artwork.solidStrokedCutouts, [1]);
    assert.ok(createFilledSvg("state.info", scale, 24).includes(`d="${artwork.paths[1].d}" fill="black" stroke="black"`));
  }
});


test("publication date retains its binding strokes and original header", () => {
  for (const scale of ["Regular-S", "Regular-M", "Regular-L"]) {
    const artwork = filledIconArtwork("document.date", scale);
    assert.deepEqual(artwork.solidCutouts, [1]);
    assert.deepEqual(artwork.cutouts, [1, 4]);
    assert.ok(artwork.strokes.includes(2));
    assert.ok(artwork.strokes.includes(3));
  }
});
