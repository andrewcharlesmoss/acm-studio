import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { createFeatureSvg, featureArtwork, hasFeatureColours } from '../src/feature-colours.js';
const names = ['library.designs', 'insert.shapes'];
test('feature variants use Accent and a contrasting keyline at each optical scale', () => {
  for (const name of names) for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const paths = featureArtwork(name, scale, '#0088FF');
    assert.equal(hasFeatureColours(name), true);
    assert.ok(paths.some(path => path.stroke === '#0088FF'));
    assert.ok(paths.some(path => path.stroke === '#000000'));
    const svg = createFeatureSvg(name, scale, 24, '#0088FF');
    const react = renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'feature', featureColour: '#0088FF' }));
    for (const path of paths) { assert.ok(svg.includes(path.d)); assert.ok(react.includes(path.d)); }
    assert.doesNotMatch(svg, /currentColor/);
    assert.match(renderToStaticMarkup(createElement(AcmIcon, { name, scale })), /currentColor/);
  }
});
test('feature variants validate names, scales, sizes and colours', () => {
  assert.equal(hasFeatureColours('toString'), false);
  assert.throws(() => featureArtwork('action.undo', 'Regular-M', '#0088FF'));
  assert.throws(() => featureArtwork('insert.shapes', 'wrong', '#0088FF'));
  assert.throws(() => featureArtwork('insert.shapes', 'Regular-M', 'blue'));
  assert.throws(() => createFeatureSvg('insert.shapes', 'Regular-M', 0, '#0088FF'));
});
