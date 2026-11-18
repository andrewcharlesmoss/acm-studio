import { createKeyboardSvg, keyboardAsset } from './keyboard.js';
import { windowsLayoutCaptions, windowsStackedLayoutCaptions } from './keyboard-windows-captions.js';
import { iconGeometry, iconMetadata } from '../dist/index.js';

// The photographed Mac keys use more prominent shifted punctuation; keep the
// shared legends intact for other keyboard models and standalone exports.
const macUpperLegendScale = {
  'digit-six': 1.5, 'digit-eight': 1.5,
  'punct-equals': 1.35, 'mac-punct-section': 1.3,
  'mac-punct-apostrophe': 1.5, 'mac-punct-backtick': 1.3,
  'punct-comma': 1.5, 'punct-period': 1.5, 'punct-slash': 1.3,
};

// Illustrative UK ISO full-size layouts. Coordinates use a 48-unit key pitch.
export function fullKeyboardLayout(platform) {
  if (!['mac', 'windows'].includes(platform)) throw new Error('Choose Mac or Windows.');
  const mac = platform === 'mac';
  const keys = [];
  const add = (id, x, y, width = 1, height = 1, legendPlacement) => keys.push({ id, x: x * 48, y: y * 48, width: width * 48, height: height * 48, ...(legendPlacement ? { legendPlacement } : {}) });
  const row = (items, x, y) => { for (const item of items) { const [id, width = 1, placement] = Array.isArray(item) ? item : [item]; add(id, x, y, width, 1, placement); x += width; } };
  const letters = text => [...text].map(char => `letter-${char}`);
  if (mac) {
    // Supplied full-size UK Mac reference; hardware-specific variants remain separate keys.
    row([['mac-escape', 1.5, 'bottom-left'], 'mac-brightness-down', 'mac-brightness-up', 'mac-mission-control', 'mac-spotlight', 'mac-dictation', 'mac-focus', 'mac-media-previous', 'mac-media-play', 'mac-media-next', 'mac-mute', 'mac-volume-down', 'mac-volume-up', 'touch-id'], 0, 0);
    row(['mac-f13', 'mac-f14', 'mac-f15'], 15, 0);
    row(['mac-f16', 'mac-f17', 'mac-f18', 'mac-f19'], 19, 0);
    row(['mac-punct-section', 'digit-one', 'mac-digit-two', 'mac-digit-three', 'digit-four', 'digit-five', 'digit-six', 'digit-seven', 'digit-eight', 'digit-nine', 'digit-zero', 'mac-punct-minus', 'punct-equals', ['mac-delete', 1.5, 'bottom-right']], 0, 1.4);
    row([['mac-tab', 1.5, 'bottom-left'], ...letters('qwertyuiop'), 'punct-left-bracket', 'punct-right-bracket'], 0, 2.4);
    row([['mac-caps-lock', 1.75, 'bottom-left'], ...letters('asdfghjkl'), 'punct-semicolon', 'mac-punct-apostrophe', 'punct-backslash'], 0, 3.4);
    add('enter', 13.5, 2.4, 1, 2, 'bottom-right');
    row([['mac-shift-left', 1.25, 'bottom-left'], 'mac-punct-backtick', ...letters('zxcvbnm'), 'punct-comma', 'punct-period', 'punct-slash', ['mac-shift-right', 2.25, 'bottom-right']], 0, 4.4);
    row([['fn-globe', 1], ['mac-control', 1], ['mac-option-left', 1], ['mac-command-left', 1.25], ['space', 6], ['mac-command-right', 1.5], ['mac-option-right', 1.25], ['mac-control-right', 1.5]], 0, 5.4);
    row(['mac-navigation-utility', 'mac-home', 'mac-page-up'], 15, 1.4);
    row(['mac-forward-delete', 'mac-end', 'mac-page-down'], 15, 2.4);
    add('mac-arrow-up', 16, 4.4); row(['mac-arrow-left', 'mac-arrow-down', 'mac-arrow-right'], 15, 5.4);
    row(['mac-keypad-clear-symbol', 'keypad-equals', 'keypad-divide', 'mac-keypad-multiply'], 19, 1.4);
    row(['keypad-7', 'keypad-8', 'keypad-9', 'keypad-subtract'], 19, 2.4);
    row(['keypad-4', 'keypad-5', 'keypad-6', ['keypad-add', 1]], 19, 3.4);
    row(['keypad-1', 'keypad-2', 'keypad-3'], 19, 4.4);
    add('mac-keypad-enter', 22, 4.4, 1, 2, 'bottom-centre');
    row([['keypad-0', 2], 'keypad-decimal'], 19, 5.4);
  } else {
    const typingTop = 2 / 3;
    const navigationX = 15;
    const keypadX = 18;
    add('escape', 0, 0, 1.25, typingTop);
    for (let index = 0; index < 12; index++) add(`f${index + 1}`, 1.25 + index, 0, 1, typingTop);
    add('print-screen', 13.25, 0, 1.75, typingTop);
    ['scroll-lock', 'pause-break', 'num-lock', 'windows-calculator', 'windows-widgets', 'windows-expressive-input', 'windows-lock'].forEach(
      (id, index) => add(id, navigationX + index, 0, 1, typingTop),
    );

    row(['punct-backtick', 'digit-one', 'digit-two', 'digit-three', 'digit-four', 'digit-five', 'digit-six', 'digit-seven', 'digit-eight', 'digit-nine', 'digit-zero', 'punct-minus', 'punct-equals', ['backspace', 2]], 0, typingTop);
    row([['tab', 1.5], ...letters('qwertyuiop'), 'punct-left-bracket', 'punct-right-bracket'], 0, typingTop + 1);
    row([['caps-lock', 1.75], ...letters('asdfghjkl'), 'punct-semicolon', 'punct-apostrophe', 'punct-hash'], 0, typingTop + 2);
    add('enter', 13.5, typingTop + 1, 1.5, 2);
    row([['windows-shift-left', 1.25], 'punct-backslash', ...letters('zxcvbnm'), 'punct-comma', 'punct-period', 'punct-slash', ['windows-shift-right', 2.75]], 0, typingTop + 3);
    row([['windows-control-left', 1.5], 'windows-fn', 'windows-left', 'windows-alt-left', ['space', 6], 'windows-altgr', 'copilot', 'windows-menu', ['windows-control-right', 1.5]], 0, typingTop + 4);
    row(['insert', 'home', 'page-up'], navigationX, typingTop);
    row(['delete-forward', 'end', 'page-down'], navigationX, typingTop + 1);
    add('arrow-up', navigationX + 1, typingTop + 3);
    row(['arrow-left', 'arrow-down', 'arrow-right'], navigationX, typingTop + 4);
    row(['windows-keypad-clear', 'keypad-divide', 'keypad-multiply', 'keypad-subtract'], keypadX, typingTop);
    row(['keypad-7', 'keypad-8', 'keypad-9'], keypadX, typingTop + 1);
    add('keypad-add', keypadX + 3, typingTop + 1, 1, 2);
    row(['keypad-4', 'keypad-5', 'keypad-6'], keypadX, typingTop + 2);
    row(['keypad-1', 'keypad-2', 'keypad-3'], keypadX, typingTop + 3);
    add('keypad-enter', keypadX + 3, typingTop + 3, 1, 2);
    row([['keypad-0', 2], 'keypad-decimal'], keypadX, typingTop + 4);

    const inset = 6;
    return {
      width: 22 * 48 + inset * 2,
      height: 5 * 48 + 32 + inset * 2,
      keys: keys.map(key => ({ ...key, x: key.x + inset, y: Math.round(key.y) + inset, outline: windowsKeyOutline(key) })),
    };
  }
  const inset = 6;
  return { width: 22.25 * 48 + inset * 2, height: 6 * 48 + inset * 2, keys: keys.map(key => ({ ...key, x: key.x + inset - (key.x >= 19 * 48 ? 36 : 0), y: Math.round((key.y + inset - (key.y > 0 ? 0.4 * 48 : 0)) * 1000) / 1000 })) };
}

// Shared by the drawn key, transparent case opening and Studio hit area.
function windowsKeyOutline({ id, width, height }) {
  const inset = 3, radius = 4;
  const right = width - inset, bottom = height - inset;
  const near = inset + radius, far = right - radius;
  const firstRowBottom = height / 2 - inset;
  const leadingEdge = id === 'enter'
    ? `H 19 Q 15 ${bottom} 15 ${bottom - radius} V ${firstRowBottom + radius} Q 15 ${firstRowBottom} 11 ${firstRowBottom} H ${near} Q 3 ${firstRowBottom} 3 ${firstRowBottom - radius}`
    : `H ${near} Q 3 ${bottom} 3 ${bottom - radius}`;
  return `M ${near} 3 H ${far} Q ${right} 3 ${right} ${near} V ${bottom - radius} Q ${right} ${bottom} ${far} ${bottom} ${leadingEdge} V ${near} Q 3 3 ${near} 3 Z`;
}

const windowsFunctionIcons = [
  'keyboard.mac-dictation', 'keyboard.mac-mute', 'keyboard.mac-volume-down', 'keyboard.mac-volume-up',
  'device.desktop', 'keyboard.mac-media-previous', 'keyboard.mac-media-play', 'keyboard.mac-media-next',
  'keyboard.mac-brightness-down', 'keyboard.mac-brightness-up', 'keyboard.windows-favourites', 'action.settings',
];
const windowsKeypadSecondaryLegends = {
  'keypad-7': 'home', 'keypad-8': 'arrow-up', 'keypad-9': 'page-up',
  'keypad-4': 'arrow-left', 'keypad-6': 'arrow-right', 'keypad-1': 'end',
  'keypad-2': 'arrow-down', 'keypad-3': 'page-down', 'keypad-0': 'insert', 'keypad-decimal': 'keypad-delete-caption',
};

function windowsKeyArtwork({ id, width, height, outline }, { colour, borderColour, fillColour }) {
  const asset = keyboardAsset(id, { mode: 'symbol', colour, borderColour, fillColour });
  const paths = (glyph, x, y, scale, geometry = glyph.paths) =>
    `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${colour}" stroke-width="${glyph.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${geometry.map(({ d, fill, fillRule, stroke }) => `<path d="${d}"${fill ? ` fill="${colour}"` : ''}${fillRule ? ` fill-rule="${fillRule}"` : ''}${stroke ? ` stroke="${stroke}"` : ''}/>`).join('')}</g>`;
  const caption = (d, centreX, centreY, scale = 1) =>
    paths({ strokeWidth: 0, paths: [{ d, fill: 'currentColor', stroke: 'none' }] },
      centreX - 12 * scale, centreY - 12 * scale, scale);
  const smallTopRow = height === 32;
  const number = /^f(\d+)$/.exec(id);
  const secondary = windowsKeypadSecondaryLegends[id];
  let legend = '';
  if (number) {
    const icon = windowsFunctionIcons[Number(number[1]) - 1];
    const glyph = iconGeometry[icon]['Regular-M'];
    const pictogram = icon.startsWith('keyboard.mac-') ? glyph.paths.slice(0, -1) : glyph.paths;
    // Interface icons fill more of the canvas than the keyboard pictograms.
    const scale = icon.startsWith('keyboard.mac-') ? 0.78 : 0.57;
    const pictogramY = icon.startsWith('keyboard.mac-') ? 7.5 : 4.5;
    legend = paths(glyph, 16 - 12 * scale, pictogramY, scale, pictogram)
      + paths(asset.glyph, 29, 15, 0.62);
  } else if (id === 'print-screen') {
    const snip = iconGeometry['keyboard.windows-snip']['Regular-M'];
    legend = paths(snip, width / 2 - 7.2, 9, 0.6)
      + caption(windowsLayoutCaptions[id], width - 16, 22, 0.7);
  } else if (secondary || id === 'keypad-5') {
    legend = caption(windowsLayoutCaptions[id], width / 2, 14);
    if (secondary && Object.hasOwn(windowsLayoutCaptions, secondary)) {
      legend += caption(windowsLayoutCaptions[secondary], width / 2, 32, 0.72);
    } else if (secondary) {
      const arrow = keyboardAsset(secondary, { mode: 'symbol' }).glyph;
      legend += paths(arrow, (width - 15.6) / 2, 24.2, 0.65);
    }
  } else if (Object.hasOwn(windowsStackedLayoutCaptions, id)) {
    legend = caption(windowsStackedLayoutCaptions[id], width / 2, height / 2);
  } else if (Object.hasOwn(windowsLayoutCaptions, id)) {
    legend = caption(windowsLayoutCaptions[id], width / 2, height / 2);
  } else if (id !== 'space') {
    const compactMark = ['windows-left', 'copilot', 'windows-menu'].includes(id);
    const scale = smallTopRow || compactMark || id === 'enter' ? 0.72 : id.startsWith('letter-') ? 0.86 : 1;
    const legendX = id === 'enter' ? 33 : (width - 24 * scale) / 2;
    const legendY = id === 'enter' ? 56 : (height - 24 * scale) / 2;
    legend = paths(asset.glyph, legendX, legendY, scale);
  }
  const tactile = ['letter-f', 'letter-j', 'keypad-5'].includes(id)
    ? `<path d="M ${width / 2 - 3} ${id === 'keypad-5' ? 32 : 36} h 6" stroke="${colour}" stroke-width="1.2" stroke-linecap="round"/>`
    : '';
  return {
    frame: `<path d="${outline}" stroke="${asset.borderColour}" stroke-width="1.1" fill="${fillColour}"/>`,
    legend: legend + tactile,
    notice: iconMetadata[asset.key.icon].licenceNotice,
  };
}

// Individual layout specimens use exactly the same frame, legends and optical placement as the board.
export function windowsLayoutKeyAsset(id, { height = 128, mode = 'keycap', colour = '#1C1C1E', borderColour, fillColour = 'none' } = {}) {
  if (!Number.isInteger(height) || height < 24 || height > 512 || !['keycap', 'symbol'].includes(mode)) {
    throw new Error('Choose a valid artwork mode and a height from 24 to 512 pixels.');
  }
  const key = fullKeyboardLayout('windows').keys.find(entry => entry.id === id);
  if (!key) throw new Error('Choose a key from the Windows layout.');
  if (id === 'space' && mode === 'symbol') {
    return { svg: createKeyboardSvg(id, { mode, height, colour }), width: height, height };
  }
  const { frame, legend, notice } = windowsKeyArtwork(key, { colour, borderColour, fillColour });
  const width = Math.round(height * key.width / key.height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${key.width} ${key.height}"><title>UK Windows keyboard: ${id}</title>${keyboardMetadata(notice ? [notice] : [])}${mode === 'keycap' ? frame : ''}${legend}</svg>\n`;
  return { svg, width, height };
}

function windowsKeyboardArtwork(layout, colours, notices) {
  const { fillColour } = colours;
  const parts = layout.keys.map(key => {
    const { frame, legend, notice } = windowsKeyArtwork(key, colours);
    if (notice) notices.add(notice);
    return `<g transform="translate(${key.x} ${key.y})">${frame}${legend}</g>`;
  }).join('');

  const mask = fillColour === 'none'
    ? `<defs><mask id="windows-keyboard-case-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${layout.width}" height="${layout.height}" style="mask-type:luminance"><rect width="${layout.width}" height="${layout.height}" fill="#fff"/>${layout.keys.map(({ outline, x, y }) => `<path d="${outline}" transform="translate(${x} ${y})" fill="#000"/>`).join('')}</mask></defs>`
    : '';
  const casework = `${mask}<g${mask ? ' mask="url(#windows-keyboard-case-mask)"' : ''}><rect x="0.75" y="0.75" width="${layout.width - 1.5}" height="${layout.height - 1.5}" rx="13" fill="#9B9DA2" stroke="#9B9DA2" stroke-width="1.5"/><rect x="0.75" y="0.75" width="${layout.width - 1.5}" height="${layout.height - 5}" rx="12" fill="#C2C4C8" stroke="#9B9DA2" stroke-width="1.5"/></g>`;
  return { casework, parts };
}

function keyboardMetadata(notices) {
  return [...notices].map(notice => `<metadata>${notice.replace(/[<>&"']/g, char => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]))}</metadata>`).join('');
}

export function createFullKeyboardSvg(platform, options = {}) {
  const { height = 256, colour = '#1C1C1E', borderColour, fillColour = 'none' } = options;
  if (!Number.isInteger(height) || height < 64 || height > 2048) throw new Error('Choose a height from 64 to 2048 pixels.');
  const layout = fullKeyboardLayout(platform);
  const notices = new Set();
  const { casework, parts } = platform === 'windows'
    ? windowsKeyboardArtwork(layout, { colour, borderColour, fillColour }, notices)
    : macKeyboardArtwork(layout, { colour, borderColour, fillColour }, notices);
  const metadata = keyboardMetadata(notices);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(height * layout.width / layout.height)}" height="${height}" viewBox="0 0 ${layout.width} ${layout.height}"><title>Full-size UK ${platform === 'mac' ? 'Mac' : 'Windows'} keyboard</title>${metadata}${casework}${parts}</svg>\n`;
}

function macKeyboardArtwork(layout, { colour, borderColour, fillColour }, notices) {
  const platform = 'mac';
  const caseCutouts = [];
  const parts = layout.keys.map(({ id, x, y, width, height: keyHeight, legendPlacement }) => {
    const asset = keyboardAsset(id, { colour, borderColour, fillColour });
    const macReturn = platform === 'mac' && id === 'enter';
    const notice = iconMetadata[asset.key.icon].licenceNotice;
    if (notice) notices.add(notice);
    const [, tx, ty] = asset.transform.match(/translate\(([-.\d]+) ([-.\d]+)\)/).map(Number);
    const extendedFunction = platform === 'mac' && /^mac-f1[3-9]$/.test(id);
    const commandKey = id === 'mac-command-left' || id === 'mac-command-right';
    const optionKey = id === 'mac-option-left' || id === 'mac-option-right';
    const glyphX = id === 'mac-command-left' ? 9 : id === 'mac-command-right' ? 43.4 : id === 'mac-option-left' ? 10 : id === 'mac-option-right' ? width - 29.2 : extendedFunction ? 16.92 : macReturn ? width - 21 : id === 'mac-caps-lock' ? 8 : legendPlacement === 'bottom-left' ? 7 : legendPlacement === 'bottom-right' ? width - 31 : legendPlacement === 'bottom-centre' ? (width - 24) / 2 : tx + (width - asset.width) / 2;
    const glyphY = commandKey || optionKey ? 5 : extendedFunction ? 24.72 : macReturn ? 29.5 : id === 'fn-globe' && platform === 'mac' ? 15 : id === 'mac-caps-lock' ? keyHeight - 26 : legendPlacement ? keyHeight - 31 : ty + (keyHeight - asset.height) / 2;
    const glyphPaths = macReturn
      ? [{ d: 'M 15 4 L 19 4 Q 21 4 21 6 L 21 11 Q 21 13 19 13 L 3 13 M 8.5 7.5 L 3 13 L 8.5 18.5' }]
      : id === 'mac-caps-lock' ? asset.glyph.paths.slice(0, 1) : asset.glyph.paths;
    const upperScale = platform === 'mac' ? macUpperLegendScale[id] : undefined;
    const functionPictogram = platform === 'mac' && ['mac-brightness-down', 'mac-brightness-up', 'mac-mission-control', 'mac-spotlight', 'mac-dictation', 'mac-focus', 'mac-media-previous', 'mac-media-play', 'mac-media-next', 'mac-mute', 'mac-volume-down', 'mac-volume-up'].includes(id);
    const referenceScale = platform === 'mac' ? ({
      'mac-tab': 0.6, 'mac-shift-left': 0.6, 'mac-shift-right': 0.6, 'mac-delete': 0.6,
      'mac-home': 0.6, 'mac-end': 0.6, 'mac-page-up': 0.6, 'mac-page-down': 0.6,
      'mac-forward-delete': 0.6, 'mac-navigation-utility': 0.75, 'mac-keypad-clear-symbol': 0.65,
      'mac-arrow-up': 0.45, 'mac-arrow-down': 0.45, 'mac-arrow-left': 0.45, 'mac-arrow-right': 0.45,
      'mac-keypad-enter': 0.75,
    })[id] : undefined;
    const referenceOffsetX = id === 'mac-shift-left' || id === 'mac-tab' ? -1 : id === 'mac-shift-right' || id === 'mac-delete' ? 1 : 0;
    const referenceOffsetY = ['mac-tab', 'mac-shift-left', 'mac-shift-right', 'mac-delete'].includes(id) ? 2 : 0;
    const paths = glyphPaths.map(({d, fill, stroke}, index) => `<path d="${d}"${platform === 'mac' && id === 'fn-globe' ? (index < 3 ? ' transform="translate(-2.5 -0.8) translate(6 18) scale(1.1) translate(-6 -18)"' : ' transform="translate(3.5 0) translate(18 20.5) scale(0.8) translate(-18 -20.5)"') : functionPictogram && index < glyphPaths.length - 1 ? ' transform="translate(12 7.2) scale(0.75) translate(-12 -7.2)"' : upperScale && index === 0 ? ` transform="translate(12 5.8) scale(${upperScale}) translate(-12 -5.8)"` : ''}${platform === 'mac' && id === 'fn-globe' && index < 3 ? ' stroke-width="0.6"' : ''}${fill ? ` fill="${colour}"` : ''}${stroke ? ` stroke="${stroke}"` : ''}/>`).join('');
    // Keep modifier captions at one size and inset them within narrower keys.
    const captionX = platform === 'mac' ? ({ 'mac-control': -3, 'mac-option-left': -3, 'mac-option-right': -6 })[id] ?? 0 : (width - asset.width) / 2;
    const captionY = (keyHeight - asset.height) / 2;
    const caption = asset.captionPath ? `<path d="${asset.captionPath}" transform="translate(${captionX} ${captionY})" fill="${colour}" stroke="none"/>` : '';
    const right = width - 3, bottom = keyHeight - 3, radius = 7;
    const notch = Math.round(width * 0.32), step = Math.round(keyHeight * 0.44);
    const corner = platform === 'mac' ? ({ 'mac-escape': 'top-left', 'mac-f19': 'top-right', 'fn-globe': 'bottom-left', 'mac-keypad-enter': 'bottom-right' })[id] : undefined;
    const corners = { 'top-left': 17, 'top-right': 17, 'bottom-left': 17, 'bottom-right': 17 };
    const tl = corner === 'top-left' ? corners[corner] : radius;
    const tr = corner === 'top-right' ? corners[corner] : radius;
    const bl = corner === 'bottom-left' ? corners[corner] : radius;
    const br = corner === 'bottom-right' ? corners[corner] : radius;
    const frame = asset.key.shape === 'iso'
      ? `<path d="M 10 3 H ${right - radius} Q ${right} 3 ${right} 10 V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${notch + radius} Q ${notch} ${bottom} ${notch} ${bottom - radius} V ${step + 3} Q ${notch} ${step} ${notch - 3} ${step} H 10 Q 3 ${step} 3 ${step - radius} V 10 Q 3 3 10 3 Z"`
      : corner ? `<path d="M ${3 + tl} 3 H ${right - tr} Q ${right} 3 ${right} ${3 + tr} V ${bottom - br} Q ${right} ${bottom} ${right - br} ${bottom} H ${3 + bl} Q 3 ${bottom} 3 ${bottom - bl} V ${3 + tl} Q 3 3 ${3 + tl} 3 Z"`
      : `<rect x="3" y="3" width="${width - 6}" height="${keyHeight - 6}" rx="7"`;
    if (platform === 'mac' && fillColour === 'none') caseCutouts.push(`<g transform="translate(${x} ${y})">${frame} fill="#000"/></g>`);
    const capsIndicator = id === 'mac-caps-lock' ? `<path d="M 12 12 L 12 12" stroke="${colour}" stroke-width="2.7" stroke-linecap="round"/>` : '';
    const tactile = platform === 'mac' && ['letter-f', 'letter-j', 'keypad-5'].includes(id) ? `<path d="M ${width / 2 - 2} ${keyHeight - 6} L ${width / 2 + 2} ${keyHeight - 6}" stroke="${colour}" stroke-width="1.2" stroke-linecap="round"/>` : '';
    return `<g transform="translate(${x} ${y})">${frame} stroke-width="1.5" stroke="${asset.borderColour}" fill="${asset.fillColour}"/><g transform="translate(${glyphX} ${glyphY})${referenceScale ? ` translate(${referenceOffsetX} ${referenceOffsetY}) translate(12 12) scale(${referenceScale}) translate(-12 -12)` : commandKey || optionKey ? ' scale(0.8)' : extendedFunction ? ' scale(0.59)' : macReturn ? ' scale(0.5)' : id === 'mac-caps-lock' ? ' scale(0.75)' : ''}" fill="none" stroke="${colour}" stroke-width="${asset.glyph.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>${caption}${capsIndicator}${tactile}</g>`;
  }).join('');
  const caseMask = caseCutouts.length ? `<defs><mask id="mac-keyboard-case-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${layout.width}" height="${layout.height}" style="mask-type:luminance"><rect width="${layout.width}" height="${layout.height}" fill="#fff"/>${caseCutouts.join('')}</mask></defs>` : '';
  const casework = platform === 'mac' ? `${caseMask}<rect x="0.75" y="0.75" width="${layout.width - 1.5}" height="${layout.height - 1.5}" rx="22" fill="#C7C7C9" stroke="#A3A3A5" stroke-width="1.5"${caseMask ? ' mask="url(#mac-keyboard-case-mask)"' : ''}/>` : '';
  return { casework, parts };
}
