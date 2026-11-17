"""Normalise the pinned MIT-licensed Copilot brand SVG; do not redesign it."""
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'sources/copilot/copilot.svg').read_bytes()
if hashlib.sha256(source).hexdigest() != '6708c5eb7fd426d3bd0de54edcecbb2a96bfcfd40ae1eb5745b0c12e19c8f1d2':
    raise ValueError('Copilot source differs from the reviewed upstream SVG')
pen = RecordingPen()
parse_path(re.search(r'<path d="([^"]+)"', source.decode()).group(1), pen)
commands = {'moveTo': 'M', 'lineTo': 'L', 'curveTo': 'C', 'qCurveTo': 'Q', 'closePath': 'Z'}
parts = []
for operation, points in pen.value:
    parts.append(commands[operation])
    for point in points:
        for coordinate in point:
            value = coordinate * 0.875 + 1.5
            parts.append(f'{value:.6f}'.rstrip('0').rstrip('.'))
path = ' '.join(parts)
# The source's outer and inner contours have opposite winding, so its central
# opening is preserved by our existing nonzero fill rule without a mask.
header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
lines = [header, '<title>Copilot</title>', '<desc>Microsoft Copilot mark from Lobe Icons, MIT licence</desc>']
for scale, width in [('S', '2'), ('M', '1.75'), ('L', '1.5')]:
    lines += [f'<g id="Regular-{scale}" stroke-width="{width}">', f'<path d="{path}" fill="currentColor" stroke="none" />', '</g>']
lines.append('</svg>')
(ROOT / 'masters/keyboard.copilot.svg').write_text('\n'.join(lines) + '\n')
