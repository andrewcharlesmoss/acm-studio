import assert from 'node:assert/strict';
import test from 'node:test';
import { iconGeometry } from '../dist/index.js';

const scales = ['Regular-S', 'Regular-M', 'Regular-L'];
const points = path => [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(([n]) => Number(n));
const bounds = path => {
  const values = points(path);
  const xs = values.filter((_, i) => i % 2 === 0);
  const ys = values.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
test('ellipsis dots have matching rotated contours and visible filled diameters', () => {
  for (const [index, scale] of scales.entries()) {
    const horizontal = iconGeometry['action.more'][scale].paths;
    const vertical = iconGeometry['action.more-vertical'][scale].paths;
    assert.equal(horizontal.length, 3);
    assert.equal(vertical.length, 3);
    for (let dot = 0; dot < 3; dot++) {
      assert.equal(horizontal[dot].stroke, 'none');
      assert.equal(vertical[dot].stroke, 'none');
      assert.equal(horizontal[dot].fill, 'currentColor');
      const [x0, y0, x1, y1] = bounds(horizontal[dot]);
      assert.ok((y1 - y0) * [16, 24, 32][index] / 24 >= 2, scale + ' dot is at least two rendered pixels wide');
      assert.deepEqual(bounds(vertical[dot]), [y0, x0, y1, x1], scale + ' orientations have equal painted bounds');
    }
  }
});
test('small table actions leave visible painted clearance beside the operation mark', () => {
  for (const name of ['table.row-before', 'table.row-after', 'table.row-delete', 'table.column-before', 'table.column-after', 'table.column-delete']) {
    const glyph = iconGeometry[name]['Regular-S'];
    const grid = bounds(glyph.paths[0]);
    const mark = bounds(glyph.paths[1]);
    const separation = Math.max(grid[0] - mark[2], mark[0] - grid[2], grid[1] - mark[3], mark[1] - grid[3]) - glyph.strokeWidth;
    assert.ok(separation * 16 / 24 >= 1, name + ' has at least one rendered pixel of clear space');
  }
});

test('table deletion marks remain horizontal at every optical scale', () => {
  for (const name of ['table.row-delete', 'table.column-delete']) {
    for (const scale of scales) {
      const [x0, y0, x1, y1] = bounds(iconGeometry[name][scale].paths[1]);
      assert.ok(x1 > x0, name + '/' + scale + ' has a visible minus');
      assert.equal(y1, y0, name + '/' + scale + ' retains a horizontal minus');
    }
  }
});
