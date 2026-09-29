import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/content/paragraph-styles.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { fitTextEnabled, paragraphStyleToCss, paragraphStyleClassName, visualStyleClassName } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const layoutSource = await readFile(new URL("../app/content/layout.ts", import.meta.url), "utf8");
const compiledLayout = ts.transpileModule(layoutSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { layoutStyleProperties, validLayoutOptions } = await import(`data:text/javascript;base64,${Buffer.from(compiledLayout).toString("base64")}`);

test("paragraph typography settings render as CSS without changing the text", () => {
  const style = { textIndent: "24px", textColumns: 2, dropCap: true };
  assert.deepEqual(paragraphStyleToCss(style), { textIndent: "24px", columnCount: "2", columnGap: "1.5em" });
  assert.equal(paragraphStyleClassName(style), "has-drop-cap");
  assert.equal(paragraphStyleClassName({ ...style, className: "custom-paragraph" }), "has-drop-cap custom-paragraph");
  assert.deepEqual(paragraphStyleToCss(), {});
  assert.equal(paragraphStyleClassName({ fitText: true }), "has-fit-text");
  assert.equal(paragraphStyleToCss({ fitText: true, fontSize: "xx-large" }).fontSize, undefined);
  assert.match(visualStyleClassName({ fitText: true }), /has-fit-text/);
});

test("vertical orientation preserves typography and temporarily suspends horizontal Fit text", () => {
  const style = { orientation: "vertical-rl", fitText: true, fontSize: "large", textColumns: 2 };
  assert.equal(fitTextEnabled(style), false);
  assert.deepEqual(paragraphStyleToCss(style), { fontSize: "20px", columnCount: "2", columnGap: "1.5em", writingMode: "vertical-rl", textOrientation: "mixed" });
  assert.equal(paragraphStyleClassName(style), "");
  assert.equal(fitTextEnabled({ ...style, orientation: "horizontal-tb" }), true);
  assert.equal(paragraphStyleToCss({ ...style, orientation: "horizontal-tb" }).fontSize, undefined);
});

test("custom font sizes and the full Appearance range reach CSS without changing legacy values", () => {
  assert.deepEqual(paragraphStyleToCss({ fontSizeCustom: "1.75rem", appearance: "semi-bold-italic" }), { fontSize: "1.75rem", fontStyle: "italic", fontWeight: "600" });
  assert.deepEqual(paragraphStyleToCss({ appearance: "thin" }), { fontStyle: "normal", fontWeight: "100" });
  assert.deepEqual(paragraphStyleToCss({ appearance: "black-italic" }), { fontStyle: "italic", fontWeight: "900" });
  assert.deepEqual(paragraphStyleToCss({ appearance: "regular" }), { fontStyle: "normal", fontWeight: "400" });
  assert.deepEqual(paragraphStyleToCss({ appearance: "italic" }), { fontStyle: "italic", fontWeight: "400" });
  assert.deepEqual(paragraphStyleToCss({ appearance: "bold-italic" }), { fontStyle: "italic", fontWeight: "700" });
  assert.equal(paragraphStyleToCss({ fontSizeCustom: "32px", fitText: true }).fontSize, undefined);
  assert.match(visualStyleClassName({ fontSizeCustom: "32px" }), /has-custom-font-size/);
});

test("axis spacing and separate border sides reach CSS as authored", () => {
  const css = paragraphStyleToCss({ padding: "12px 24px", margin: "-1rem 2rem 0 4px", borderStyle: "dotted", borderWidth: "1px 2px 3px 4px", borderRadius: "4px 8px 12px 16px" });
  assert.equal(css.padding, "12px 24px");
  assert.equal(css.margin, "-1rem 2rem 0 4px");
  assert.equal(css.borderStyle, "dotted");
  assert.equal(css.borderWidth, "1px 2px 3px 4px");
  assert.equal(css.borderRadius, "4px 8px 12px 16px");
});

test("layout gap axes render independently and preserve legacy gap fallback", () => {
  assert.deepEqual(layoutStyleProperties({ gap: 16, columnGap: 32, rowGap: 8 }), {
    "--block-layout-gap": "16px",
    "--block-layout-column-gap": "32px",
    "--block-layout-row-gap": "8px",
  });
  assert.deepEqual(layoutStyleProperties({ gap: 16 }), { "--block-layout-gap": "16px" });
  assert.equal(validLayoutOptions({ gap: 16, columnGap: 32, rowGap: 8 }), true);
  assert.equal(validLayoutOptions({ columnGap: 121 }), false);
  assert.equal(validLayoutOptions({ rowGap: -1 }), false);
});

test("minimum dimensions and text shadow reach CSS", () => {
  assert.deepEqual(paragraphStyleToCss({ minHeight: "12rem", minWidth: "30ch", textShadow: "soft" }), {
    minHeight: "12rem",
    minWidth: "30ch",
    textShadow: "0 1px 2px rgb(0 0 0 / 28%)",
  });
});
