import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL("../app/components/content.tsx", import.meta.url));
const { imageWrapperStyle, imageDisplayStyle } = await loadProductionModule(new URL("../app/content/image-style.ts", import.meta.url));

const block = {
  id: "image", type: "image", src: "https://example.com/photo.jpg", alt: "Photo", caption: "Image caption",
  aspectRatio: "square", displayWidth: 320, focalX: 25, focalY: 75,
  visualStyle: {
    anchor: "photo", className: "custom-image", margin: "8px",
    additionalCss: "outline: 2px solid red; padding: 12px; background-color: #ffdddd;",
    borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "12px", shadow: "soft",
  },
};

test("Image wrapper declarations and image frame have separate canonical targets", () => {
  const wrapper = imageWrapperStyle(block);
  assert.equal(wrapper.margin, "8px");
  assert.equal(wrapper.outline, "2px solid red");
  assert.equal(wrapper.padding, "12px");
  assert.equal(wrapper.backgroundColor, "#ffdddd");
  for (const key of ["borderStyle", "borderWidth", "borderColor", "borderRadius", "boxShadow"]) {
    assert.equal(wrapper[key], undefined, key);
    assert.ok(imageDisplayStyle(block)[key], key);
  }
});

test("Image Additional CSS reaches Edit and both preview variants without duplicating its frame", () => {
  const before = JSON.stringify(block);
  const edit = renderToStaticMarkup(createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {} }));
  const outputs = [edit, ...["studio", "article"].map(variant => renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant })))];
  for (const html of outputs) {
    const wrapperTag = html.match(/<div[^>]*class="block-visual-style[^>]*>/)?.[0];
    assert.ok(wrapperTag, html);
    assert.match(wrapperTag, /id="photo"/);
    assert.match(wrapperTag, /custom-image/);
    assert.match(wrapperTag, /outline:2px solid red/);
    assert.match(wrapperTag, /padding:12px/);
    assert.match(wrapperTag, /background-color:#ffdddd/);
    assert.match(wrapperTag, /margin:8px/);
    assert.doesNotMatch(wrapperTag, /border-(?:style|width|color|radius):|box-shadow:/);
    assert.equal((html.match(/border-style:solid/g) ?? []).length, 1);
    assert.equal((html.match(/box-shadow:/g) ?? []).length, 1);
    assert.match(html, /width:320px;aspect-ratio:1 \/ 1;object-fit:cover;object-position:25% 75%/);
    assert.match(html, /Image caption/);
    assert.match(html, /alt="Photo"/);
  }
  assert.equal(JSON.stringify(block), before);
});

test("clearing Additional CSS preserves Image frame and margin", () => {
  const cleared = { ...block, visualStyle: { ...block.visualStyle, additionalCss: "" } };
  const wrapper = imageWrapperStyle(cleared);
  assert.equal(wrapper.margin, "8px");
  for (const key of ["outline", "padding", "backgroundColor"]) assert.equal(wrapper[key], undefined);
  assert.deepEqual(imageDisplayStyle(cleared), imageDisplayStyle(block));
  assert.deepEqual(imageWrapperStyle({}), {});
});

test("Image wrapper continues to reject unsafe Additional CSS declarations", () => {
  const unsafe = { visualStyle: { additionalCss: "background-image: url(javascript:alert(1)); position: fixed; outline: 2px solid red;" } };
  const wrapper = imageWrapperStyle(unsafe);
  assert.equal(wrapper.backgroundImage, undefined);
  assert.equal(wrapper.position, undefined);
  assert.deepEqual(wrapper, {}, "the existing parser rejects the entire unsafe declaration list");
});
