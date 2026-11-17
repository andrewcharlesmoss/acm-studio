import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { securityArtwork, createSecuritySvg } from '../src/security-colours.js';
const colours = { gold: '#FFCC00', neutral: '#636366', ink: '#1C1C1E', surface: '#FFFFFF', subtle: '#F2F2F7' };
test('security variants share palette artwork between React and export at all scales', () => {
  for (const name of ['security.lock', 'security.unlock', 'security.key', 'security.shield']) for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const paths = securityArtwork(name, scale, colours);
    const react = renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'security', securityColours: colours }));
    const svg = createSecuritySvg(name, scale, 24, colours);
    for (const path of paths) { assert.ok(react.includes(path.d)); assert.ok(svg.includes(path.d)); }
    assert.ok(paths.some(p => p.fill === colours.gold || p.stroke === colours.gold));
    assert.match(renderToStaticMarkup(createElement(AcmIcon, { name, scale })), /currentColor/);
  }
});
test('security artwork validates palette and applies a contrasting halo', () => {
  assert.throws(() => securityArtwork('action.undo', 'Regular-M', colours));
  assert.throws(() => securityArtwork('security.lock', 'Regular-M', { ...colours, gold: 'url(x)' }));
  assert.throws(() => createSecuritySvg('security.key', 'Regular-M', 513, colours));
  assert.equal(securityArtwork('security.lock', 'Regular-M', { ...colours, surface: '#151515' })[0].stroke, '#FFFFFF');
});

test('lock parts retain contrast with conflicting palette roles', () => {
  const paths = securityArtwork('security.lock', 'Regular-M', { ...colours, gold: '#1C1C1E', neutral: '#1C1C1E', subtle: '#1C1C1E' });
  assert.equal(paths[5].fill, '#1C1C1E');
  assert.equal(paths[5].stroke, '#FFFFFF');
  assert.equal(paths[6].stroke, '#FFFFFF');
  const shield = securityArtwork('security.shield', 'Regular-M', { ...colours, gold: '#F2F2F7' });
  assert.equal(shield[1].fill, '#000000');
});
