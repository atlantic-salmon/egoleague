#!/usr/bin/env python3
"""Cut near-black / soft-glow backgrounds from character portraits into transparent PNGs."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

SRC = Path("public/portraits")
DST = Path("public/portraits")


def cut(path: Path) -> Path:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    # Sample dark corner average as key color.
    samples = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1], px[2, 2], px[w - 3, 2]]
    kr = sum(c[0] for c in samples) / len(samples)
    kg = sum(c[1] for c in samples) / len(samples)
    kb = sum(c[2] for c in samples) / len(samples)

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Distance to key + darkness score (kills blue rim glow too).
            dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            # Soft alpha: fully transparent for dark bg, keep bright subject.
            if dist < 38 and lum < 55:
                alpha = 0
            elif dist < 70 and lum < 90:
                t = (dist - 38) / 32
                alpha = int(max(0, min(255, t * 255 * (lum / 90))))
            elif lum < 28:
                alpha = 0
            elif lum < 48 and max(r, g, b) < 90:
                alpha = int((lum - 28) / 20 * 180)
            else:
                # Mildly fade very dark edge pixels that are still bg-ish.
                if lum < 40 and dist < 100:
                    alpha = int(lum / 40 * 200)
                else:
                    alpha = 255
            px[x, y] = (r, g, b, alpha)

    out = DST / (path.stem + ".png")
    im.save(out, "PNG")
    return out


def main() -> None:
    jpgs = sorted(SRC.glob("*.jpg"))
    for p in jpgs:
        out = cut(p)
        print("wrote", out)


if __name__ == "__main__":
    main()
