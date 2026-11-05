import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';
const lengths = await loadProductionModule(new URL('../app/content/box-lengths.ts', import.meta.url));
const preview = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const css = await loadProductionModule(new URL('../app/content/paragraph-styles.ts', import.meta.url));
const responsive = await loadProductionModule(new URL('../app/content/responsive-styles.ts', import.meta.url));
const validation = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));

test('individual border widths and corners retain inherited neighbours across website changes', () => {
 const owned = lengths.updateBorderRadiusCorners(lengths.updateBorderWidthSides({}, [0], '3px'), [0], '7px');
 const style = parent => css.paragraphStyleToCss(preview.projectedStyle({ borderStyle: 'solid', borderWidth: parent, borderRadius: parent }, owned));
 assert.deepEqual([style('10px').borderTopWidth, style('10px').borderRightWidth, style('10px').borderTopLeftRadius, style('10px').borderTopRightRadius], ['3px', '10px', '7px', '10px']);
 assert.deepEqual([style('20px').borderTopWidth, style('20px').borderRightWidth, style('20px').borderTopLeftRadius, style('20px').borderTopRightRadius], ['3px', '20px', '7px', '20px']);
 assert.deepEqual(owned, { borderWidthSides: { top: '3px' }, borderRadiusCorners: { topLeft: '7px' } });
});

test('responsive border deltas and resets keep untouched sides live', () => {
 const style = { borderStyle: 'solid', borderWidthSides: { right: '4px' }, borderRadiusCorners: { topRight: '6px' }, responsive: { tablet: { borderWidthSides: { top: '2px' }, borderRadiusCorners: { topLeft: '9px' } } } };
 const effective = responsive.styleForViewport(style, 'tablet');
 assert.deepEqual(effective.borderWidthSides, { right: '4px', top: '2px' });
 assert.deepEqual(effective.borderRadiusCorners, { topRight: '6px', topLeft: '9px' });
 const mapped = css.paragraphStyleToCss(style);
 assert.equal(mapped['--studio-rs-tablet-border-top-width'], '2px');
 assert.equal(mapped['--studio-rs-tablet-border-top-left-radius'], '9px');
 assert.deepEqual(lengths.updateBorderRadiusCorners({ borderRadius: '10px' }, [0], undefined), { borderRadiusCorners: { topRight: '10px', bottomRight: '10px', bottomLeft: '10px' } });
});

test('border side data is validated, version gated, and survives HTML', async () => {
 const style = { borderStyle: 'solid', borderWidthSides: { top: '3px' }, borderRadiusCorners: { topLeft: '7px' } };
 assert.equal(validation.validParagraphStyle(style), true);
 assert.equal(validation.validParagraphStyle({ borderWidthSides: { top: '-3px' } }), false);
 assert.equal(validation.validParagraphStyle({ borderRadiusCorners: { diagonal: '3px' } }), false);
 const editor = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
 const doc = structuredClone(editor.initialStudioWorkspace.documents[0]);
 doc.blocks = [{ id: 'p', type: 'paragraph', text: 'Test', style }];
 const workspace = { version: 58, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] };
 assert.doesNotThrow(() => validation.validateStudioWorkspace(workspace));
 assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 57 }));
 const html = await loadProductionModule(new URL('../app/studio/studio-html-editor.ts', import.meta.url));
 const { withHtmlDom } = await import('./html-dom-fixture.mjs');
 await withHtmlDom(() => { const parsed = html.parseHtmlToBlocks(html.blocksToHtml(doc.blocks), []).blocks[0].style; assert.deepEqual(parsed.borderWidthSides, style.borderWidthSides); assert.deepEqual(parsed.borderRadiusCorners, style.borderRadiusCorners); });
});

test('border inheritance indicator accounts for width sides, colour and style independently', async () => {
 const { contentSettingInheritance } = await loadProductionModule(new URL('../app/studio/blocks/style-inheritance.tsx', import.meta.url));
 const block = { id: 'p', type: 'paragraph', text: 'Test' };
 const all = { top: '8px', right: '8px', bottom: '8px', left: '8px' };
 const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { paragraph: { borderWidth: '10px' } } };
 const label = (style, owned = style, website = selection, viewport = 'desktop') => contentSettingInheritance({ ...block, style }, owned, website, viewport).Border;
 assert.equal(label({}), true);
 assert.equal(label({ borderWidthSides: { top: '8px' } }), true);
 assert.equal(label({ borderWidthSides: all }), false);
 assert.equal(label({ borderWidth: '8px' }), false);
 const style = { borderWidthSides: all };
 assert.equal(label(style, style, { ...selection, blockStyles: { paragraph: { borderWidth: '10px', borderStyle: 'dashed' } } }), true);
 assert.equal(label(style, style, { ...selection, blockStyles: { paragraph: { borderWidth: '10px', borderColor: '#abcdef' } } }), true);
 const fullyOwned = { ...style, borderStyle: 'solid', borderColor: '#111111' };
 assert.equal(label(fullyOwned, fullyOwned, { ...selection, blockStyles: { paragraph: { borderWidth: '10px', borderStyle: 'dashed', borderColor: '#abcdef' } } }), false);
 const tablet = { borderWidthSides: all, responsive: { tablet: { borderWidthSides: { top: '2px' } } } };
 assert.equal(label(tablet, { borderWidthSides: { top: '2px' } }, selection, 'tablet'), true);
 const tabletAll = { ...tablet, responsive: { tablet: { borderWidthSides: all } } };
 assert.equal(label(tabletAll, tabletAll.responsive.tablet, selection, 'tablet'), false);
});
