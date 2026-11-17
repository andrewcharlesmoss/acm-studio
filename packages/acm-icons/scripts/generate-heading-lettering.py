"""Generate H1–H6 SVG masters from the pinned, licensed Inter v4.1 font.

Requires fonttools==4.60.1. Run from the @acm/icons package root.
Use --check to verify masters without changing them.
"""
from pathlib import Path
from hashlib import sha256
import argparse
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "sources/inter/InterVariable.ttf"
EXPECTED = "4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf"
LEVEL_WORDS = ["one", "two", "three", "four", "five", "six"]
# Slightly heavier, smaller contours keep the 16px marks clear. The three
# optical variants share Inter's text proportions, with no added outline.
VARIANTS = [("S", 2, 600, 11), ("M", 1.75, 550, 12), ("L", 1.5, 500, 12.5)]


class PathPen(BasePen):
    """Keep the package's restricted, absolute SVG path grammar."""
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.commands = []

    def add(self, command, *points):
        values = [f"{value:.4f}".rstrip("0").rstrip(".") or "0"
                  for point in points for value in point]
        self.commands.append(" ".join([command] + values))

    def _moveTo(self, point): self.add("M", point)
    def _lineTo(self, point): self.add("L", point)
    def _curveToOne(self, first, second, end): self.add("C", first, second, end)
    def _qCurveToOne(self, control, end): self.add("Q", control, end)
    def _closePath(self): self.add("Z")


def level_paths(font, level, cap_height):
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    positioned = []
    advance = 0
    bounds = BoundsPen(glyphs)
    for character in f"H{level}":
        glyph = glyphs[cmap[ord(character)]]
        positioned.append((glyph, advance))
        glyph.draw(TransformPen(bounds, (1, 0, 0, 1, advance, 0)))
        advance += glyph.width
    left, bottom, right, top = bounds.bounds
    scale = cap_height / font["OS/2"].sCapHeight
    # Centre painted bounds rather than side bearings, preserving natural
    # glyph spacing and a consistent cap height for every level.
    x = 12 - (left + right) * scale / 2
    baseline = 12 + cap_height / 2
    if (right - left) * scale > 22 or (top - bottom) * scale > 22:
        raise ValueError(f"H{level} exceeds its optical canvas")
    paths = []
    for glyph, glyph_advance in positioned:
        pen = PathPen(glyphs)
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale,
                                     x + glyph_advance * scale, baseline)))
        paths.append(" ".join(pen.commands))
    return paths


def generate(check=False):
    if sha256(FONT.read_bytes()).hexdigest() != EXPECTED:
        raise ValueError("Inter source digest does not match the pinned v4.1 font")
    fonts = {size: instantiateVariableFont(TTFont(FONT), {"wght": weight, "opsz": 14}, inplace=True)
             for size, _stroke, weight, _cap in VARIANTS}
    for level, word in enumerate(LEVEL_WORDS, start=1):
        lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">',
                 f"<title>Heading {level}</title>",
                 f"<desc>Heading {level} drawn as licensed Inter outlines</desc>"]
        for size, stroke, _weight, cap_height in VARIANTS:
            lines.append(f'<g id="Regular-{size}" stroke-width="{stroke}">')
            lines.extend(f'<path d="{path}" fill="currentColor" stroke="none" />'
                         for path in level_paths(fonts[size], level, cap_height))
            lines.append("</g>")
        source = "\n".join(lines + ["</svg>", ""])
        master = ROOT / "masters" / f"text.heading-{word}.svg"
        if check:
            if master.read_text() != source:
                raise ValueError(f"Generated heading master drift: {master.name}")
        else:
            master.write_text(source)
    print(f"{'Verified' if check else 'Generated'} six Inter-derived heading masters.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    generate(parser.parse_args().check)
