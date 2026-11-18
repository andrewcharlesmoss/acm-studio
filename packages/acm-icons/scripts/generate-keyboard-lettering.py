"""Generate UK keyboard text legends from the pinned Inter v4.1 variable font.

Requires fonttools==4.60.1. Run from the @acm/icons package root.
"""
from pathlib import Path
from hashlib import sha256
import json
import re
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'sources/inter/InterVariable.ttf'
EXPECTED = '4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf'
if sha256(FONT.read_bytes()).hexdigest() != EXPECTED:
    raise ValueError('Inter source digest does not match the pinned v4.1 font')

class PathPen(BasePen):
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.commands = []
    def add(self, command, *points):
        values = [f'{v:.4f}'.rstrip('0').rstrip('.') or '0' for point in points for v in point]
        self.commands.append(' '.join([command] + values))
    def _moveTo(self, p): self.add('M', p)
    def _lineTo(self, p): self.add('L', p)
    def _curveToOne(self, p1, p2, p3): self.add('C', p1, p2, p3)
    def _qCurveToOne(self, p1, p2): self.add('Q', p1, p2)
    def _closePath(self): self.add('Z')

def lettering(font, text, center, baseline, cap_height, max_width=22.5):
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    positioned = []
    advance = 0
    for character in text:
        glyph = glyphs[cmap[ord(character)]]
        positioned.append((glyph, advance))
        advance += glyph.width
    font_cap_height = font['OS/2'].sCapHeight
    scale = cap_height / font_cap_height
    run_width = advance * scale
    if run_width > max_width:
        raise ValueError(f'Legend {text!r} exceeds its {max_width:g}-unit layout at the chosen type size')
    tx = center - run_width / 2
    pen = PathPen(glyphs)
    for glyph, advance in positioned:
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, tx + advance * scale, baseline)))
    return ' '.join(pen.commands)

def fitted_lettering(font, text, center, baseline, desired_height, max_width):
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    advance = sum(glyphs[cmap[ord(character)]].width for character in text)
    fitted_height = max_width * font['OS/2'].sCapHeight / advance
    return lettering(font, text, center, baseline, min(desired_height, fitted_height * 0.99), max_width)

def centred_lettering(font, text, center_x, center_y, cap_height, max_width, minimum_ink_height=0):
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    positioned = []
    advance = 0
    bounds_pen = BoundsPen(glyphs)
    for character in text:
        glyph = glyphs[cmap[ord(character)]]
        positioned.append((glyph, advance))
        glyph.draw(TransformPen(bounds_pen, (1, 0, 0, 1, advance, 0)))
        advance += glyph.width
    left, bottom, right, top = bounds_pen.bounds
    font_cap_height = font['OS/2'].sCapHeight
    scale = cap_height / font_cap_height
    if minimum_ink_height:
        scale = max(scale, minimum_ink_height / (top - bottom))
    scale = min(scale, max_width / advance)
    tx = center_x - (left + right) * scale / 2
    baseline = center_y + (bottom + top) * scale / 2
    pen = PathPen(glyphs)
    for glyph, glyph_advance in positioned:
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, tx + glyph_advance * scale, baseline)))
    return ' '.join(pen.commands)

def stacked_lettering(font, texts):
    return [
        centred_lettering(font, texts[0], 12, 5.8, 5.2, 10.5, 2.4),
        centred_lettering(font, texts[1], 12, 17.8, 8.4, 13.5, 3.2),
    ]

MULTILINE_LEGENDS = {
    'keyboard.backspace': ('Back', 'space'), 'keyboard.caps-lock': ('Caps', 'Lock'),
    'keyboard.page-up': ('Page', 'Up'), 'keyboard.page-down': ('Page', 'Down'),
    'keyboard.print-screen': ('Print', 'Screen'), 'keyboard.scroll-lock': ('Scroll', 'Lock'),
    'keyboard.pause-break': ('Pause', 'Break'), 'keyboard.num-lock': ('Num', 'Lock'),
    'keyboard.touch-id': ('Touch', 'ID'),
}

def legends(name, texts, font):
    if name == 'keyboard.mac-punct-minus':
        # Preserve the narrow printed strokes and unequal lengths of the UK key.
        return ['M 8 5.4 L 16 5.4 L 16 6.2 L 8 6.2 Z',
                'M 9.75 17.4 L 14.25 17.4 L 14.25 18.2 L 9.75 18.2 Z']
    if name == 'keyboard.punct-backtick':
        return [
            centred_lettering(font, '¬', 12, 5.8, 5.2, 10.5, 2.4),
            centred_lettering(font, '`', 8.6, 17.8, 8.4, 7, 3.2),
            centred_lettering(font, '¦', 17.2, 17.8, 4.8, 5.5, 3.2),
        ]
    if name in {'keyboard.mac-digit-two', 'keyboard.mac-digit-three'}:
        upper, digit, alternate = texts
        return [
            centred_lettering(font, upper, 12, 5.8, 6.1, 10.5, 2.4),
            centred_lettering(font, digit, 12, 17.8, 8.4, 8),
            centred_lettering(font, alternate, 21.2, 17.8, 5.5, 5.5, 2.4),
        ]
    if name == 'keyboard.mac-keypad-multiply':
        return [centred_lettering(font, '*', 12, 12, 9.2, 22.5)]
    if name == 'keyboard.mac-fn-globe':
        return [lettering(font, 'fn', 18.6, 20.5, 8.4, 13.5)]
    if name in {'keyboard.mac-command', 'keyboard.mac-option', 'keyboard.mac-control'}:
        return [lettering(font, texts[0], 12, 17.5, 11)]
    if name.startswith(('keyboard.mac-command-', 'keyboard.mac-option-', 'keyboard.mac-control-')):
        center = 7 if name.endswith('-left') else 17
        return [lettering(font, texts[0], center, 17.5, 11)]
    if name == 'keyboard.mac-shift':
        return [lettering(font, texts[0], 12, 16.2, 14, 24)]
    if name == 'keyboard.mac-backspace':
        return [lettering(font, texts[0], 12, 16.2, 14, 24)]
    if name in MULTILINE_LEGENDS:
        cap_height = 5.2 if name == 'keyboard.touch-id' else 6.2
        return [fitted_lettering(font, line, 12, baseline, cap_height, 24) for line, baseline in zip(MULTILINE_LEGENDS[name], (10.8, 20.6))]
    if len(texts) == 2:
        return stacked_lettering(font, texts)
    text = texts[0]
    cap_height = 11 if len(text) == 1 and text.isupper() else 9.2 if len(text) <= 3 else 7.2 if len(text) <= 5 else 6.2
    if name == 'keyboard.altgr':
        cap_height = 6.3
    if name == 'keyboard.menu':
        cap_height = 5.2
    if name == 'keyboard.tab':
        cap_height = 8.8
    if name == 'keyboard.mac-delete-forward':
        cap_height = 12.8
    if name.startswith('keyboard.function-'):
        cap_height = 8.8
    return [fitted_lettering(font, text, 12, 12 + cap_height / 2, cap_height, 22.5)]

TEXT_MASTERS = {}
for letter in 'abcdefghijklmnopqrstuvwxyz':
    TEXT_MASTERS[f'keyboard.letter-{letter}'] = [letter.upper()]
for digit, marks in {
    'one': ['!', '1'], 'two': ['"', '2'], 'four': ['$', '4'], 'five': ['%', '5'],
    'six': ['^', '6'], 'seven': ['&', '7'], 'eight': ['*', '8'], 'nine': ['(', '9'], 'zero': [')', '0'],
}.items(): TEXT_MASTERS[f'keyboard.digit-{digit}'] = marks
for name, marks in {
    'backtick': ['¬', '`', '¦'], 'minus': ['_', '-'], 'equals': ['+', '='],
    'left-bracket': ['{', '['], 'right-bracket': ['}', ']'], 'semicolon': [':', ';'],
    'apostrophe': ['@', "'"], 'hash': ['~', '#'], 'backslash': ['|', '\\'],
    'comma': ['<', ','], 'period': ['>', '.'], 'slash': ['?', '/'],
}.items(): TEXT_MASTERS[f'keyboard.punct-{name}'] = marks
TEXT_MASTERS.update({
    'keyboard.mac-digit-two': ['@', '2', '€'], 'keyboard.mac-digit-three': ['£', '3', '#'],
    'keyboard.mac-punct-apostrophe': ['"', "'"],
    'keyboard.mac-punct-minus': ['_', '-'], 'keyboard.mac-punct-section': ['±', '§'], 'keyboard.mac-punct-backtick': ['~', '`'],
    'keyboard.mac-command': ['⌘', 'command'], 'keyboard.mac-option': ['⌥', 'option'],
    'keyboard.mac-control': ['⌃', 'control'], 'keyboard.mac-shift': ['⇧'],
    'keyboard.mac-command-left': ['⌘', 'command'], 'keyboard.mac-command-right': ['⌘', 'command'],
    'keyboard.mac-option-left': ['⌥', 'option'], 'keyboard.mac-option-right': ['⌥', 'option'],
    'keyboard.mac-control-left': ['⌃', 'control'], 'keyboard.mac-control-right': ['⌃', 'control'],
    'keyboard.mac-backspace': ['⌫'],
    'keyboard.mac-delete-forward': ['⌦'], 'keyboard.alt': ['Alt'],
    'keyboard.altgr': ['AltGr'], 'keyboard.touch-id': ['Touch ID'], 'keyboard.fn': ['Fn'], 'keyboard.menu': ['Menu'],
    'keyboard.tab': ['Tab'], 'keyboard.escape': ['Esc'], 'keyboard.backspace': ['Backspace'],
    'keyboard.delete-forward': ['Delete'], 'keyboard.space': ['Space'], 'keyboard.caps-lock': ['Caps Lock'],
    'keyboard.insert': ['Insert'], 'keyboard.home': ['Home'], 'keyboard.page-up': ['Page Up'],
    'keyboard.end': ['End'], 'keyboard.page-down': ['Page Down'], 'keyboard.print-screen': ['Print Screen'],
    'keyboard.scroll-lock': ['Scroll Lock'], 'keyboard.pause-break': ['Pause Break'],
    'keyboard.delete-backward': ['⌫'],
    'keyboard.arrow-up': ['↑'], 'keyboard.arrow-down': ['↓'], 'keyboard.arrow-left': ['←'], 'keyboard.arrow-right': ['→'],
    'keyboard.keypad-decimal': ['.'], 'keyboard.keypad-divide': ['/'], 'keyboard.keypad-multiply': ['×'],
    'keyboard.keypad-subtract': ['−'], 'keyboard.keypad-add': ['+'], 'keyboard.keypad-enter': ['Enter'],
    'keyboard.num-lock': ['Num Lock'], 'keyboard.keypad-equals': ['='], 'keyboard.clear': ['Clear'],
    'keyboard.mac-escape': ['esc'], 'keyboard.mac-keypad-multiply': ['*'],
})
for digit, word in zip('0123456789', ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']): TEXT_MASTERS[f'keyboard.keypad-{word}'] = [digit]
for number, word in enumerate(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], start=1): TEXT_MASTERS[f'keyboard.function-{word}'] = [f'F{number}']

variants = [('S', 2, 550, 15), ('M', 1.75, 500, 16), ('L', 1.5, 450, 17)]
fonts = {
    size: instantiateVariableFont(TTFont(FONT), {'wght': weight, 'opsz': 14}, inplace=True)
    for size, _stroke, weight, _cap in variants
}
# These captions are painted only on the illustrative full-size Windows layout.
# Standalone keys keep their full captions and their independent optical scales.
windows_captions = {
    'print-screen': ('PrtScn', 32),
    'scroll-lock': ('ScrLk', 25),
    'pause-break': ('Pause', 25),
    'num-lock': ('NumLk', 25),
    'backspace': ('Backspace', 62),
    'caps-lock': ('Caps', 24),
    'page-up': ('PgUp', 25),
    'page-down': ('PgDn', 25),
}
windows_captions.update({
    'escape': ('Esc', 28), 'tab': ('Tab', 30), 'insert': ('Insert', 33),
    'home': ('Home', 33), 'delete-forward': ('Delete', 33), 'end': ('End', 33),
    'windows-shift-left': ('Shift', 32), 'windows-shift-right': ('Shift', 32),
    'windows-control-left': ('Ctrl', 32), 'windows-control-right': ('Ctrl', 32),
    'windows-fn': ('Fn', 30), 'windows-alt-left': ('Alt', 30), 'windows-altgr': ('AltGr', 33),
    'windows-keypad-clear': ('Clear', 33), 'keypad-enter': ('Enter', 33),
    'keypad-add': ('+', 20), 'keypad-subtract': ('−', 20),
    'keypad-multiply': ('×', 20), 'keypad-divide': ('/', 20),
    'keypad-delete-caption': ('Del', 32), 'keypad-decimal': ('.', 20),
})
windows_short_top = {'escape', 'print-screen', 'scroll-lock', 'pause-break', 'num-lock'}
windows_number_pairs = {
    'one': ('!', '1'), 'two': ('"', '2'), 'three': ('£', '3'), 'four': ('$', '4'),
    'five': ('%', '5'), 'six': ('^', '6'), 'seven': ('&', '7'), 'eight': ('*', '8'),
    'nine': ('(', '9'), 'zero': (')', '0'),
}
windows_punctuation_pairs = {
    'minus': ('_', '-'), 'equals': ('+', '='), 'left-bracket': ('{', '['),
    'right-bracket': ('}', ']'), 'semicolon': (':', ';'), 'apostrophe': ('@', "'"),
    'hash': ('~', '#'), 'backslash': ('|', '\\'), 'comma': ('<', ','),
    'period': ('>', '.'), 'slash': ('?', '/'),
}
caption_paths = {
    key: centred_lettering(fonts['M'], text, 12, 12, 6.5 if key in windows_short_top else 8, width)
    for key, (text, width) in windows_captions.items()
}
for key, digit in enumerate('0123456789'):
    caption_paths[f'keypad-{key}'] = centred_lettering(fonts['M'], digit, 12, 12, 9.6, 20)

windows_stacked_paths = {
    f'{prefix}-{key}': ' '.join([
        centred_lettering(fonts['M'], upper, 12, 5.5, 8, 18, 0 if key == 'minus' else 2.3),
        centred_lettering(fonts['M'], lower, 12, 18.5, lower_height, 18, 0 if key == 'minus' else 2.6),
    ])
    for prefix, pairs, lower_height in [('digit', windows_number_pairs, 9.6), ('punct', windows_punctuation_pairs, 9)]
    for key, (upper, lower) in pairs.items()
}
windows_stacked_paths['punct-backtick'] = ' '.join([
    centred_lettering(fonts['M'], '¬', 12, 5.5, 8, 18, 2.3),
    centred_lettering(fonts['M'], '`', 8, 18.5, 9, 9, 2.6),
    centred_lettering(fonts['M'], '¦', 19, 18.5, 7, 8, 4),
])
(ROOT / 'src' / 'keyboard-windows-captions.js').write_text(
    '// Generated by scripts/generate-keyboard-lettering.py from licensed Inter v4.1.\n'
    'export const windowsLayoutCaptions = ' + json.dumps(caption_paths, sort_keys=True, indent=2) + ';\n'
    'export const windowsStackedLayoutCaptions = ' + json.dumps(windows_stacked_paths, sort_keys=True, indent=2) + ';\n'
)
if sys.argv[1:] == ['--windows-layout-captions']:
    sys.exit()

for name, texts in TEXT_MASTERS.items():
    lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">', f'<title>{name.removeprefix("keyboard.").replace("-", " ").title()}</title>', '<desc>Original ACM Mac keyboard symbol</desc>' if name == 'keyboard.mac-punct-minus' else ' <desc>UK keyboard legend drawn as Inter outlines</desc>']
    for size, stroke, weight, _cap in variants:
        font = fonts[size]
        paths = legends(name, texts, font)
        if name == 'keyboard.mac-punct-minus':
            left, right = {'S': ('7.8', '16.2'), 'M': ('8', '16'), 'L': ('8.2', '15.8')}[size]
            paths[0] = f'M {left} 5.4 L {right} 5.4 L {right} 6.2 L {left} 6.2 Z'
        lines += [f'<g id="Regular-{size}" stroke-width="{stroke}">']
        lines += [f'<path d="{path}" fill="currentColor" stroke="none" />' for path in paths]
        lines += ['</g>']
    (ROOT / 'masters' / f'{name}.svg').write_text('\n'.join(lines + ['</svg>', '']))

# Word captions use the full width of the wide keycap, outside the 24-unit
# standalone symbol canvas. Keep them as outlines so exports need no font.
modifier_captions = {}
for name, texts in TEXT_MASTERS.items():
    if name in {'keyboard.mac-command', 'keyboard.mac-option', 'keyboard.mac-control'} or name.startswith(('keyboard.mac-command-', 'keyboard.mac-option-', 'keyboard.mac-control-')):
        center = 29 if name == 'keyboard.mac-command-left' else 44 if name == 'keyboard.mac-command-right' else 24 if name.endswith('-left') else 48 if name.endswith('-right') else 36
        modifier_captions[name] = {
            f'Regular-{size}': lettering(fonts[size], texts[1], center, 37, 5.8, 40)
            for size, _stroke, _weight, _cap in variants
        }
(ROOT / 'src' / 'keyboard-modifier-captions.js').write_text(
    '// Generated by scripts/generate-keyboard-lettering.py from licensed Inter v4.1.\n'
    'export const macModifierCaptions = ' + json.dumps(modifier_captions, sort_keys=True, indent=2) + ';\n'
)

ART_MASTERS = {
    'keyboard.mac-fn-globe': (['fn'], [
        'M 6 14 C 3.8 14 2 15.8 2 18 C 2 20.2 3.8 22 6 22 C 8.2 22 10 20.2 10 18 C 10 15.8 8.2 14 6 14 Z',
        'M 6 14 C 4.5 16 4.5 20 6 22 M 6 14 C 7.5 16 7.5 20 6 22',
        'M 2 18 L 10 18']),
    'keyboard.mac-mission-control': (['F3'], [
        'M 4.5 2.5 L 11.5 2.5 Q 12.5 2.5 12.5 3.5 L 12.5 6 Q 12.5 7 11.5 7 L 4.5 7 Q 3.5 7 3.5 6 L 3.5 3.5 Q 3.5 2.5 4.5 2.5 Z',
        'M 4.5 9.5 L 11.5 9.5 Q 12.5 9.5 12.5 10.5 L 12.5 13 Q 12.5 14 11.5 14 L 4.5 14 Q 3.5 14 3.5 13 L 3.5 10.5 Q 3.5 9.5 4.5 9.5 Z',
        'M 16 2.5 L 19.5 2.5 Q 20.5 2.5 20.5 3.5 L 20.5 13 Q 20.5 14 19.5 14 L 16 14 Q 15 14 15 13 L 15 3.5 Q 15 2.5 16 2.5 Z']),
    'keyboard.mac-spotlight': (['F4'], [
        'M 14.5 7.5 C 14.5 10 12.5 12 10 12 C 7.5 12 5.5 10 5.5 7.5 C 5.5 5 7.5 3 10 3 C 12.5 3 14.5 5 14.5 7.5 Z',
        'M 13.3 10.8 L 18.8 14.4']),
    'keyboard.mac-dictation': (['F5'], [
        'M 12 2 C 11.17 2 10.5 2.67 10.5 3.5 L 10.5 10 C 10.5 10.83 11.17 11.5 12 11.5 C 12.83 11.5 13.5 10.83 13.5 10 L 13.5 3.5 C 13.5 2.67 12.83 2 12 2 Z',
        'M 7 8.5 L 7 9 C 7 12 9.1 14 12 14 C 14.9 14 17 12 17 9 L 17 8.5',
        'M 12 14 L 12 16 M 9.5 16 L 14.5 16']),
    'keyboard.mac-focus': (['F6'], [
        'M 18.5 3.2 C 12.5 3.7 9.1 9.3 13.8 14 C 8.3 14.4 4.5 11.7 4.5 8 C 4.5 4.6 7.3 2.4 10.8 2.4 C 14 2.4 16.5 2.6 18.5 3.2 Z']),
    'keyboard.mac-mute': (['F10'], [
        'M 9 6 L 10.6 6 L 15 2.8 L 15 14 L 10.6 10.8 L 9 10.8 Z']),
    'keyboard.mac-volume-down': (['F11'], [
        'M 4 6 L 7.5 6 L 12 2.8 L 12 14 L 7.5 10.8 L 4 10.8 Z',
        'M 15.5 5.2 C 18.2 6.8 18.2 10 15.5 11.6']),
    'keyboard.mac-volume-up': (['F12'], [
        'M 4 6 L 7.5 6 L 12 2.8 L 12 14 L 7.5 10.8 L 4 10.8 Z',
        'M 14.8 5.2 C 17.5 6.8 17.5 10 14.8 11.6 M 17.6 2.8 C 21.8 5.5 21.8 11.5 17.6 14.2']),
    'keyboard.mac-brightness-down': (['F1'], [
        'M 14 8 C 14 9.1 13.1 10 12 10 C 10.9 10 10 9.1 10 8 C 10 6.9 10.9 6 12 6 C 13.1 6 14 6.9 14 8 Z',
        'M 12 2.5 L 12 4 M 12 12 L 12 13.5 M 6.5 8 L 8 8 M 16 8 L 17.5 8 M 8.2 4.2 L 9.2 5.2 M 14.8 10.8 L 15.8 11.8 M 15.8 4.2 L 14.8 5.2 M 9.2 10.8 L 8.2 11.8']),
    'keyboard.mac-brightness-up': (['F2'], [
        'M 14.7 8 C 14.7 9.5 13.5 10.7 12 10.7 C 10.5 10.7 9.3 9.5 9.3 8 C 9.3 6.5 10.5 5.3 12 5.3 C 13.5 5.3 14.7 6.5 14.7 8 Z',
        'M 12 1.5 L 12 3.2 M 12 12.8 L 12 14.5 M 5 8 L 6.7 8 M 17.3 8 L 19 8 M 7 3 L 8.2 4.2 M 15.8 11.8 L 17 13 M 17 3 L 15.8 4.2 M 8.2 11.8 L 7 13']),
    'keyboard.mac-media-previous': (['F7'], [
        'M 10.8 3.5 L 4.8 8.5 L 10.8 13.5 Z M 18.5 3.5 L 12.5 8.5 L 18.5 13.5 Z']),
    'keyboard.mac-media-play': (['F8'], [
        'M 4 3.5 L 12 8.5 L 4 13.5 Z M 16 3.5 L 16 13.5 M 20 3.5 L 20 13.5']),
    'keyboard.mac-media-next': (['F9'], [
        'M 5 3.5 L 11 8.5 L 5 13.5 Z M 12.5 3.5 L 18.5 8.5 L 12.5 13.5 Z']),
    'keyboard.mac-touch-id': ([], [
        'M 4 15 C 3 10 5.2 5.5 9 4 M 7 18 C 5.8 12.5 7.5 8.3 11.5 6.8 M 10 20 C 8.8 15 9.3 11 12.5 9.5 M 13 20 C 11.8 16.2 12.2 13 14.4 11.5 M 16 19 C 15 16.7 15.4 14.4 17 13 M 5 8 C 7.3 4.8 11.5 3.2 15.5 4.4 M 19 8 C 20.5 10.4 20.8 13.7 19.8 16']),
    # Original ACM interpretations informed by Andrew's 10 November UK Mac photo.
    'keyboard.mac-tab': ([], ['M 4 12 L 17 12 M 12 7 L 17 12 L 12 17 M 20 6 L 20 18']),
    'keyboard.mac-caps-lock': ([], ['M 5 12 L 12 5 L 19 12 L 15 12 L 15 16 L 9 16 L 9 12 Z M 9 19 L 15 19', 'M 5 3 L 5 3']),
    'keyboard.mac-touch-ring': ([], ['M 20 12 C 20 16.4 16.4 20 12 20 C 7.6 20 4 16.4 4 12 C 4 7.6 7.6 4 12 4 C 16.4 4 20 7.6 20 12 Z']),
    'keyboard.mac-navigation-utility': ([], ['M 8 4 L 16 4 Q 17 4 17 5 L 17 19 Q 17 20 16 20 L 8 20 Q 7 20 7 19 L 7 5 Q 7 4 8 4 Z M 9 8 L 15 8 M 9 16 L 15 16', 'M 9 10 L 15 10 L 15 14 L 9 14 Z M 10 11.5 L 10 12.5 L 14 12.5 L 14 11.5 Z']),
    'keyboard.mac-home': ([], ['M 5 6 L 19 6 M 12 8 L 12 19 M 7 13 L 12 8 L 17 13']),
    'keyboard.mac-end': ([], ['M 5 18 L 19 18 M 12 5 L 12 16 M 7 11 L 12 16 L 17 11']),
    'keyboard.mac-page-up': ([], ['M 12 19 L 12 5 M 7 10 L 12 5 L 17 10']),
    'keyboard.mac-page-down': ([], ['M 12 5 L 12 19 M 7 14 L 12 19 L 17 14']),
    'keyboard.mac-arrow-up': ([], ['M 12 7 L 17 16 L 7 16 Z']),
    'keyboard.mac-arrow-down': ([], ['M 7 8 L 17 8 L 12 17 Z']),
    'keyboard.mac-arrow-left': ([], ['M 7 12 L 16 7 L 16 17 Z']),
    'keyboard.mac-arrow-right': ([], ['M 17 12 L 8 7 L 8 17 Z']),
    'keyboard.mac-keypad-clear': ([], ['M 7 5 L 17 5 Q 19 5 19 7 L 19 17 Q 19 19 17 19 L 7 19 Q 5 19 5 17 L 5 7 Q 5 5 7 5 Z M 9 9 L 15 15 M 15 9 L 9 15']),
    'keyboard.mac-keypad-enter': ([], ['M 7 9 L 17 9 M 7 16 L 12 12 L 17 16']),
    'keyboard.mac-power': ([], [
        'M 12 3 L 12 12 M 7 5.8 C 4.7 7.5 3.5 10 3.5 12.8 C 3.5 17.5 7.3 21 12 21 C 16.7 21 20.5 17.5 20.5 12.8 C 20.5 10 19.3 7.5 17 5.8']),
}

def format_number(value):
    return f'{value:.2f}'.rstrip('0').rstrip('.')

def scale_path(path, factor, center=(12, 12)):
    tokens = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', path)
    counts = {'M': 2, 'L': 2, 'C': 6, 'Q': 4, 'Z': 0}
    result = []
    while tokens:
        command = tokens.pop(0)
        result.append(command)
        for index in range(counts[command]):
            coordinate = float(tokens.pop(0))
            axis = index % 2
            result.append(format_number(center[axis] + (coordinate - center[axis]) * factor))
    return ' '.join(result)

MAC_REFERENCE_KEYS = {
    'keyboard.mac-tab', 'keyboard.mac-caps-lock', 'keyboard.mac-touch-ring',
    'keyboard.mac-navigation-utility', 'keyboard.mac-home', 'keyboard.mac-end',
    'keyboard.mac-page-up', 'keyboard.mac-page-down', 'keyboard.mac-arrow-up',
    'keyboard.mac-arrow-down', 'keyboard.mac-arrow-left', 'keyboard.mac-arrow-right',
    'keyboard.mac-keypad-clear', 'keyboard.mac-keypad-enter',
}

for name, (labels, art_paths) in ART_MASTERS.items():
    # These symbols have individually tuned optical contours in their editable masters.
    if name in {'keyboard.mac-focus', 'keyboard.mac-fn-globe', 'keyboard.mac-touch-id'}:
        continue
    description = 'Original ACM Mac keyboard symbol with Inter-derived function-key lettering' if labels else 'Original ACM Mac keyboard symbol'
    lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">', f'<title>{name.removeprefix("keyboard.").replace("-", " ").title()}</title>', f'<desc>{description}</desc>']
    for size, stroke, weight, _cap in variants:
        factor = {'S': .96, 'M': 1, 'L': 1.04}[size]
        font = fonts[size]
        is_function_row = name.startswith('keyboard.mac-') and name not in MAC_REFERENCE_KEYS and name not in {'keyboard.mac-fn-globe', 'keyboard.mac-touch-id', 'keyboard.mac-power'}
        text_paths = [lettering(font, label, 12, 22.4, 5.2, 18) for label in labels] if is_function_row else ([lettering(font, 'fn', 18.6, 20.5, 8.4, 13.5)] if name == 'keyboard.mac-fn-globe' else [])
        if is_function_row:
            paths = [scale_path(scale_path(path, factor, (12, 8)), .8, (12, 4)) for path in art_paths] + text_paths
        elif name == 'keyboard.mac-fn-globe':
            paths = [scale_path(path, factor * 1.06, (6, 18)) for path in art_paths] + text_paths
        else:
            paths = [scale_path(path, factor * (.8 if name == 'keyboard.mac-navigation-utility' else 1)) for path in art_paths] + text_paths
        artwork_stroke = 1 if name in {'keyboard.mac-navigation-utility', 'keyboard.mac-mission-control'} else 1.5 if name == 'keyboard.mac-dictation' else stroke
        lines += [f'<g id="Regular-{size}" stroke-width="{artwork_stroke}">']
        lines += [f'<path d="{path}"' + (' fill="currentColor" stroke="none"' if name.startswith('keyboard.mac-arrow-') or (name == 'keyboard.mac-navigation-utility' and index == 1) else '') + ' />' for index, path in enumerate(paths[:len(art_paths)])]
        lines += [f'<path d="{path}" fill="currentColor" stroke="none" />' for path in paths[len(art_paths):]]
        lines += ['</g>']
    (ROOT / 'masters' / f'{name}.svg').write_text('\n'.join(lines + ['</svg>', '']))
print(f'Generated {len(TEXT_MASTERS)} Inter-derived legends and {len(ART_MASTERS)} original Mac function symbols.')
