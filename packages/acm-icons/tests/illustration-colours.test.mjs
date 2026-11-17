import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { illustrationArtwork, createIllustrationSvg } from '../src/illustration-colours.js';
const palette = { accent: '#0088FF', gold: '#FFCC00', green: '#34C759', ink: '#1C1C1E', surface: '#FFFFFF', subtle: '#F2F2F7' };
const names = ['library.files', 'insert.image', 'insert.audio', 'insert.video', 'media.gallery', 'library.designs', 'insert.shapes'];
test('illustrations share paths and paints across React and exports at each scale', () => {
  for (const name of names) for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const paths = illustrationArtwork(name, scale, palette);
    const svg = createIllustrationSvg(name, scale, 24, palette);
    const react = renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'illustration', illustrationColours: palette }));
    for (const path of paths) { assert.ok(svg.includes(path.d)); assert.ok(react.includes(path.d)); assert.ok(svg.includes(`stroke="${path.stroke}"`)); assert.ok(react.includes(`stroke="${path.stroke}"`)); }
    assert.match(renderToStaticMarkup(createElement(AcmIcon, { name, scale })), /currentColor/);
  }
});
test('illustration inputs are bounded', () => {
  assert.throws(() => illustrationArtwork('toString', 'Regular-M', palette));
  assert.throws(() => illustrationArtwork('insert.image', 'bad', palette));
  assert.throws(() => illustrationArtwork('insert.image', 'Regular-M', { ...palette, green: 'red' }));
  assert.throws(() => createIllustrationSvg('insert.image', 'Regular-M', 513, palette));
});

test('large Shapes keylines fit the canvas', () => {
  const paths = illustrationArtwork('insert.shapes', 'Regular-L', palette);
  const triangleHalo = paths[2];
  assert.equal(triangleHalo.strokeWidth, 3.4);
  assert.ok(22.3 + triangleHalo.strokeWidth / 2 <= 24);
});

test('Files illustration draws its inner detail without a filled keyline', () => {
  for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const paths = illustrationArtwork('library.files', scale, palette);
    assert.equal(paths.length, 3);
    assert.equal(paths[2].fill, 'none');
    assert.equal(paths[2].stroke, palette.ink);
  }
});
