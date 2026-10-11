#!/usr/bin/env python3
"""Build unique Mythic+ variant portraits from base character cutouts.

Each variant gets a distinct crop, kit-color wash, rarity frame, and emblem
so Mythic / World Class / #1 cards never reuse the plain base bust.
"""
from __future__ import annotations

import colorsys
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("public/portraits")
OUT = ROOT / "variants"
CATALOG = Path("src/shared/catalog.ts")


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def parse_variants() -> list[tuple[str, str, str, str, str]]:
    """Returns (variantId, characterId, label, rarity, kitHex)."""
    text = CATALOG.read_text()
    out = []
    for m in re.finditer(
        r'v\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"(M|WC|N1)",\s*"[^"]+",\s*"[^"]+",\s*([^)]+)\)',
        text,
    ):
        char, key, label, rarity, kit_expr = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5).strip()
        kit = kit_expr.strip()
        if kit.startswith('"') or kit.startswith("'"):
            kit_hex = kit.strip("\"'")
        else:
            # named const like BM, PXG — resolve from catalog assignments
            mm = re.search(rf'const {re.escape(kit)}\s*=\s*"([^"]+)"', text)
            kit_hex = mm.group(1) if mm else "#1d4ed8"
        out.append((f"{char}.{key}", char, label, rarity, kit_hex))
    return out


RARITY_TINT = {
    "M": (244, 114, 182),
    "WC": (249, 115, 22),
    "N1": (34, 211, 238),
}


def tint_overlay(im: Image.Image, rgb: tuple[int, int, int], alpha: float) -> Image.Image:
    overlay = Image.new("RGBA", im.size, (*rgb, int(255 * alpha)))
    base = im.convert("RGBA")
    # Only tint opaque pixels.
    r, g, b, a = base.split()
    tinted = Image.composite(Image.blend(base, overlay, alpha), base, a.point(lambda x: 255 if x > 20 else 0))
    return tinted


def make_variant(variant_id: str, char: str, label: str, rarity: str, kit: str, idx: int) -> Path:
    src = ROOT / f"{char}.png"
    if not src.exists():
        src = ROOT / f"{char}.jpg"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    # Unique crop / zoom per variant index.
    zoom = 1.0 + (idx % 5) * 0.04
    cw, ch = int(w / zoom), int(h / zoom)
    ox = (idx * 37) % max(1, w - cw)
    oy = (idx * 19) % max(1, int((h - ch) * 0.35))
    im = im.crop((ox, oy, ox + cw, oy + ch)).resize((1024, 1024), Image.Resampling.LANCZOS)

    kit_rgb = hex_rgb(kit)
    rar_rgb = RARITY_TINT[rarity]
    # Color grade
    im = ImageEnhance.Color(im).enhance(1.05 + (idx % 3) * 0.08)
    im = ImageEnhance.Contrast(im).enhance(1.08 if rarity != "N1" else 1.18)
    im = tint_overlay(im, kit_rgb, 0.12 + (0.04 if rarity == "M" else 0.08))
    if rarity == "WC":
        # Soft rainbow edge glow
        edge = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(edge)
        for i, c in enumerate([(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246), (168, 85, 247)]):
            d.rectangle((0, 80 + i * 140, 36, 200 + i * 140), fill=(*c, 160))
            d.rectangle((988, 80 + i * 140, 1024, 200 + i * 140), fill=(*c, 160))
        im = Image.alpha_composite(im, edge)
    if rarity == "N1":
        im = tint_overlay(im, (34, 211, 238), 0.1)
        glow = im.filter(ImageFilter.GaussianBlur(8))
        im = Image.blend(im, glow, 0.18)

    # Kit sash + rarity badge
    d = ImageDraw.Draw(im)
    d.polygon([(0, 860), (420, 860), (360, 1024), (0, 1024)], fill=(*kit_rgb, 210))
    badge = (*rar_rgb, 230)
    d.rounded_rectangle((24, 24, 170, 88), radius=14, fill=badge)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
        small = font
    d.text((40, 38), rarity if rarity != "N1" else "#1", fill=(15, 23, 42, 255), font=font)
    # Short label strip
    d.rounded_rectangle((24, 960, 520, 1004), radius=10, fill=(2, 6, 23, 200))
    d.text((36, 968), label[:28], fill=(241, 245, 249, 255), font=small)

    # Unique mark per variant (hash of id)
    hx = sum(ord(c) for c in variant_id) % 360
    mark = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(hx / 360, 0.65, 0.95))
    d.ellipse((880, 40, 980, 140), outline=(*mark, 255), width=8)
    d.ellipse((905, 65, 955, 115), fill=(*mark, 220))

    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{variant_id}.png"
    im.save(dest, "PNG")
    return dest


def main() -> None:
    variants = parse_variants()
    print(f"building {len(variants)} mythic+ variant portraits")
    for i, (vid, char, label, rarity, kit) in enumerate(variants):
        out = make_variant(vid, char, label, rarity, kit, i)
        print("wrote", out)


if __name__ == "__main__":
    main()
