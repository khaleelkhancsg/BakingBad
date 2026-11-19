# Builds the voxel edition's pixel font, "Bakery Pixel" (www/fonts/BakeryPixel-*.woff), from the glyph drawings below.
# Drawn for reading at phone size: 5 x 7 capitals and digits on a 10-pixel em, with the shapes that pixel fonts often
# merge kept apart (5 has a flat top and S doesn't, 8 is round where B is square, C is open where O is closed, 0 has a
# slash). Run:  python tools/pixelfont.py
# Characters it doesn't draw (accents, emoji, rarer symbols) fall back to Pixelify Sans, then the system's fonts.
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX = 100          # font units per pixel (an em is 10 pixels)
CAP = 7           # rows above the baseline; rows 7 and 8 of a drawing hang below it
G = {}            # character -> rows (top first); '#' is ink

def g(chars, art):
    rows = [r for r in art.strip('\n').split('\n')]
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, '.') for r in rows]
    for ch in chars: G[ch] = rows

# ---------- capitals ----------
g('A', """
.###.
#...#
#...#
#####
#...#
#...#
#...#""")
g('B', """
####.
#...#
#...#
####.
#...#
#...#
####.""")
g('C', """
.####
#....
#....
#....
#....
#....
.####""")
g('D', """
####.
#...#
#...#
#...#
#...#
#...#
####.""")
g('E', """
#####
#....
#....
####.
#....
#....
#####""")
g('F', """
#####
#....
#....
####.
#....
#....
#....""")
g('G', """
.####
#....
#....
#.###
#...#
#...#
.####""")
g('H', """
#...#
#...#
#...#
#####
#...#
#...#
#...#""")
g('I', """
###
.#.
.#.
.#.
.#.
.#.
###""")
g('J', """
..###
...#.
...#.
...#.
...#.
#..#.
.##..""")
g('K', """
#...#
#..#.
#.#..
##...
#.#..
#..#.
#...#""")
g('L', """
#....
#....
#....
#....
#....
#....
#####""")
g('M', """
#...#
##.##
#.#.#
#.#.#
#...#
#...#
#...#""")
g('N', """
#...#
##..#
#.#.#
#..##
#...#
#...#
#...#""")
g('O', """
.###.
#...#
#...#
#...#
#...#
#...#
.###.""")
g('P', """
####.
#...#
#...#
####.
#....
#....
#....""")
g('Q', """
.###.
#...#
#...#
#...#
#.#.#
#..#.
.##.#""")
g('R', """
####.
#...#
#...#
####.
#.#..
#..#.
#...#""")
g('S', """
.####
#....
#....
.###.
....#
....#
####.""")
g('T', """
#####
..#..
..#..
..#..
..#..
..#..
..#..""")
g('U', """
#...#
#...#
#...#
#...#
#...#
#...#
.###.""")
g('V', """
#...#
#...#
#...#
#...#
#...#
.#.#.
..#..""")
g('W', """
#...#
#...#
#...#
#.#.#
#.#.#
##.##
#...#""")
g('X', """
#...#
#...#
.#.#.
..#..
.#.#.
#...#
#...#""")
g('Y', """
#...#
#...#
.#.#.
..#..
..#..
..#..
..#..""")
g('Z', """
#####
....#
...#.
..#..
.#...
#....
#####""")

# ---------- digits (all the same width, so columns of numbers line up) ----------
g('0', """
.###.
#...#
#..##
#.#.#
##..#
#...#
.###.""")
g('1', """
..#..
.##..
..#..
..#..
..#..
..#..
.###.""")
g('2', """
.###.
#...#
....#
...#.
..#..
.#...
#####""")
g('3', """
####.
....#
....#
.###.
....#
....#
####.""")
g('4', """
...#.
..##.
.#.#.
#..#.
#####
...#.
...#.""")
g('5', """
#####
#....
####.
....#
....#
#...#
.###.""")
g('6', """
..##.
.#...
#....
####.
#...#
#...#
.###.""")
g('7', """
#####
....#
...#.
..#..
..#..
..#..
..#..""")
g('8', """
.###.
#...#
#...#
.###.
#...#
#...#
.###.""")
g('9', """
.###.
#...#
#...#
.####
....#
...#.
.##..""")

# ---------- small letters (x-height 5, descenders 2) ----------
g('a', """
.....
.....
.###.
....#
.####
#...#
.####""")
g('b', """
#....
#....
####.
#...#
#...#
#...#
####.""")
g('c', """
.....
.....
.####
#....
#....
#....
.####""")
g('d', """
....#
....#
.####
#...#
#...#
#...#
.####""")
g('e', """
.....
.....
.###.
#...#
#####
#....
.###.""")
g('f', """
..##
.#..
####
.#..
.#..
.#..
.#..""")
g('g', """
.....
.....
.####
#...#
#...#
#...#
.####
....#
.###.""")
g('h', """
#....
#....
####.
#...#
#...#
#...#
#...#""")
g('i', """
#
.
#
#
#
#
#""")
g('j', """
..#
...
..#
..#
..#
..#
..#
..#
##.""")
g('k', """
#...
#...
#..#
#.#.
##..
#.#.
#..#""")
g('l', """
#.
#.
#.
#.
#.
#.
.#""")
g('m', """
.....
.....
##.#.
#.#.#
#.#.#
#.#.#
#.#.#""")
g('n', """
.....
.....
####.
#...#
#...#
#...#
#...#""")
g('o', """
.....
.....
.###.
#...#
#...#
#...#
.###.""")
g('p', """
.....
.....
####.
#...#
#...#
#...#
####.
#....
#....""")
g('q', """
.....
.....
.####
#...#
#...#
#...#
.####
....#
....#""")
g('r', """
....
....
#.##
##..
#...
#...
#...""")
g('s', """
.....
.....
.####
#....
.###.
....#
####.""")
g('t', """
.#..
.#..
####
.#..
.#..
.#..
..##""")
g('u', """
.....
.....
#...#
#...#
#...#
#...#
.####""")
g('v', """
.....
.....
#...#
#...#
#...#
.#.#.
..#..""")
g('w', """
.....
.....
#...#
#...#
#.#.#
#.#.#
.#.#.""")
g('x×', """
.....
.....
#...#
.#.#.
..#..
.#.#.
#...#""")
g('y', """
.....
.....
#...#
#...#
#...#
#...#
.####
....#
.###.""")
g('z', """
.....
.....
#####
...#.
..#..
.#...
#####""")

# ---------- punctuation and symbols ----------
g('  ', """
...
...
...
...
...
...
...""")
g('.', """
.
.
.
.
.
.
#""")
g(',', """
..
..
..
..
..
..
.#
#.""")
g(':', """
.
.
#
.
.
#
.""")
g(';', """
..
..
.#
..
..
.#
.#
#.""")
g('!', """
#
#
#
#
#
.
#""")
g('?', """
.###.
#...#
....#
...#.
..#..
.....
..#..""")
g("'’‘", """
#
#""")
g('"“”', """
#.#
#.#""")
g('-‐‑', """
...
...
...
###""")
g('–−', """
....
....
....
####""")
g('—', """
......
......
......
######""")
g('_', """
.....
.....
.....
.....
.....
.....
.....
#####""")
g('+', """
.....
..#..
..#..
#####
..#..
..#..
.....""")
g('=', """
....
....
####
....
####""")
g('(', """
..#
.#.
#..
#..
#..
.#.
..#""")
g(')', """
#..
.#.
..#
..#
..#
.#.
#..""")
g('[', """
##
#.
#.
#.
#.
#.
##""")
g(']', """
##
.#
.#
.#
.#
.#
##""")
g('/', """
....#
....#
...#.
..#..
.#...
#....
#....""")
g('\\', """
#....
#....
.#...
..#..
...#.
....#
....#""")
g('|', """
#
#
#
#
#
#
#
#""")
g('%', """
##...
##..#
...#.
..#..
.#...
#..##
...##""")
g('&', """
.##..
#..#.
#.#..
.#...
#.#.#
#..#.
.##.#""")
g('*', """
.....
#.#.#
.###.
#####
.###.
#.#.#""")
g('#', """
.#.#.
#####
.#.#.
.#.#.
#####
.#.#.""")
g('@', """
.###.
#...#
#.###
#.#.#
#.###
#....
.###.""")
g('<', """
...#
..#.
.#..
#...
.#..
..#.
...#""")
g('>', """
#...
.#..
..#.
...#
..#.
.#..
#...""")
g('£', """
..##.
.#..#
.#...
####.
.#...
.#...
#####""")
g('$', """
..#..
.####
#.#..
.###.
..#.#
####.
..#..""")
g('€', """
..###
.#...
####.
.#...
####.
.#...
..###""")
g('→', """
.....
..#..
...#.
#####
...#.
..#..""")
g('←', """
.....
..#..
.#...
#####
.#...
..#..""")
g('↑', """
..#..
.###.
#.#.#
..#..
..#..
..#..
..#..""")
g('↓', """
..#..
..#..
..#..
..#..
#.#.#
.###.
..#..""")
g('·•', """
.
.
.
#""")
g('…', """
.....
.....
.....
.....
.....
.....
#.#.#""")
g('°', """
.#.
#.#
.#.""")
g('~', """
.....
.....
.....
.#..#
#.##.""")
g('^', """
.#.
#.#""")

def build(path, bold):
    order = ['.notdef'] + ['u%04X' % ord(c) for c in G]
    cmap = {ord(c): 'u%04X' % ord(c) for c in G}
    glyphs, metrics = {}, {}
    extra = 50 if bold else 0  # bold: every stroke half a pixel wider (gaps of a pixel stay open)
    pen = TTGlyphPen(None); glyphs['.notdef'] = pen.glyph(); metrics['.notdef'] = (600, 0)
    for c, rows in G.items():
        pen = TTGlyphPen(None)
        w = len(rows[0])
        for r, row in enumerate(rows):
            top = (CAP - r) * PX
            x = 0
            while x < w:
                if row[x] != '#': x += 1; continue
                s = x
                while x < w and row[x] == '#': x += 1
                # a run of ink as one rectangle, a hair taller so rows touching each other leave no seam
                x0, x1, y0, y1 = s * PX, x * PX + extra, top - PX - 2, top + 2
                pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
        name = 'u%04X' % ord(c)
        glyphs[name] = pen.glyph()
        adv = (w + 1) * PX + extra
        metrics[name] = (adv, 0)
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    for n in order:
        gl = fb.font['glyf'][n]
        gl.recalcBounds(fb.font['glyf'])
        metrics[n] = (metrics[n][0], getattr(gl, 'xMin', 0))
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=900, descent=-300)
    fam = 'Bakery Pixel'
    style = 'Bold' if bold else 'Regular'
    fb.setupNameTable({'familyName': fam, 'styleName': style, 'uniqueFontIdentifier': f'{fam} {style}', 'fullName': f'{fam} {style}', 'psName': f'BakeryPixel-{style}', 'version': 'Version 1.0'})
    fb.setupOS2(sTypoAscender=900, sTypoDescender=-300, sTypoLineGap=0, usWinAscent=900, usWinDescent=300, sxHeight=500, sCapHeight=700,
                usWeightClass=700 if bold else 400, fsSelection=0x20 if bold else 0x40, achVendID='BKBD')
    fb.setupPost()
    fb.font['head'].macStyle = 1 if bold else 0
    fb.font.flavor = 'woff'
    fb.save(path)

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'www', 'fonts')
build(os.path.join(out, 'BakeryPixel-Regular.woff'), False)
build(os.path.join(out, 'BakeryPixel-Bold.woff'), True)
cps = sorted(ord(c) for c in G)
# the unicode-range for the CSS, as compact ranges
ranges, a = [], cps[0]
for i in range(1, len(cps) + 1):
    if i == len(cps) or cps[i] != cps[i - 1] + 1:
        b = cps[i - 1]; ranges.append('U+%04X' % a if a == b else 'U+%04X-%04X' % (a, b))
        if i < len(cps): a = cps[i]
print(len(G), 'glyphs')
print(', '.join(ranges))
