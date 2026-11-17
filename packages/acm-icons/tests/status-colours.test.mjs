import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcmIcon } from '../src/react.js';
import { statusColourRole, createStatusSvg, statusForeground } from '../src/status-colours.js';

test('status symbols use their universal semantic colours at every scale', () => {
  for (const [name, role] of Object.entries({ 'state.info': 'information', 'state.warning': 'warning', 'state.caution': 'warning', 'state.error': 'alert', 'state.published': 'success' })) {
    assert.equal(statusColourRole(name), role);
    for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
      const html = renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'status', statusColour: '#FF8D28', label: 'Status' }));
      assert.match(html, /#FF8D28/);
      assert.match(html, /stroke="#000000"/);
      assert.match(createStatusSvg(name, scale, 24, "#FF8D28"), /#FF8D28/);
      assert.match(html, /aria-label="Status"/);
    }
    assert.doesNotMatch(renderToStaticMarkup(createElement(AcmIcon, { name })), /--acm-color-/);
  }
  assert.equal(statusForeground('#000000'), '#FFFFFF');
  assert.equal(statusForeground('#FFFFFF'), '#000000');
  assert.throws(() => statusForeground('red'));
  assert.equal(statusColourRole('action.undo'), undefined);
  assert.equal(statusColourRole('toString'), undefined);
  assert.equal(statusColourRole('__proto__'), undefined);
  assert.throws(() => renderToStaticMarkup(createElement(AcmIcon, { name: 'action.undo', variant: 'status' })));
});
