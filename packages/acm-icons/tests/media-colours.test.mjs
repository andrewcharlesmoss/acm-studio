import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { createMediaSvg, mediaColourRole } from '../src/media-colours.js';

const mediaIcons = [
  ['library.files', 'Files', false],
  ['insert.image', 'Image', false],
  ['insert.audio', 'Audio', true],
  ['insert.video', 'Video', true],
  ['media.gallery', 'Gallery', true],
];

test('media symbols use the universal Accent colour at every optical scale', () => {
  for (const [name, label, hasFilledDetail] of mediaIcons) {
    assert.equal(mediaColourRole(name), 'accent');
    for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
      const markup = renderToStaticMarkup(createElement(AcmIcon, {
        name,
        scale,
        variant: 'media',
        mediaColour: '#0088FF',
        label,
      }));
      assert.match(markup, /stroke="#0088FF"/);
      if (hasFilledDetail) assert.match(markup, /fill="#0088FF"/);
      assert.match(markup, new RegExp(`aria-label="${label}"`));

      const svg = createMediaSvg(name, scale, 24, '#0088FF');
      assert.match(svg, /stroke="#0088FF"/);
      assert.match(svg, new RegExp(`<title>${label}</title>`));
      assert.doesNotMatch(svg, /currentColor/);
    }
  }
});

test('media colour is restricted to the supported symbols and valid palette colours', () => {
  assert.equal(mediaColourRole('media.camera'), undefined);
  assert.equal(mediaColourRole('toString'), undefined);
  assert.equal(mediaColourRole('__proto__'), undefined);
  assert.throws(() => createMediaSvg('action.undo', 'Regular-M', 24, '#0088FF'));
  assert.throws(() => createMediaSvg('insert.image', 'Regular-M', 24, 'blue'));
  assert.throws(() => createMediaSvg('insert.image', 'Regular-M', 513, '#0088FF'));
  assert.throws(() => renderToStaticMarkup(createElement(AcmIcon, {
    name: 'action.undo', variant: 'media', mediaColour: '#0088FF',
  })));
  assert.throws(() => renderToStaticMarkup(createElement(AcmIcon, {
    name: 'insert.image', variant: 'media', mediaColour: 'url(javascript:alert(1))',
  })));
});

test('default media symbols keep their existing monochrome currentColor appearance', () => {
  const markup = renderToStaticMarkup(createElement(AcmIcon, { name: 'insert.image' }));
  assert.match(markup, /stroke="currentColor"/);
  assert.doesNotMatch(markup, /#0088FF/);
});
