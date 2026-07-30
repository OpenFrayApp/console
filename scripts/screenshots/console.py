# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 OpenFray contributors
"""Drive the console and clip regions of it at 2x, for the handbook's screenshots.

Playwright talks to the Chrome already installed on the machine (no browser download).
The dev server must be running: `npm run dev` → http://localhost:5199/console/
"""

import contextlib
import json
import os
import re
from playwright.sync_api import sync_playwright

URL = os.environ.get("OPENFRAY_URL", "http://localhost:5199/console/")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# The handbook's sample party. Sample data only — never real names (STYLE.md).
PARTY = [("Zara", 15, 33, 2), ("Mira", 13, 28, 2), ("Tav", 16, 38, 1), ("Ren", 18, 44, 0)]
FOES = (("Ogre", 1), ("Goblin Boss", 1), ("Goblin Minion", 2))


@contextlib.contextmanager
def console(width=1440, height=900):
    """A 2x dark-theme console at `width`x`height`, signed out."""
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        ctx = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=2,
            color_scheme="dark",
            reduced_motion="reduce",
        )
        page = ctx.new_page()
        page.goto(URL)
        page.wait_for_selector("text=Add creature")
        page.wait_for_timeout(800)  # the compendium fetch
        try:
            yield page
        finally:
            browser.close()


# --- filling the board --------------------------------------------------------


def add_pc(page, name, ac, hp, init=None):
    page.get_by_role("button", name="Add PC", exact=True).click()
    page.get_by_label("PC name").fill(name)
    page.get_by_label("AC", exact=True).fill(str(ac))
    page.get_by_label("Max HP").fill(str(hp))
    if init is not None:
        page.get_by_label("Initiative modifier").fill(str(init))
    page.get_by_role("button", name="Add", exact=True).click()
    page.wait_for_timeout(120)


def add_creature(page, name, n=1):
    page.get_by_role("button", name="Add creature", exact=True).click()
    page.get_by_placeholder("Search creatures…").fill(name)
    page.wait_for_timeout(320)
    for _ in range(n):
        # Anchored, or searching "Mage" would add the alphabetically-first "Archmage".
        page.get_by_role("button", name=re.compile(rf"^{re.escape(name)}\b")).first.click()
        page.wait_for_timeout(220)
    page.keyboard.press("Escape")
    page.wait_for_timeout(120)


def seed(page, party=PARTY, foes=FOES):
    for name, ac, hp, init in party:
        add_pc(page, name, ac, hp, init)
    for name, n in foes:
        add_creature(page, name, n)


def begin(page, rolls):
    """Open Roll initiative and fill in the players' rolls, without starting."""
    page.get_by_role("button", name="Begin").click()
    page.wait_for_selector("text=Roll initiative")
    for who, value in rolls.items():
        page.get_by_label(f"Initiative for {who}").fill(str(value))


def start(page, rolls):
    begin(page, rolls)
    page.get_by_role("button", name="Start combat").click()
    page.wait_for_timeout(400)


def set_hp(page, name, value):
    """Type a new hit-point total into a tracker row. 0 drops the combatant."""
    b = hp_button(page, name)
    page.mouse.click(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
    page.wait_for_timeout(200)
    page.keyboard.press("Meta+a")
    page.keyboard.type(str(value))
    page.keyboard.press("Enter")
    page.wait_for_timeout(280)


# --- finding things to point at -----------------------------------------------
#
# The console renders few stable test hooks, so these locate elements by shape and
# text rather than by selector. Rects come back in CSS pixels, viewport-relative.


def panel_of(page, heading_text):
    """The modal card owning a heading — climbs out of the full-screen overlay,
    which would otherwise clip to the whole viewport."""
    return page.evaluate(
        """(text) => {
            const h = [...document.querySelectorAll('h1,h2,h3')].find(e => e.textContent.trim() === text);
            let el = h;
            while (el && el.getBoundingClientRect().width >= window.innerWidth * 0.95) el = el.parentElement;
            while (el && el.parentElement && el.parentElement.getBoundingClientRect().width < window.innerWidth * 0.95)
                el = el.parentElement;
            const r = el.getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        }""",
        heading_text,
    )


def tracker_row(page, name):
    """The tracker row for `name` — the smallest box holding both it and an AC."""
    return page.evaluate(
        """(name) => {
            const els = [...document.querySelectorAll('li,div')].filter(e => {
                const t = e.textContent || '';
                return t.includes(name) && /AC\\s*\\d/.test(t) && e.children.length < 12;
            });
            els.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
            const r = els[0].getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        }""",
        name,
    )


def hp_button(page, name):
    return page.evaluate(
        """(name) => {
            const rows = [...document.querySelectorAll('li,div')].filter(e => {
                const t = e.textContent || '';
                return t.includes(name) && /AC\\s*\\d/.test(t) && e.children.length < 12;
            });
            rows.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
            const r = rows[0].querySelector('button:not([aria-label])').getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        }""",
        name,
    )


def find_rect(page, root_rect, text):
    """The largest element inside `root_rect` whose trimmed text equals `text`."""
    return page.evaluate(
        """([rect, text]) => {
            const inside = e => { const b = e.getBoundingClientRect();
                return b.x >= rect.x - 2 && b.y >= rect.y - 2 &&
                       b.x + b.width <= rect.x + rect.width + 2 &&
                       b.y + b.height <= rect.y + rect.height + 2; };
            const hits = [...document.querySelectorAll('*')]
                .filter(e => inside(e) && (e.textContent || '').trim() === text);
            hits.sort((a, b) => {
                const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
                return ra.width * ra.height - rb.width * rb.height;
            });
            const r = hits[hits.length - 1].getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        }""",
        [root_rect, text],
    )


def span(*boxes):
    x0 = min(b["x"] for b in boxes)
    y0 = min(b["y"] for b in boxes)
    x1 = max(b["x"] + b["width"] for b in boxes)
    y1 = max(b["y"] + b["height"] for b in boxes)
    return {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}


# --- capture ------------------------------------------------------------------


def capture(page, name, clip, marks=None, pad=0, full_page=False):
    """Write out/<name>.png plus out/<name>.json — the marks in image pixels,
    which is what anno.Canvas draws boxes and arrows from."""
    box = {
        "x": max(0, clip["x"] - pad),
        "y": max(0, clip["y"] - pad),
        "width": clip["width"] + pad * 2,
        "height": clip["height"] + pad * 2,
    }
    page.screenshot(path=f"{OUT}/{name}.png", clip=box, animations="disabled", full_page=full_page)
    rel = {
        key: [
            round((r["x"] - box["x"]) * 2),
            round((r["y"] - box["y"]) * 2),
            round(r["width"] * 2),
            round(r["height"] * 2),
        ]
        for key, r in (marks or {}).items()
    }
    with open(f"{OUT}/{name}.json", "w") as fh:
        json.dump(rel, fh, indent=1)
    return f"{OUT}/{name}.png"
