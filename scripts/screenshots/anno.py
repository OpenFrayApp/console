# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 OpenFray contributors
"""Handbook-style annotation: red #E5484A boxes, block arrows, outlined bold labels.

Works in base-image pixels (the capture is already 2x). `Canvas` can grow the image
to make room for labels that sit outside the screenshot.
"""

import json
import math
from PIL import Image, ImageDraw, ImageFont

RED = (229, 72, 74)
WHITE = (255, 255, 255)
BG = (2, 6, 23)
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def fit_font(text, target_w, path=BOLD):
    size = 10
    while True:
        f = ImageFont.truetype(path, size + 1)
        if f.getlength(text) > target_w:
            return ImageFont.truetype(path, size)
        size += 1


class Canvas:
    """base: the screenshot. grow: (left, top, right, bottom) extra space, in px."""

    def __init__(self, base_path, grow=(0, 0, 0, 0), bg=BG, font_size=44):
        base = Image.open(base_path).convert("RGB")
        l, t, r, b = grow
        self.dx, self.dy = l, t
        self.im = Image.new("RGB", (base.width + l + r, base.height + t + b), bg)
        self.im.paste(base, (l, t))
        self.draw = ImageDraw.Draw(self.im)
        self.font = ImageFont.truetype(BOLD, font_size)

    # -- coordinate helper: rects captured relative to the clip
    def at(self, rect, pad=0):
        x, y, w, h = rect
        return (
            self.dx + x - pad,
            self.dy + y - pad,
            self.dx + x + w + pad,
            self.dy + y + h + pad,
        )

    def box(self, rect, pad=8, radius=10, width=6):
        self.draw.rounded_rectangle(self.at(rect, pad), radius=radius, outline=RED, width=width)
        return self.at(rect, pad)

    def arrow(self, tail, tip, shaft=6, head_half=19, head_len=38):
        ax, ay = tail
        bx, by = tip
        length = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / length, (by - ay) / length
        nx, ny = -uy, ux

        def p(along, across):
            return (bx - along * ux + across * nx, by - along * uy + across * ny)

        self.draw.polygon(
            [
                p(0, 0),
                p(head_len, head_half),
                p(head_len, shaft),
                (ax + shaft * nx, ay + shaft * ny),
                (ax - shaft * nx, ay - shaft * ny),
                p(head_len, -shaft),
                p(head_len, -head_half),
            ],
            fill=RED,
        )

    def label(self, xy, text, anchor="ls", font=None):
        self.draw.text(
            xy, text, font=font or self.font, fill=RED, stroke_width=6, stroke_fill=WHITE, anchor=anchor
        )

    def number(self, xy, n, r=26):
        """A filled red disc with a white numeral, as used on layout.png."""
        x, y = xy
        self.draw.ellipse((x - r, y - r, x + r, y + r), fill=RED)
        self.draw.text((x, y + 1), str(n), font=self.font, fill=WHITE, anchor="mm")

    def save(self, path):
        self.im.save(path)
        return path


def rects(path):
    with open(path) as fh:
        return json.load(fh)
