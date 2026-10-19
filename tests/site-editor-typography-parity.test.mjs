import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { TypographyElementSettings } = await loadProductionModule(new URL('../app/studio/site-editor/typography-element-settings.tsx', import.meta.url));
const { ColourSwatches, colourSwatchCheckColour } = await loadProductionModule(new URL('../app/studio/controls/colour-picker.tsx', import.meta.url));
const { typographyAppearanceOptions } = await loadProductionModule(new URL('../app/studio/site-editor/font-appearance-select.tsx', import.meta.url));
const { stylePalettes, styleTypography } = await loadProductionModule(new URL('../app/studio/site-editor/style-reference-data.ts', import.meta.url));
const { resolvedTypographyFields, typographyFieldsCss } = await loadProductionModule(new URL('../app/studio/site-editor/typography-preview-model.ts', import.meta.url));
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
test('Links exposes decoration instead of letter spacing and case; other roles keep their controls', () => {
 const props = { typography: styleTypography[0], palette: stylePalettes[0], settings: {}, onChange() {}, onReset() {} };
 const links = render(TypographyElementSettings, { ...props, role: 'links' });
 assert.match(links, /Decoration/); assert.match(links, /Strikethrough/); assert.match(links, /Underline/);
 assert.doesNotMatch(links, /Letter Spacing|Letter Case/);
 const text = render(TypographyElementSettings, { ...props, role: 'text' });
 assert.match(text, /Letter Spacing/); assert.match(text, /Letter Case/); assert.doesNotMatch(text, /Decoration/);
});
test('website palette adapter renders only website swatches and preserves interface defaults', () => {
 const palette = stylePalettes[1].colours.map((colour, index) => ({ key: String(index), label: index === 0 ? 'Base' : index === 1 ? 'Contrast' : `Accent ${index - 1}`, colour }));
 const html = render(ColourSwatches, { palette, onChange() {} });
 assert.equal((html.match(/class="paragraph-colour-swatch(?: |")/g) ?? []).length, 8);
 assert.match(html, /Base, #1B1B1B/); assert.doesNotMatch(html, /Surface|Success|Warning/);
 const defaults = render(ColourSwatches, { onChange() {} });
 assert.equal((defaults.match(/class="paragraph-colour-swatch(?: |")/g) ?? []).length, 13);
 assert.match(defaults, /Surface/);
});
test('Appearance includes normal and italic CSS weights through 1000', () => {
 assert.equal(typographyAppearanceOptions.length, 21);
 for (const weight of [100, 400, 900, 1000]) for (const style of ['normal', 'italic']) assert.ok(typographyAppearanceOptions.some(option => option.value === `${weight}:${style}`));
});
test('colour alpha, link decoration and italic appearance inherit, reset together and undo correctly', () => {
 let state = createStylesPreview();
 const apply = action => { state = stylesPreviewReducer(state, action); };
 apply({ type: 'element', scope: 'global', role: 'links', patch: { colour: '#12345680', weight: 1000, fontStyle: 'italic', decoration: 'line-through' } });
 let settings = resolvePreviewStyle(state.present, 'test').typography;
 let css = typographyFieldsCss(resolvedTypographyFields(styleTypography[0], settings, 'links'), settings);
 assert.equal(css.color, '#12345680'); assert.equal(css.fontStyle, 'italic'); assert.equal(css.fontWeight, 1000); assert.equal(css.textDecoration, 'line-through');
 apply({ type: 'element', scope: 'test', role: 'links', patch: { weight: 300, fontStyle: 'normal' } });
 apply({ type: 'reset-element-fields', scope: 'test', role: 'links', fields: ['weight', 'fontStyle'] });
 settings = resolvePreviewStyle(state.present, 'test').typography;
 assert.equal(resolvedTypographyFields(styleTypography[0], settings, 'links').fontStyle, 'italic');
 apply({ type: 'undo' });
 settings = resolvePreviewStyle(state.present, 'test').typography;
 assert.equal(resolvedTypographyFields(styleTypography[0], settings, 'links').fontStyle, 'normal');
});

const { typographyColourPalette } = await loadProductionModule(new URL('../app/studio/site-editor/typography-colour-palette.ts', import.meta.url));
test('translucent contrast swatch keeps its actual colour in the custom editor and a readable selected mark', () => {
 const swatch = typographyColourPalette(stylePalettes[0])[7];
 assert.equal(swatch.colour, '#11111133');
 assert.equal(colourSwatchCheckColour(swatch.colour), '#1e1e1e');
 assert.equal(colourSwatchCheckColour('#111111'), '#fff');
 const html = render(ColourSwatches, { palette: typographyColourPalette(stylePalettes[0]), value: swatch.colour, onChange() {} });
 assert.match(html, /has-transparency/);
});
