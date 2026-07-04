# Bakes public/texture.png: composites a transparent texture tile over the
# site's cream --background so the page background needs no blend/opacity
# tricks. Rerun if --background in src/styles.css or the source tile changes.
#
# Usage:
#   curl -sLo /tmp/tile.png https://www.transparenttextures.com/patterns/grunge-wall.png
#   sips -s format bmp /tmp/tile.png --out /tmp/tile.bmp
#   python3 scripts/bake-texture.py /tmp/tile.bmp /tmp/baked.bmp
#   sips -s format png /tmp/baked.bmp --out public/texture.png
#
# (Goes via BMP because stdlib python can't read PNG and Pillow isn't a
# project dependency; sips ships with macOS.)

import struct
import sys

BG = (0xF2, 0xF1, 0xE8)  # r,g,b of --background in src/styles.css
K = 0.33  # alpha amplification: the source tile's own alpha is faint (~29% avg)

src, dst = sys.argv[1], sys.argv[2]
with open(src, "rb") as f:
    d = bytearray(f.read())
off = struct.unpack("<I", d[10:14])[0]
w, h = struct.unpack("<ii", d[18:26])
assert struct.unpack("<H", d[28:30])[0] == 32, "expected 32bpp BMP (sips output)"
row = (w * 4 + 3) // 4 * 4
for y in range(abs(h)):
    base = off + y * row
    for x in range(w):
        i = base + x * 4
        b, g, r, a = d[i], d[i + 1], d[i + 2], d[i + 3]
        af = min(1.0, (a / 255.0) * K)
        # multiply the mark into the cream, then blend: darkens without graying
        mb, mg, mr = BG[2] * b // 255, BG[1] * g // 255, BG[0] * r // 255
        d[i] = round(BG[2] * (1 - af) + mb * af)
        d[i + 1] = round(BG[1] * (1 - af) + mg * af)
        d[i + 2] = round(BG[0] * (1 - af) + mr * af)
        d[i + 3] = 255
with open(dst, "wb") as f:
    f.write(d)
print(f"baked {w}x{abs(h)} over #{BG[0]:02x}{BG[1]:02x}{BG[2]:02x} at K={K}")
