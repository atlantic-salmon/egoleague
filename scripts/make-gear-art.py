#!/usr/bin/env python3
"""Generate simple gear PNGs for boots / band / jersey per rarity."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path("public/gear")

COLORS = {
    "C": "#9ca3af",
    "UC": "#4ade80",
    "R": "#38bdf8",
    "E": "#a78bfa",
    "L": "#fbbf24",
    "M": "#f472b6",
    "WC": "#f97316",
    "N1": "#22d3ee",
}


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def draw_boots(d: ImageDraw.ImageDraw, color: tuple[int, int, int]) -> None:
    # Left / right cleat silhouettes
    d.rounded_rectangle((70, 170, 190, 250), radius=28, fill=color)
    d.rounded_rectangle((220, 170, 340, 250), radius=28, fill=color)
    d.polygon([(90, 170), (170, 170), (185, 120), (75, 130)], fill=color)
    d.polygon([(240, 170), (320, 170), (335, 120), (225, 130)], fill=color)
    stud = tuple(max(0, c - 40) for c in color)
    for x in (95, 130, 160, 245, 280, 310):
        d.ellipse((x, 245, x + 18, 268), fill=stud)


def draw_band(d: ImageDraw.ImageDraw, color: tuple[int, int, int]) -> None:
    d.rounded_rectangle((70, 150, 340, 220), radius=40, fill=color)
    stripe = tuple(min(255, c + 50) for c in color)
    d.rectangle((70, 175, 340, 195), fill=stripe)
    d.ellipse((175, 95, 235, 155), outline=color, width=14)


def draw_jersey(d: ImageDraw.ImageDraw, color: tuple[int, int, int]) -> None:
    # Torso
    d.polygon([(130, 110), (270, 110), (300, 300), (110, 300)], fill=color)
    # Sleeves
    d.polygon([(130, 110), (70, 160), (95, 210), (150, 170)], fill=color)
    d.polygon([(270, 110), (340, 160), (315, 210), (260, 170)], fill=color)
    # Collar
    d.polygon([(165, 110), (205, 150), (245, 110)], fill=(15, 23, 42))
    # Number blob
    d.rounded_rectangle((175, 180, 235, 250), radius=10, fill=(15, 23, 42))


DRAW = {"boots": draw_boots, "band": draw_band, "jersey": draw_jersey}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for slot, fn in DRAW.items():
        for rarity, hexc in COLORS.items():
            im = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            # soft glow disc
            glow = (*hex_rgb(hexc), 55)
            d.ellipse((40, 40, 360, 360), fill=glow)
            fn(d, hex_rgb(hexc))
            # WC rainbow tip stripe
            if rarity == "WC":
                for i, c in enumerate(["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7"]):
                    d.rectangle((60 + i * 56, 320, 110 + i * 56, 345), fill=hex_rgb(c))
            path = OUT / f"{slot}.{rarity}.png"
            im.save(path, "PNG")
            print("wrote", path)


if __name__ == "__main__":
    main()
