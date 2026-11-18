import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fullKeyboardLayout, createFullKeyboardSvg, windowsLayoutKeyAsset } from '../src/keyboard-layout.js';
import { keyboardKeys, keyboardAsset } from '../src/keyboard.js';
import { iconGeometry, iconMetadata } from '../dist/index.js';

const pitch = 48;
const atRow = (layout, y) => layout.keys.filter(key => Math.abs((key.y - 6) / pitch - y) < 0.001).sort((a, b) => a.x - b.x).map(key => key.id);
const keyAt = (layout, id) => layout.keys.find(key => key.id === id);

test('Mac keyboard case and outer key corners follow the reference', () => {
  const layout = fullKeyboardLayout('mac');
  const svg = createFullKeyboardSvg('mac', { fillColour: '#123456' });
  assert.match(svg, /<rect x="0.75" y="0.75"[^>]+rx="22" fill="#C7C7C9"/);
  for (const [id, corner] of [['mac-escape', 'top-left'], ['mac-f19', 'top-right'], ['fn-globe', 'bottom-left'], ['mac-keypad-enter', 'bottom-right']]) {
    const key = keyAt(layout, id);
    const marker = `<g transform="translate(${key.x} ${key.y})">`;
    const frame = svg.slice(svg.indexOf(marker) + marker.length).match(/^<path d="([^"]+)"/);
    assert.ok(frame, `${id} uses a shaped key frame`);
    const right = key.width - 3, bottom = key.height - 3;
    const expected = { 'top-left': 'M 20 3', 'top-right': `Q ${right} 3 ${right} 20`, 'bottom-left': `Q 3 ${bottom} 3 ${bottom - 17}`, 'bottom-right': `Q ${right} ${bottom} ${right - 17} ${bottom}` };
    assert.ok(frame[1].includes(expected[corner]), `${id} has the rounded outer corner`);
  }
});

test('Mac case leaves transparent key interiors open in exports', () => {
  const svg = createFullKeyboardSvg('mac', { fillColour: 'none' });
  assert.match(svg, /<mask id="mac-keyboard-case-mask"/);
  const mask = svg.match(/<mask[^>]*>([\s\S]*?)<\/mask>/)?.[1];
  assert.ok(mask);
  assert.equal((mask.match(/fill="#000"/g) ?? []).length, fullKeyboardLayout('mac').keys.length);
  assert.match(svg, /mask="url\(#mac-keyboard-case-mask\)"/);
  assert.doesNotMatch(createFullKeyboardSvg('mac', { fillColour: '#F2F2F7' }), /<mask/);
});

test('Mac full keyboard matches the supplied UK ISO reference rows and key proportions', () => {
  const mac = fullKeyboardLayout('mac');
  assert.deepEqual(atRow(mac, 0), ['mac-escape', 'mac-brightness-down', 'mac-brightness-up', 'mac-mission-control', 'mac-spotlight', 'mac-dictation', 'mac-focus', 'mac-media-previous', 'mac-media-play', 'mac-media-next', 'mac-mute', 'mac-volume-down', 'mac-volume-up', 'touch-id', 'mac-f13', 'mac-f14', 'mac-f15', 'mac-f16', 'mac-f17', 'mac-f18', 'mac-f19']);
  assert.deepEqual(atRow(mac, 1), ['mac-punct-section', 'digit-one', 'mac-digit-two', 'mac-digit-three', 'digit-four', 'digit-five', 'digit-six', 'digit-seven', 'digit-eight', 'digit-nine', 'digit-zero', 'mac-punct-minus', 'punct-equals', 'mac-delete', 'mac-navigation-utility', 'mac-home', 'mac-page-up', 'mac-keypad-clear-symbol', 'keypad-equals', 'keypad-divide', 'mac-keypad-multiply']);
  assert.deepEqual(atRow(mac, 2), ['mac-tab', ...'qwertyuiop'.split('').map(x => `letter-${x}`), 'punct-left-bracket', 'punct-right-bracket', 'enter', 'mac-forward-delete', 'mac-end', 'mac-page-down', 'keypad-7', 'keypad-8', 'keypad-9', 'keypad-subtract']);
  assert.deepEqual(atRow(mac, 3), ['mac-caps-lock', ...'asdfghjkl'.split('').map(x => `letter-${x}`), 'punct-semicolon', 'mac-punct-apostrophe', 'punct-backslash', 'keypad-4', 'keypad-5', 'keypad-6', 'keypad-add']);
  assert.deepEqual(atRow(mac, 4), ['mac-shift-left', 'mac-punct-backtick', ...'zxcvbnm'.split('').map(x => `letter-${x}`), 'punct-comma', 'punct-period', 'punct-slash', 'mac-shift-right', 'mac-arrow-up', 'keypad-1', 'keypad-2', 'keypad-3', 'mac-keypad-enter']);
  assert.deepEqual(atRow(mac, 5), ['fn-globe', 'mac-control', 'mac-option-left', 'mac-command-left', 'space', 'mac-command-right', 'mac-option-right', 'mac-control-right', 'mac-arrow-left', 'mac-arrow-down', 'mac-arrow-right', 'keypad-0', 'keypad-decimal']);
  assert.equal(keyAt(mac, 'fn-globe').x, 6);
  assert.equal(keyAt(mac, 'mac-punct-section').y - keyAt(mac, 'mac-escape').y, pitch);
  assert.equal(keyAt(mac, 'mac-f16').x - (keyAt(mac, 'mac-f15').x + pitch), pitch / 4);
  assert.equal(keyAt(mac, 'mac-keypad-clear-symbol').x, keyAt(mac, 'mac-f16').x);
  const svg = createFullKeyboardSvg('mac');
  assert.equal((svg.match(/translate\(16\.92 24\.72\) scale\(0\.59\)/g) ?? []).length, 7);
  assert.equal(keyAt(mac, 'mac-escape').y, 6);
  assert.equal(mac.width - (keyAt(mac, 'mac-f19').x + keyAt(mac, 'mac-f19').width), 6);
  assert.ok(Math.abs(mac.height - (keyAt(mac, 'fn-globe').y + keyAt(mac, 'fn-globe').height) - 6) < 0.001);
  assert.equal(keyAt(mac, 'mac-command-left').width, 1.25 * pitch);
  assert.equal(keyAt(mac, 'mac-command-right').width, 1.5 * pitch);
  assert.equal(keyAt(mac, 'mac-control-right').width, 1.5 * pitch);
  assert.equal(keyAt(mac, 'mac-escape').width, 1.5 * pitch);
  assert.equal(keyAt(mac, 'mac-delete').width, 1.5 * pitch);
  assert.equal(keyAt(mac, 'keypad-add').height, pitch);
  assert.equal(keyAt(mac, 'mac-keypad-enter').height, 2 * pitch);
  assert.equal(keyAt(mac, 'mac-keypad-enter').legendPlacement, 'bottom-centre');
  assert.equal(keyAt(mac, 'keypad-0').width, 2 * pitch);
  assert.equal(keyAt(mac, 'enter').legendPlacement, 'bottom-right');
  assert.equal(keyAt(mac, 'mac-shift-left').legendPlacement, 'bottom-left');
  assert.equal(keyAt(mac, 'mac-shift-right').legendPlacement, 'bottom-right');
  assert.equal(mac.keys.filter(key => key.id === 'fn-globe').length, 1);
  assert.ok(keyboardKeys.find(key => key.id === 'touch-id'), 'the existing standalone fingerprint remains available');
  assert.equal(keyboardAsset('touch-id').key.icon, 'keyboard.mac-touch-id');
});

test('full keyboard layouts contain platform-correct keys without painted overlaps', () => {
  for (const platform of ['mac', 'windows']) {
    const layout = fullKeyboardLayout(platform);
    for (const key of layout.keys) {
      assert.ok(keyboardKeys.find(entry => entry.id === key.id)?.platforms.includes(platform), `${platform}: ${key.id}`);
      assert.ok(key.x >= 0 && key.y >= 0 && key.x + key.width <= layout.width && key.y + key.height <= layout.height);
    }
    for (let i = 0; i < layout.keys.length; i++) for (const b of layout.keys.slice(i + 1)) {
      const a = layout.keys[i];
      const separate = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      if (!separate && [a.id, b.id].includes('enter') && [a.id, b.id].includes(platform === 'mac' ? 'punct-backslash' : 'punct-hash')) {
        const enter = a.id === 'enter' ? a : b;
        const companion = a === enter ? b : a;
        if (platform === 'mac') {
          assert.ok(companion.x + companion.width <= enter.x + Math.round(enter.width * 0.32), 'the backslash key fits the ISO Return notch');
        } else {
          const innerEdge = Number(enter.outline.match(/H \d+ Q (\d+) \d+ \1 \d+ V \d+ Q \1/)[1]);
          assert.ok(companion.x + companion.width < enter.x + innerEdge, 'the Hash key clears the ISO Enter notch');
        }
      } else assert.ok(separate, `${platform}: ${a.id} overlaps ${b.id}`);
    }
    const svg = createFullKeyboardSvg(platform, { height: 512, colour: '#123456', fillColour: '#ABCDEF' });
    assert.match(svg, new RegExp(`<svg[^>]+width="${Math.round(512 * layout.width / layout.height)}" height="512"`));
    assert.match(svg, /fill="#ABCDEF"/);
    assert.doesNotMatch(svg, /vector-effect|<script|<text/);
  }
  assert.throws(() => fullKeyboardLayout('other'));
});

test('Windows uses the compact reference arrangement with UK ISO keys', () => {
  const layout = fullKeyboardLayout('windows');
  const key = id => keyAt(layout, id);
  assert.ok(Math.abs(layout.width / layout.height - 3.74) < 0.04);
  assert.equal(key('escape').height, 32);
  assert.equal(key('digit-three').y, key('escape').y + key('escape').height);
  assert.equal(key('enter').height, 2 * pitch);
  assert.equal(key('windows-shift-left').width, 1.25 * pitch);
  assert.equal(key('punct-backslash').x, key('windows-shift-left').x + key('windows-shift-left').width);
  assert.equal(key('punct-hash').y, key('enter').y + pitch);
  assert.equal(keyboardAsset('digit-three').key.label, '3 / £');
  assert.equal(keyboardAsset('digit-two').key.label, '2 / "');
  assert.equal(key('insert').x, key('enter').x + key('enter').width);
  assert.equal(key('windows-keypad-clear').x, key('page-up').x + pitch);
  const bottom = ['windows-control-left', 'windows-fn', 'windows-left', 'windows-alt-left', 'space', 'windows-altgr', 'copilot', 'windows-menu', 'windows-control-right'];
  assert.deepEqual(layout.keys.filter(item => item.y === key('space').y && item.x < key('insert').x).map(item => item.id), bottom);
  for (const id of ['windows-right', 'windows-alt-right', 'keypad-equals', 'f12']) assert.equal(keyboardAsset(id).key.id, id);
  const utilities = ['scroll-lock', 'pause-break', 'num-lock', 'windows-calculator', 'windows-widgets', 'windows-expressive-input', 'windows-lock'];
  assert.deepEqual(atRow(layout, 0).slice(-utilities.length), utilities);
});

test('Windows exports reuse the selectable key shapes and honour transparent fill', () => {
  const layout = fullKeyboardLayout('windows');
  const svg = createFullKeyboardSvg('windows');
  const mask = svg.match(/<mask id="windows-keyboard-case-mask"[^>]*>([\s\S]*?)<\/mask>/)?.[1];
  assert.ok(mask);
  assert.equal((mask.match(/fill="#000"/g) ?? []).length, layout.keys.length);
  for (const { x, y, outline } of layout.keys) {
    assert.ok(mask.includes(`<path d="${outline}" transform="translate(${x} ${y})"`));
    assert.ok(svg.includes(`<g transform="translate(${x} ${y})"><path d="${outline}"`));
  }
  const solid = createFullKeyboardSvg('windows', { fillColour: '#F2F2F7' });
  assert.doesNotMatch(solid, /<mask/);
  assert.match(solid, /fill="#F2F2F7"/);
  const escapedNotice = iconMetadata['keyboard.copilot'].licenceNotice
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  assert.ok(svg.includes(`<metadata>${escapedNotice}</metadata>`));
});

test('Mac layout and default SVG remain byte-for-byte compatible', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(JSON.stringify(fullKeyboardLayout('mac'))), 'c68010bf6f5aaca83150b8bbc5c2aadc0c98855c272307f2efa6b819df5ddc79');
  assert.equal(hash(createFullKeyboardSvg('mac')), '07e2f0566e47e13ec1b5106e79b6563ab55f2feb5cd84d26ce594607bb9012fc');
});

test('Mac full keyboard reuses the shared Fn, Touch ID and reference key artwork', () => {
  const svg = createFullKeyboardSvg('mac');
  for (const name of ['keyboard.mac-fn-globe', 'keyboard.mac-touch-id', 'keyboard.mac-tab', 'keyboard.mac-keypad-multiply']) {
    for (const path of iconGeometry[name]['Regular-M'].paths) assert.ok(svg.includes(path.d), `${name} appears in the composed keyboard`);
  }
  assert.match(svg, /stroke-width="1.2" stroke-linecap="round"/, 'tactile key marks are rendered');
});

test('Mac keypad Enter uses a stemless chevron below a bar and centres it on the full key', () => {
  for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const [path] = keyboardAsset('mac-keypad-enter', { scale, mode: 'symbol' }).glyph.paths;
    const segments = path.d.match(/M [^M]+/g);
    assert.equal(segments?.length, 2);
    const bar = [...segments[0].matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    const chevron = [...segments[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    assert.equal(bar.length, 4);
    assert.equal(chevron.length, 6);
    assert.equal(bar[1], bar[3]);
    assert.ok(chevron[3] > bar[1] && chevron[3] < chevron[1] && chevron[3] < chevron[5]);
    assert.equal(chevron[2], 12);
  }
  const path = keyboardAsset('mac-keypad-enter').glyph.paths[0].d;
  const svg = createFullKeyboardSvg('mac');
  assert.match(svg, new RegExp(`<g transform="translate\\(12 65\\) translate\\(0 0\\) translate\\(12 12\\) scale\\(0.75\\) translate\\(-12 -12\\)"[^>]*><path d="${path}"`));
});

test('Mac shifted punctuation is more prominent while retaining the lower legends', () => {
  const svg = createFullKeyboardSvg('mac');
  for (const [id, factor] of Object.entries({ 'digit-six': 1.5, 'digit-eight': 1.5, 'punct-equals': 1.35, 'mac-punct-section': 1.3, 'mac-punct-apostrophe': 1.5, 'mac-punct-backtick': 1.3, 'punct-comma': 1.5, 'punct-period': 1.5, 'punct-slash': 1.3 })) {
    const [upper, lower] = keyboardAsset(id).glyph.paths;
    assert.ok(svg.includes(`d="${upper.d}" transform="translate(12 5.8) scale(${factor}) translate(-12 -5.8)"`), `${id} upper legend is enlarged`);
    assert.ok(svg.includes(`d="${lower.d}"`), `${id} lower legend remains present`);
  }
});

test('Mac Return symbol sits in the upper part of its ISO key', () => {
  const key = keyAt(fullKeyboardLayout('mac'), 'enter');
  const svg = createFullKeyboardSvg('mac');
  const start = svg.lastIndexOf(`<g transform="translate(${key.x} ${key.y})">`);
  const keySvg = svg.slice(start, svg.indexOf('</g></g>', start));
  assert.ok(keySvg.includes('transform="translate(27 29.5) scale(0.5)"'));
  assert.ok(keySvg.includes('M 15 4 L 19 4 Q 21 4 21 6'), 'Return arrow has a curved top hook');
  assert.ok(keySvg.includes('L 3 13 M 8.5 7.5 L 3 13 L 8.5 18.5'), 'Return arrow keeps its left-pointing head');
});

test('Mac Fn and globe sit low with open latitude lines', () => {
  for (const scale of ['Regular-S', 'Regular-M', 'Regular-L']) {
    const glyph = keyboardAsset('fn-globe', { scale, mode: 'symbol' }).glyph;
    assert.equal(glyph.strokeWidth, 1);
    assert.equal((glyph.paths[2].d.match(/\bM\b/g) ?? []).length, 3);
  }
  const svg = createFullKeyboardSvg('mac');
  assert.ok(svg.includes('<g transform="translate(12 15)" fill="none"'), 'Fn and globe sit near the bottom of the key');
  const globe = keyboardAsset('fn-globe').glyph.paths;
  for (const path of globe.slice(0, 3)) assert.ok(svg.includes(`d="${path.d}" transform="translate(-2.5 -0.8) translate(6 18) scale(1.1) translate(-6 -18)" stroke-width="0.6"`), 'globe remains inset towards the left edge');
  assert.ok(svg.includes(`d="${globe[3].d}" transform="translate(3.5 0) translate(18 20.5) scale(0.8) translate(-18 -20.5)" fill=`), 'Fn letters sit smaller and towards the right');
});

test('Mac Caps Lock has a compact lower-left symbol and inset indicator', () => {
  const svg = createFullKeyboardSvg('mac');
  const layout = fullKeyboardLayout('mac');
  const key = keyAt(layout, 'mac-caps-lock');
  const start = svg.lastIndexOf(`<g transform="translate(${key.x} ${key.y})">`);
  const end = svg.indexOf('</g></g>', start);
  const rendered = svg.slice(start, end);
  assert.ok(rendered.includes('transform="translate(8 22) scale(0.75)"'));
  assert.ok(rendered.includes('d="M 12 12 L 12 12"'));
  assert.ok(rendered.includes('stroke-width="2.7" stroke-linecap="round"'));
  assert.ok(!rendered.includes('d="M 8 8 L 8 8"'));
});

test('Mac left Control retains a readable caption and raised chevron in the full keyboard', () => {
  const asset = keyboardAsset('mac-control');
  assert.equal(asset.transform, 'translate(17 5)');
  const svg = createFullKeyboardSvg('mac');
  assert.ok(svg.includes(`d="${asset.captionPath}" transform="translate(-3 0)"`), 'caption retains its full size and inset');
  assert.ok(svg.includes(`<g transform="translate(5 5)" fill="none"`), 'chevron is raised on the narrower key');
});

test('Mac full keyboard modifier captions remain inside their rendered key frames', () => {
  const layout = fullKeyboardLayout('mac');
  const svg = createFullKeyboardSvg('mac');
  for (const id of ['mac-control', 'mac-option-left', 'mac-command-left', 'mac-command-right', 'mac-option-right', 'mac-control-right']) {
    const key = keyAt(layout, id);
    const { captionPath } = keyboardAsset(id);
    const start = svg.indexOf(`d="${captionPath}"`);
    assert.notEqual(start, -1, `${id} caption is present`);
    const transform = svg.slice(start).match(/^d="[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)(?: scale\(([-.\d]+)\))?"/);
    assert.ok(transform, `${id} caption has a parseable transform`);
    const [, dx, dy, rawScale] = transform.map(Number);
    const scale = rawScale || 1;
    const coordinates = [...captionPath.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    const xs = coordinates.filter((_, index) => index % 2 === 0).map(value => value * scale + dx);
    const ys = coordinates.filter((_, index) => index % 2 === 1).map(value => value * scale + dy);
    assert.ok(Math.min(...xs) > 4 && Math.max(...xs) < key.width - 4, `${id} caption clears the side borders`);
    assert.ok(Math.min(...ys) > 24 && Math.max(...ys) < key.height - 4, `${id} caption clears the symbol and bottom border`);
  }
});

test('full Mac modifier pairs share their painted size and vertical position', () => {
  const svg = createFullKeyboardSvg('mac');
  const layout = fullKeyboardLayout('mac');
  for (const family of ['command', 'option']) {
    const bounds = [`mac-${family}-left`, `mac-${family}-right`].map(id => {
      const key = keyAt(layout, id);
      const start = svg.lastIndexOf(`<g transform="translate(${key.x} ${key.y})">`);
      const rendered = svg.slice(start);
      const group = rendered.match(/<g transform="translate\(([-.\d]+) ([-.\d]+)\) scale\(([-.\d]+)\)"[^>]*>([\s\S]*?)<\/g>/);
      assert.ok(group, `${id} has a scaled symbol`);
      const [, x, y, scale, paths] = group;
      const values = [...paths.matchAll(/d="([^"]+)"/g)].flatMap(match => [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(value => Number(value[0])));
      const xs = values.filter((_, index) => index % 2 === 0).map(value => Number(x) + value * Number(scale));
      const ys = values.filter((_, index) => index % 2 === 1).map(value => Number(y) + value * Number(scale));
      return { width: Math.max(...xs) - Math.min(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    });
    for (const property of ['width', 'top', 'bottom']) assert.ok(Math.abs(bounds[0][property] - bounds[1][property]) < 0.001, `${family} symbols match in ${property}`);
  }
});

test('Mac reference sizing preserves function labels and fits the smaller navigation symbols', () => {
  const svg = createFullKeyboardSvg('mac');
  const layout = fullKeyboardLayout('mac');
  const keyArtwork = id => {
    const key = keyAt(layout, id);
    const start = svg.lastIndexOf(`<g transform="translate(${key.x} ${key.y})">`);
    return svg.slice(start, svg.indexOf('</g></g>', start));
  };
  for (const id of ['mac-brightness-down', 'mac-mission-control', 'mac-media-play', 'mac-volume-up']) {
    const paths = keyboardAsset(id).glyph.paths;
    const artwork = keyArtwork(id);
    for (const path of paths.slice(0, -1)) assert.ok(artwork.includes(`d="${path.d}" transform="translate(12 7.2) scale(0.75) translate(-12 -7.2)"`));
    assert.ok(artwork.includes(`d="${paths.at(-1).d}" fill=`), `${id} retains its unscaled F label`);
  }
  for (const id of ['mac-tab', 'mac-shift-left', 'mac-shift-right', 'mac-delete', 'mac-home', 'mac-end', 'mac-page-up', 'mac-page-down', 'mac-forward-delete']) {
    assert.match(keyArtwork(id), /scale\(0\.6\)/, `${id} uses the compact reference size`);
  }
  for (const id of ['mac-arrow-up', 'mac-arrow-down', 'mac-arrow-left', 'mac-arrow-right']) assert.match(keyArtwork(id), /scale\(0\.45\)/);
  for (const id of ['letter-f', 'letter-j', 'keypad-5']) assert.ok(keyArtwork(id).includes(`M 22 42 L 26 42`), `${id} retains a compact tactile mark`);
});

test('Windows key specimens reproduce the frame and legends from every board position', () => {
  const options = { fillColour: '#FEFAFA', height: 128 };
  const board = createFullKeyboardSvg('windows', options);
  for (const key of fullKeyboardLayout('windows').keys) {
    const { svg, width } = windowsLayoutKeyAsset(key.id, options);
    const metadata = svg.match(/<metadata>.*?<\/metadata>/s)?.[0] ?? '';
    if (key.id === 'copilot') assert.ok(metadata && board.includes(metadata));
    const art = svg.slice(svg.indexOf('</title>') + '</title>'.length, svg.lastIndexOf('</svg>')).replace(metadata, '');
    assert.ok(board.includes(`<g transform="translate(${key.x} ${key.y})">${art}</g>`), key.id);
    assert.equal(width, Math.round(128 * key.width / key.height));
  }
  for (const [key, icon] of [['f11', 'keyboard.windows-favourites'], ['f12', 'action.settings'], ['windows-menu', 'keyboard.context-menu']]) {
    const { svg } = windowsLayoutKeyAsset(key, { mode: 'symbol' });
    for (const path of iconGeometry[icon]['Regular-M'].paths) assert.ok(svg.includes(path.d), key);
    assert.ok(!svg.includes('stroke-width="1.1"'), 'symbol export omits the keycap border');
  }
  assert.ok(windowsLayoutKeyAsset('space', { mode: 'symbol' }).svg.includes(keyboardAsset('space', { mode: 'symbol' }).glyph.paths[0].d));
  assert.throws(() => windowsLayoutKeyAsset('mac-f19'));
});

test('Windows preserves every key outline and assigns the Surface media legends', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(fullKeyboardLayout('windows'))).digest('hex'),
    '8619359be1afd83f5ec0aadbd9cc9d978fc1fd4cc982003b055c26a961610c3c');
  const symbol = id => windowsLayoutKeyAsset(id, { mode: 'symbol' }).svg;
  for (const [id, name] of Object.entries({
    f2: 'keyboard.windows-mute', f5: 'insert.video', f6: 'keyboard.windows-previous-track',
    f7: 'keyboard.windows-next-track', f8: 'keyboard.mac-media-play', 'keypad-multiply': 'keyboard.mac-keypad-multiply',
  })) {
    const glyph = iconGeometry[name]?.['Regular-M'];
    assert.ok(glyph && symbol(id).includes(glyph.paths[0].d), id);
  }
  for (const id of ['arrow-left', 'arrow-up', 'arrow-right', 'arrow-down', 'keypad-4', 'keypad-8', 'keypad-6', 'keypad-2']) {
    assert.ok(symbol(id).includes(iconGeometry['navigation.chevron-right']['Regular-M'].paths[0].d), id);
  }
  const marked = id => symbol(id).includes('<circle');
  assert.deepEqual(fullKeyboardLayout('windows').keys.filter(key => marked(key.id)).map(key => key.id).sort(),
    ['caps-lock', 'num-lock', 'scroll-lock', 'windows-fn']);
  for (const id of ['end', 'arrow-down', 'letter-f', 'letter-j', 'keypad-5']) {
    assert.match(symbol(id), /stroke-width="1.2" stroke-linecap="round"/, id);
  }
});
