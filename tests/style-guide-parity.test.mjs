import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { styleGuideMarkdown } from './style-test-presets.mjs';
import { parseStyleGuidePresets, updateStyleGuideTokensFromDraft, indexStyleGuide } from '../app/studio/ui/styles/style-guide-tokens.mjs';

const { FormattedGuideDocument } = await loadProductionModule(new URL('../app/studio/ui/styles/formatted-guide-document.tsx', import.meta.url));

test('formatted defaults are canonical source rows with exact unique line numbers and columns', () => {
  const lines = styleGuideMarkdown.split('\n');
  assert.equal(lines.filter(line => line === '#### Defaults').length, 2);
  const html = renderToStaticMarkup(createElement(FormattedGuideDocument, { lines, query: '', active: true, onScroll() {}, guidePathByLine: {}, onSelectSource() {} }));
  const ids = [...html.matchAll(/id="sg-guide-formatted-line-(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(ids, lines.map((_, index) => index + 1));
  assert.doesNotMatch(html, /sg-original-defaults-table/);
  for (const [index, line] of lines.entries()) {
    if (!/^\| (typography|buttons)\./.test(line)) continue;
    const row = html.match(new RegExp(`<tr id="sg-guide-formatted-line-${index + 1}"[^>]*>([\\s\\S]*?)<\\/tr>`))?.[1];
    assert.ok(row, `source row ${index + 1} is rendered`);
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    assert.equal((row.match(/<(?:td|th)(?:\s|>)/g) ?? []).length, cells.length + 1);
    for (const cell of cells) assert.ok(row.includes(`>${cell}<`), `line ${index + 1} retains ${cell}`);
  }
});

test('saving edits saved rows while defaults remain unchanged and inspection resolves saved rows', () => {
  const before = parseStyleGuidePresets(styleGuideMarkdown);
  const draft = structuredClone(before.universalPreset);
  draft.typography.body.weight = 500;
  draft.buttons.base.background = '#123456';
  const updated = updateStyleGuideTokensFromDraft(styleGuideMarkdown, draft, before.interfacePreset);
  const after = parseStyleGuidePresets(updated);
  assert.deepEqual(after.universalPreset, draft);
  assert.deepEqual(after.originalUniversalPreset, before.originalUniversalPreset);
  const mapping = indexStyleGuide(updated, draft, before.interfacePreset).mappings['typography.body.weight'];
  assert.ok(mapping.excerpt.includes('| 500 |'));
  const missingDefault = updated.replace(/(#### Defaults\n\n[\s\S]*?)\| typography.body \|[^\n]+\n/, '$1');
  assert.throws(() => parseStyleGuidePresets(missingDefault), /Missing Original Default/);
});

test('malformed Defaults columns and legacy combined defaults are handled deliberately', () => {
  const sections = styleGuideMarkdown.split('#### Defaults');
  const mismatched = sections[0] + '#### Defaults' + sections[1].replace('| Family |', '| Unknown |') + '#### Defaults' + sections[2];
  assert.throws(() => parseStyleGuidePresets(mismatched), /Defaults columns do not match/);
  let legacy = styleGuideMarkdown;
  for (const group of ['typography', 'buttons']) {
    const lines = legacy.split('\n');
    const savedStart = lines.findIndex(line => line.startsWith(`| ${group}.`));
    const defaultsHeading = lines.findIndex((line, index) => index > savedStart && line === '#### Defaults');
    let defaultsEnd = defaultsHeading + 2;
    while (lines[defaultsEnd]?.startsWith('| ')) defaultsEnd++;
    const defaults = new Map(lines.slice(defaultsHeading + 4, defaultsEnd).map(line => {
      const cells = line.split('|').slice(1, -1).map(value => value.trim());
      return [cells[0], cells.slice(1).join(' / ')];
    }));
    for (let index = savedStart - 2; index < defaultsHeading - 1; index++) {
      if (!lines[index].startsWith('| ')) continue;
      const key = lines[index].split('|')[1].trim();
      const last = key === 'Preset path' ? 'Original Default' : key === '---' ? '---' : defaults.get(key);
      assert.ok(last);
      lines[index] += ` ${last} |`;
    }
    lines.splice(defaultsHeading - 1, defaultsEnd - defaultsHeading + 1);
    legacy = lines.join('\n');
  }
  assert.deepEqual(parseStyleGuidePresets(legacy), parseStyleGuidePresets(styleGuideMarkdown));
});
