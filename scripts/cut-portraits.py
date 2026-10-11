#!/usr/bin/env python3
"""Cut portrait backgrounds into transparent PNGs without deleting black hair.

Pipeline:
1. rembg subject matting (best outer silhouette)
2. Keep only rembg-transparent pixels that are reachable from the image border
   as background — enclosed "holes" inside dark hair are restored opaque
3. Morphological close on the subject mask to reconnect thin strands
"""
from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path("public/portraits")
DST = Path("public/portraits")


def cut_with_rembg(path: Path) -> Image.Image:
    from rembg import remove

    result = remove(path.read_bytes())
    return Image.open(BytesIO(result)).convert("RGBA")


def fill_internal_holes(rgba: Image.Image, src_rgb: Image.Image, alpha_cut: int = 40) -> Image.Image:
    """Restore opaque pixels for rembg holes that are not connected to the border."""
    w, h = rgba.size
    a = rgba.split()[3]
    ap = a.load()
    # Border-connected transparent = real background.
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if ap[x, y] < alpha_cut and not bg[y][x]:
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and ap[nx, ny] < alpha_cut:
                bg[ny][nx] = True
                q.append((nx, ny))

    out = rgba.copy()
    op = out.load()
    sp = src_rgb.load()
    for y in range(h):
        for x in range(w):
            if ap[x, y] < alpha_cut and not bg[y][x]:
                # Hole inside the subject — restore original color fully opaque.
                r, g, b = sp[x, y][:3]
                op[x, y] = (r, g, b, 255)
    return out


def close_subject_mask(rgba: Image.Image, src_rgb: Image.Image, radius: int = 6) -> Image.Image:
    """Dilate+erode the alpha mask so thin dark strands reconnect, then sample RGB from source."""
    a = rgba.split()[3]
    # MaxFilter = dilate, MinFilter = erode on luminance of alpha.
    closed = a.filter(ImageFilter.MaxFilter(radius * 2 + 1)).filter(ImageFilter.MinFilter(radius * 2 + 1))
    # Only grow into pixels that were nearly transparent — don't invent far-away bg blobs.
    # Soften: take max of original alpha and closed alpha, but if closed fills a bg gap
    # far from subject it's ok because we already constrained via rembg silhouette roughly.
    # Safer: only fill where closed is high AND a nearby original opaque exists (already true via close).
    w, h = rgba.size
    out = rgba.copy()
    op = out.load()
    sp = src_rgb.load()
    ap = a.load()
    cp = closed.load()
    for y in range(h):
        for x in range(w):
            oa = ap[x, y]
            ca = cp[x, y]
            if ca > oa and ca >= 180 and oa < 40:
                r, g, b = sp[x, y][:3]
                op[x, y] = (r, g, b, 255)
            elif oa < 40:
                # stay transparent (true bg)
                r, g, b, _ = op[x, y]
                op[x, y] = (r, g, b, 0)
            else:
                r, g, b = sp[x, y][:3]
                op[x, y] = (r, g, b, max(oa, 255 if oa > 128 else oa))
    return out


def harden_alpha(rgba: Image.Image) -> Image.Image:
    """Snap soft matte: keep soft edges near the silhouette, but don't leave hair half-transparent."""
    w, h = rgba.size
    out = rgba.copy()
    px = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 24:
                px[x, y] = (r, g, b, 0)
            elif a > 160:
                px[x, y] = (r, g, b, 255)
            # else keep soft fringe
    return out


def cut(path: Path) -> Path:
    src = Image.open(path).convert("RGBA")
    try:
        matted = cut_with_rembg(path)
    except Exception as e:
        print(f"rembg failed for {path.name} ({e}); copying opaque")
        matted = src.copy()

    fixed = fill_internal_holes(matted, src)
    fixed = close_subject_mask(fixed, src, radius=5)
    fixed = fill_internal_holes(fixed, src)  # fill any holes left after close
    fixed = harden_alpha(fixed)

    out = DST / (path.stem + ".png")
    fixed.save(out, "PNG")
    return out


def main() -> None:
    jpgs = sorted(SRC.glob("*.jpg"))
    for p in jpgs:
        out = cut(p)
        print("wrote", out)


if __name__ == "__main__":
    main()
