import { keyboardAsset } from './keyboard.js';
import { iconMetadata } from '../dist/index.js';

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
    row(['escape', ...(mac ? ['mac-brightness-down', 'mac-brightness-up', 'mac-mission-control', 'mac-spotlight', 'mac-dictation', 'mac-focus', 'mac-media-previous', 'mac-media-play', 'mac-media-next', 'mac-mute', 'mac-volume-down', 'mac-volume-up'] : Array.from({length: 12}, (_, i) => `f${i + 1}`))], 0, 0);
    if (mac) row(['mac-f16', 'mac-f17', 'mac-f18', 'touch-id'], 19, 0);
    row(mac ? ['mac-f13', 'mac-f14', 'mac-f15'] : ['print-screen', 'scroll-lock', 'pause-break'], 15.5, 0);
    row([mac ? 'mac-punct-section' : 'punct-backtick', 'digit-one', mac ? 'mac-digit-two' : 'digit-two', mac ? 'mac-digit-three' : 'digit-three', 'digit-four', 'digit-five', 'digit-six', 'digit-seven', 'digit-eight', 'digit-nine', 'digit-zero', 'punct-minus', 'punct-equals', [mac ? 'mac-delete' : 'backspace', 2]], 0, 1.4);
    row([['tab', 1.5], ...letters('qwertyuiop'), 'punct-left-bracket', 'punct-right-bracket'], 0, 2.4);
    row([['caps-lock', 1.5], ...letters('asdfghjkl'), 'punct-semicolon', mac ? 'mac-punct-apostrophe' : 'punct-apostrophe', mac ? 'mac-punct-backtick' : 'punct-hash'], 0, 3.4);
    add('enter', 13.5, 2.4, 1.5, 2);
    row([[mac ? 'mac-shift-left' : 'windows-shift-left', 1.25], 'punct-backslash', ...letters('zxcvbnm'), 'punct-comma', 'punct-period', 'punct-slash', [mac ? 'mac-shift-right' : 'windows-shift-right', 2.75]], 0, 4.4);
    row(mac ? [['mac-control', 1.25], ['mac-option-left', 1.25], ['mac-command-left', 1.5], ['space', 6.75], ['mac-command-right', 1.5], ['mac-option-right', 1.25], ['mac-control-right', 1.5]] : [['windows-control-left', 1.25], ['windows-left', 1.25], ['windows-alt-left', 1.25], ['space', 6.25], ['windows-altgr', 1.25], ['windows-right', 1.25], ['windows-menu', 1.25], ['windows-control-right', 1.25]], 0, 5.4);
    row(mac ? ['fn-globe', 'home', 'page-up'] : ['insert', 'home', 'page-up'], 15.5, 1.4);
    row([mac ? 'mac-forward-delete' : 'delete-forward', 'end', 'page-down'], 15.5, 2.4);
    add('arrow-up', 16.5, 4.4); row(['arrow-left', 'arrow-down', 'arrow-right'], 15.5, 5.4);
    const keypadX = 19;
    row([mac ? 'mac-keypad-clear' : 'num-lock', 'keypad-divide', 'keypad-multiply', 'keypad-subtract'], keypadX, 1.4);
    row(['keypad-7', 'keypad-8', 'keypad-9'], keypadX, 2.4); add('keypad-add', keypadX + 3, 2.4, 1, 2);
    row(['keypad-4', 'keypad-5', 'keypad-6'], keypadX, 3.4);
    row(['keypad-1', 'keypad-2', 'keypad-3'], keypadX, 4.4); add('keypad-enter', keypadX + 3, 4.4, 1, 2);
    row([['keypad-0', 2], 'keypad-decimal'], keypadX, 5.4);
  }
  if (mac) {
    const inset = 6;
    return { width: 22.25 * 48 + inset * 2, height: 6 * 48 + inset * 2, keys: keys.map(key => ({ ...key, x: key.x + inset - (key.x >= 19 * 48 ? 36 : 0), y: Math.round((key.y + inset - (key.y > 0 ? 0.4 * 48 : 0)) * 1000) / 1000 })) };
  }
  return { width: 23 * 48, height: 6.4 * 48, keys };
}

export function createFullKeyboardSvg(platform, options = {}) {
  const { height = 256, colour = '#1C1C1E', borderColour, fillColour = 'none' } = options;
  if (!Number.isInteger(height) || height < 64 || height > 2048) throw new Error('Choose a height from 64 to 2048 pixels.');
  const layout = fullKeyboardLayout(platform);
  const notices = new Set();
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
  const metadata = [...notices].map(notice => `<metadata>${notice.replace(/[<>&"']/g, char => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]))}</metadata>`).join('');
  const caseMask = caseCutouts.length ? `<defs><mask id="mac-keyboard-case-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${layout.width}" height="${layout.height}" style="mask-type:luminance"><rect width="${layout.width}" height="${layout.height}" fill="#fff"/>${caseCutouts.join('')}</mask></defs>` : '';
  const casework = platform === 'mac' ? `${caseMask}<rect x="0.75" y="0.75" width="${layout.width - 1.5}" height="${layout.height - 1.5}" rx="22" fill="#C7C7C9" stroke="#A3A3A5" stroke-width="1.5"${caseMask ? ' mask="url(#mac-keyboard-case-mask)"' : ''}/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(height * layout.width / layout.height)}" height="${height}" viewBox="0 0 ${layout.width} ${layout.height}"><title>Full-size UK ${platform === 'mac' ? 'Mac' : 'Windows'} keyboard</title>${metadata}${casework}${parts}</svg>\n`;
}
