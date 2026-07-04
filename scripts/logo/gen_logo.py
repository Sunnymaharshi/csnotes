#!/usr/bin/env python3
"""
CS Notes app logo generator.

Draws a tilted thin crescent moon with note-lines emerging from its inner edge,
on a near-black background, and writes all 5 app icon assets into ../../assets.

The note-lines use the *same* flat tone as the moon, so where they overlap the moon
they vanish and only their tips show in the dark opening -> they read as "emerging"
from the moon (the moon "writing" notes).

Run:
    pip install cairosvg                       # once
    # macOS also needs the native cairo lib:  brew install cairo
    python3 scripts/logo/gen_logo.py           # from repo root
    # if cairo isn't found on macOS:
    DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib python3 scripts/logo/gen_logo.py

After regenerating, rebuild the app to see the new launcher/splash icon
(`npx expo run:android` / prebuild) -- a Metro reload will NOT update it.

--------------------------------------------------------------------------------
TWEAK HERE  (all coordinates are in a 1024x1024 space)
--------------------------------------------------------------------------------
"""
import os, math, cairosvg

# --- Moon shape ---------------------------------------------------------------
# The crescent = the region inside circle C1 but outside circle C2.
# Move C2 closer to C1 (smaller x) and/or raise R2 to make the crescent THINNER.
C1 = (512, 512); R1 = 300          # main moon disc
C2 = (614, 512); R2 = 286          # cut-out disc (thinner crescent = C2 closer / R2 bigger)

TILT = -36                         # moon tilt in degrees (more negative = leans further left)
PIV  = (455, 512)                  # rotation pivot (~visual centre of the composite)

# --- Colours ------------------------------------------------------------------
MOON       = "#EDEEF2"             # flat moon tone (no gradient / no shading)
MONO       = "#FFFFFF"            # android themed-icon silhouette (must be single flat colour)
BG_TOP     = "#0B0C10"             # near-black background (top)
BG_BOTTOM  = "#050506"             # near-black background (bottom)

# --- Note-lines ---------------------------------------------------------------
# Each line is horizontal from x=LINES_X0 (tucked under the moon) to x=RIGHT[i].
# Shift LINES_X0 + RIGHT together LEFT to move lines closer to / more behind the moon.
# The last RIGHT value is pulled in so that line's right cap hides behind the moon.
LINES_X0   = 392
YS         = [512 - 118, 512 - 24, 512 + 70]   # vertical positions of the 3 lines
RIGHT      = [658, 618, 530]                    # right end x of each line
LINE_WIDTH = 26

# --- Per-asset scale (fraction of canvas the moon occupies) -------------------
SCALE_ICON   = 0.86
SCALE_FG     = 0.62   # android adaptive foreground (kept inside the safe zone)
SCALE_MONO   = 0.62
SCALE_SPLASH = 0.52
# --------------------------------------------------------------------------------


def crescent_path(c1, r1, c2, r2):
    (x1, y1), (x2, y2) = c1, c2
    d = math.hypot(x2 - x1, y2 - y1)
    a = (d * d + r1 * r1 - r2 * r2) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0))
    ux, uy = (x2 - x1) / d, (y2 - y1) / d
    px, py = x1 + a * ux, y1 + a * uy
    I1 = (px - h * uy, py + h * ux)
    I2 = (px + h * uy, py - h * ux)
    return (f'M {I1[0]:.1f} {I1[1]:.1f} A {r1} {r1} 0 1 1 {I2[0]:.1f} {I2[1]:.1f} '
            f'A {r2} {r2} 0 0 0 {I1[0]:.1f} {I1[1]:.1f} Z')


def rot(p, deg=TILT, piv=PIV):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    x, y = p[0] - piv[0], p[1] - piv[1]
    return (piv[0] + c * x - s * y, piv[1] + s * x + c * y)


PATH = crescent_path(rot(C1), R1, rot(C2), R2)   # tilt baked into geometry
DX, DY = 512 - PIV[0], 512 - PIV[1]              # recentre composite

DEFS = f'''
  <linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="{BG_TOP}"/><stop offset="1" stop-color="{BG_BOTTOM}"/></linearGradient>'''


def note_lines(stroke):
    ln = '\n'.join(
        f'<line x1="{LINES_X0}" y1="{y}" x2="{r}" y2="{y}" stroke-width="{LINE_WIDTH}"/>'
        for y, r in zip(YS, RIGHT))
    return f'<g stroke="{stroke}" stroke-linecap="round">{ln}</g>'


def moon(color):
    return f'<path d="{PATH}" fill="{color}"/>{note_lines(color)}'


def group(inner, scale):
    return (f'<g transform="translate(512 512) scale({scale}) '
            f'translate({DX - 512} {DY - 512})">{inner}</g>')


def wrap(inner):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" '
            f'viewBox="0 0 1024 1024"><defs>{DEFS}</defs>{inner}</svg>')


ASSETS = {
    "icon.png":                    wrap(f'<rect width="1024" height="1024" fill="url(#bg)"/>{group(moon(MOON), SCALE_ICON)}'),
    "android-icon-foreground.png": wrap(group(moon(MOON), SCALE_FG)),
    "android-icon-background.png": wrap('<rect width="1024" height="1024" fill="url(#bg)"/>'),
    "android-icon-monochrome.png": wrap(group(moon(MONO), SCALE_MONO)),
    "splash-icon.png":             wrap(group(moon(MOON), SCALE_SPLASH)),
}

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "assets")

if __name__ == "__main__":
    for name, svg in ASSETS.items():
        path = os.path.abspath(os.path.join(OUT, name))
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=1024, output_height=1024)
        print("wrote", path)
