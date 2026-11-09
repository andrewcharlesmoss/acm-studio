import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createHostModuleEvaluator } from './production-module.mjs';
import { loadProductionModule } from './production-module.mjs';

const source = await readFile(new URL('../app/studio/blocks/grid-child-resize-handles.tsx', import.meta.url), 'utf8');
const { gridTrackGeometry, gridGuideCells } = await loadProductionModule(new URL('../app/studio/blocks/grid-track-geometry.ts', import.meta.url));
const tree = ts.createSourceFile('grid-resize.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let measure;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'gridTracks') measure = node; ts.forEachChild(node, visit); }
visit(tree); assert.ok(measure);
const compile = createHostModuleEvaluator(['getComputedStyle', 'gridTrackGeometry'], `${measure.getText(tree)};return gridTracks;`);

test('Grid drag stride measures visible tracks and gaps without averaging collapsed auto-fit tracks', () => {
  for (const [axis, tracks, gap, expected] of [
    ['column', '309px 309px 0px 0px', '20px', { count: 2, stride: 329 }],
    ['column', '0px 120px 0px', '12px', { count: 1, stride: 132 }],
    ['column', '100px 100px 100px', '16px', { count: 3, stride: 116 }],
    ['row', '60px 60px 0px', '8px', { count: 2, stride: 68 }],
    ['row', '50px 100px', '10px', { count: 2, stride: 85 }],
    ['column', '0px 0px', '20px', { count: 1, stride: 0 }],
    ['row', 'none', 'normal', { count: 1, stride: 0 }],
  ]) {
    const computed = { gridTemplateColumns: axis === 'column' ? tracks : '900px', gridTemplateRows: axis === 'row' ? tracks : '900px', columnGap: axis === 'column' ? gap : '90px', rowGap: axis === 'row' ? gap : '90px' };
    const measureTracks = compile(() => computed, gridTrackGeometry);
    assert.deepEqual(measureTracks({}, axis), expected, `${axis}: ${tracks}`);
    assert.deepEqual(measureTracks(null, axis), { count: 1, stride: 0 });
  }
});

test('multi-row guides retain real cell positions while skipping collapsed tracks', () => {
  assert.deepEqual(gridGuideCells('100px 0px 120px', '40px 0px 60px'), [
    { column: 1, row: 1 }, { column: 3, row: 1 },
    { column: 1, row: 3 }, { column: 3, row: 3 },
  ]);
  assert.deepEqual(gridGuideCells('0px 0px', '60px'), []);
  assert.deepEqual(gridGuideCells('none', 'none'), [{ column: 1, row: 1 }]);
});
