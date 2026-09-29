import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/content/paragraph-styles.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { fitTextEnabled, paragraphStyleToCss, paragraphStyleClassName, visualStyleClassName, parseAdditionalCssDeclarations, paragraphLinkColourHasPoorContrast } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const layoutSource = await readFile(new URL("../app/content/layout.ts", import.meta.url), "utf8");
const compiledLayout = ts.transpileModule(layoutSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { layoutStyleProperties, validLayoutOptions } = await import(`data:text/javascript;base64,${Buffer.from(compiledLayout).toString("base64")}`);

test("paragraph typography settings render as CSS without changing the text", () => {
  const style = { textIndent: "24px", textColumns: 2, dropCap: true };
  assert.deepEqual(paragraphStyleToCss(style), { columnCount: "2", columnGap: "1.5em" });
  assert.deepEqual(paragraphStyleToCss(style, undefined, style.textIndent), { textIndent: "24px", columnCount: "2", columnGap: "1.5em" });
  assert.equal(paragraphStyleClassName(style), "has-drop-cap");
  assert.equal(paragraphStyleClassName(style, "left"), "has-drop-cap");
  assert.equal(paragraphStyleClassName(style, "centre"), "");
  assert.equal(paragraphStyleClassName(style, "right"), "");
  assert.equal(paragraphStyleClassName({ ...style, className: "custom-paragraph" }), "has-drop-cap custom-paragraph");
  assert.equal(paragraphStyleClassName({ ...style, className: "custom-paragraph" }, "right"), "custom-paragraph");
  assert.deepEqual(paragraphStyleToCss(), {});
  assert.equal(paragraphStyleClassName({ fitText: true }), "has-fit-text");
  assert.equal(paragraphStyleToCss({ fitText: true, fontSize: "xx-large" }).fontSize, undefined);
  assert.match(visualStyleClassName({ fitText: true }), /has-fit-text/);
});

test("Paragraph link colours keep Default and Hover independent and preserve legacy hover styling", () => {
  assert.deepEqual(paragraphStyleToCss({ linkColor: "#2f6eb4", linkHoverColor: "#1e1e1e" }), {
    "--studio-paragraph-link-color": "#2f6eb4",
    "--studio-paragraph-link-hover-color": "#1e1e1e",
    "--studio-paragraph-link-hover-filter": "none",
  });
  assert.deepEqual(paragraphStyleToCss({ linkColor: "#2f6eb4" }), { "--studio-paragraph-link-color": "#2f6eb4" });
});

test("Paragraph Link colour contrast warns only when an opaque foreground is below 4.5:1", () => {
  assert.equal(paragraphLinkColourHasPoorContrast("#FF8D28", undefined), true);
  assert.equal(paragraphLinkColourHasPoorContrast("#636366", undefined), false);
  assert.equal(paragraphLinkColourHasPoorContrast("#fff", undefined, "#1C1C1E"), false);
  assert.equal(paragraphLinkColourHasPoorContrast("#FF8D28", { backgroundColor: "#1C1C1E" }), false);
  assert.equal(paragraphLinkColourHasPoorContrast("#FFFFFF", { backgroundGradient: "ocean" }), true);
  assert.equal(paragraphLinkColourHasPoorContrast("#1C1C1E", { backgroundGradient: "ocean" }), false);
  assert.equal(paragraphLinkColourHasPoorContrast("rgba(255, 56, 60, 1)", undefined), null);
  assert.equal(paragraphLinkColourHasPoorContrast("#FF383C", { backgroundImageMediaId: "media-1" }), null);
});

test("Additional CSS applies safe scoped declarations and ignores selectors or external resources", () => {
  assert.deepEqual(parseAdditionalCssDeclarations("color: red; padding: calc(1rem + 2px); --custom-tone: 'blue green';"), {
    color: "red", padding: "calc(1rem + 2px)", "--custom-tone": "'blue green'",
  });
  assert.deepEqual(parseAdditionalCssDeclarations("colour: red;"), { color: "red" });
  assert.deepEqual(paragraphStyleToCss({ additionalCss: "colour: red;" }), { color: "red" });
  assert.deepEqual(paragraphStyleToCss({ additionalCss: "color: red; line-height: 2;" }), { color: "red", lineHeight: "2" });
  for (const source of ["color: red; } body { display: none", "background-image: url(https://example.test/image.png)", "@import url(https://example.test/style.css)", "color: red !important", "color: red\\3b background: blue"]) {
    assert.deepEqual(parseAdditionalCssDeclarations(source), {});
  }
});

test("legacy additional classes remain in output when the Gutenberg-disabled control is hidden", () => {
  assert.equal(paragraphStyleClassName({ className: "legacy-paragraph-class" }), "legacy-paragraph-class");
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

test("background images retain gradient layering, size, repeat and focal position", () => {
  const url = "blob:http://localhost/asset";
  assert.deepEqual(paragraphStyleToCss({ backgroundGradient: "ocean", backgroundSize: "fixed", backgroundFixedSize: 320, backgroundRepeat: "no-repeat", backgroundPositionX: 25, backgroundPositionY: 75 }, url), {
    backgroundImage: "linear-gradient(135deg, #bae6fd, #a5b4fc), url(\"blob:http://localhost/asset\")",
    backgroundSize: "auto, 320px auto",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundPosition: "center, 25% 75%",
  });
  assert.deepEqual(paragraphStyleToCss({ backgroundSize: "contain" }, url), {
    backgroundImage: "url(\"blob:http://localhost/asset\")",
    backgroundSize: "contain",
    backgroundPosition: "50% 50%",
    backgroundRepeat: "no-repeat",
  });
});

test("layout gap axes render independently and preserve legacy gap fallback", () => {
  assert.deepEqual(layoutStyleProperties({ gap: 16, columnGap: 32, rowGap: 8 }), {
    "--block-layout-gap": "16px",
    "--block-layout-column-gap": "32px",
    "--block-layout-row-gap": "8px",
    "--block-layout-min-column-width": "192px",
    "--block-layout-max-column-width": "calc((100% - 64px) / 3)",
  });
  assert.deepEqual(layoutStyleProperties({ gap: 16 }), {
    "--block-layout-gap": "16px",
    "--block-layout-min-column-width": "192px",
    "--block-layout-max-column-width": "calc((100% - 32px) / 3)",
  });
  assert.equal(validLayoutOptions({ gap: 16, columnGap: 32, rowGap: 8 }), true);
  assert.equal(validLayoutOptions({ columnGap: 121 }), false);
  assert.equal(validLayoutOptions({ rowGap: -1 }), false);
});

test("sticky Group position maps to a zero-offset sticky style", () => {
  assert.deepEqual(layoutStyleProperties({ position: "sticky" }), {
    position: "sticky",
    top: "0px",
    zIndex: 10,
    "--block-layout-min-column-width": "192px",
    "--block-layout-max-column-width": "calc((100% - 0px) / 3)",
  });
});

test("minimum dimensions and text shadow reach CSS", () => {
  assert.deepEqual(paragraphStyleToCss({ minHeight: "12rem", minWidth: "30ch", textShadow: "soft" }), {
    minHeight: "12rem",
    minWidth: "30ch",
    textShadow: "0 1px 2px rgb(0 0 0 / 28%)",
  });
});
