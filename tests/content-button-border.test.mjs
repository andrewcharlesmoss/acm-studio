import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const stylesheet = await readFile(new URL('../app/content/buttons.css', import.meta.url), 'utf8');

test('outlined content buttons inherit the saved website border width before the Gutenberg fallback', () => {
  const root = postcss.parse(stylesheet);
  let border;

  root.walkRules(rule => {
    if (!rule.selectors.includes('.content-button.is-secondary')) return;
    border = rule.nodes.find(node => node.type === 'decl' && node.prop === 'border')?.value;
  });

  assert.equal(
    border,
    'var(--button-base-border-width, var(--acm-button-base-border-width, 2px)) var(--button-base-border-style, solid) var(--button-base-border-color, currentColor)',
    'block-specific styling stays first, a saved website setting overrides the 2px Gutenberg default, and the default remains as the fallback',
  );
});
