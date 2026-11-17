import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { annotationArtwork, createAnnotationSvg, hasAnnotationColours } from '../src/annotation-colours.js';

const colours = { ink: '#1C1C1E', surface: '#FFFFFF', highlight: '#FFCC00' };
test('annotation artwork uses shared palette and matches exported paths at every scale', () => {
  for (const name of ['insert.highlight', 'insert.redaction']) for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const paths = annotationArtwork(name, scale, colours);
    const react = renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'annotation', annotationColours: colours }));
    const svg = createAnnotationSvg(name, scale, 24, colours);
    assert.ok(paths.some(path => path.stroke === colours.surface));
    assert.ok(paths.some(path => path.stroke === colours.ink));
    if (name === 'insert.highlight') assert.ok(paths.some(path => path.stroke === colours.highlight));
    else assert.ok(paths.some(path => path.fill === colours.ink));
    for (const path of paths) { assert.ok(react.includes(path.d)); assert.ok(svg.includes(path.d)); }
    assert.doesNotMatch(svg, /currentColor/);
  }
});
test('annotation artwork rejects unsupported names, scales and colours', () => {
  assert.equal(hasAnnotationColours('action.undo'), false);
  assert.throws(() => annotationArtwork('action.undo', 'Regular-M', colours));
  assert.throws(() => annotationArtwork('insert.highlight', 'bad', colours));
  assert.throws(() => createAnnotationSvg('insert.redaction', 'Regular-M', 24, { ...colours, ink: 'red' }));
  assert.throws(() => createAnnotationSvg('insert.redaction', 'Regular-M', 0, colours));
});

test('low contrast palette uses a contrasting keyline and marker stays inside canvas', () => {
  const paths = annotationArtwork('insert.highlight', 'Regular-L', { ink: '#111111', surface: '#151515', highlight: '#FFCC00' });
  assert.equal(paths[0].stroke, '#FFFFFF');
  assert.ok(paths.slice(1).some(path => path.d.includes('22')));
  assert.ok(paths.every(path => !path.d.includes('22.3')));
});
