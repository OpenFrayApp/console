# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 OpenFray contributors
"""Recipes for the handbook's screenshots. One function per image.

    python3 shots.py                 # list the recipes
    python3 shots.py rule-sets       # shoot one, into out/
    python3 shots.py --install rule-sets

Each recipe drives the console into the state its page describes, clips the region,
and draws the annotation the page's alt text promises. Check the result before
installing: the alt text and the image have to agree.
"""

import shutil
import sys
from pathlib import Path

from anno import Canvas, rects
from console import (
    OUT,
    capture,
    console,
    find_rect,
    panel_of,
    seed,
    set_hp,
    span,
    start,
    tracker_row,
)

SCREENS = Path(__file__).resolve().parents[2] / "docs" / "src" / "assets" / "screens"
ROLLS = {"Zara": 21, "Mira": 20, "Tav": 13, "Ren": 10}


def rule_sets():
    with console(width=1200, height=1200) as page:
        page.get_by_role("button", name="Settings").click()
        page.wait_for_selector("text=Libraries")
        head = page.get_by_role("heading", name="Settings").bounding_box()
        libs = page.locator("section").nth(0).bounding_box()
        box = span(head, libs)
        box["height"] = libs["y"] + libs["height"] + 14 - box["y"] + 22
        box["y"] -= 22
        box["x"] -= 22
        box["width"] += 44
        capture(page, "rule-sets", box)
    return "rule-sets"  # no annotation — a plain crop


def settings_panel():
    with console(width=1200, height=1200) as page:
        page.get_by_role("button", name="Settings").click()
        page.wait_for_selector("text=Libraries")
        head = page.get_by_role("heading", name="Settings").bounding_box()
        libs = page.locator("section").nth(0).bounding_box()
        ext = page.locator("section").nth(1).bounding_box()
        link = page.get_by_role("link", name="Get it for Chrome").bounding_box()
        capture(page, "settings-panel", span(head, libs, ext), {"libs": libs, "link": link}, pad=22)
    r = rects(f"{OUT}/settings-panel.json")
    c = Canvas(f"{OUT}/settings-panel.png", grow=(640, 0, 0, 0), font_size=40)
    lb, kb = c.box(r["libs"], pad=8), c.box(r["link"], pad=8)
    c.label((600, lb[1] + 96), "The libraries you play with", "rs")
    c.arrow((586, lb[1] + 118), (lb[0] - 16, lb[1] + 168))
    c.label((600, kb[1] - 26), "Get the importer", "rs")
    c.arrow((586, kb[1] - 6), (kb[0] - 16, (kb[1] + kb[3]) / 2))
    return c.save(f"{OUT}/settings-panel.png")


def theme_toggle():
    with console(width=1200, height=1200) as page:
        theme = page.get_by_role("button", name="Switch to light mode").bounding_box()
        sign = page.get_by_role("button", name="Sign in").bounding_box()
        capture(page, "theme-toggle", span(sign, theme), {"theme": theme}, pad=22)
    r = rects(f"{OUT}/theme-toggle.json")
    c = Canvas(f"{OUT}/theme-toggle.png", grow=(0, 130, 320, 0))
    b = c.box(r["theme"], pad=8)
    c.label((c.im.width - 26, 66), "Light or dark", "rs")
    c.arrow((c.im.width - 330, 84), ((b[0] + b[2]) / 2, b[1] - 12))
    return c.save(f"{OUT}/theme-toggle.png")


def add_pc_dropdown():
    with console(width=1200, height=1200) as page:
        btn = page.get_by_role("button", name="Add PC", exact=True)
        btn.click()
        page.wait_for_timeout(300)
        form = page.get_by_label("PC name").locator("xpath=ancestor::form[1]").bounding_box()
        capture(page, "add-pc-dropdown", span(btn.bounding_box(), form),
                {"btn": btn.bounding_box()}, pad=18)
    c = Canvas(f"{OUT}/add-pc-dropdown.png")
    c.box(rects(f"{OUT}/add-pc-dropdown.json")["btn"], pad=7)
    return c.save(f"{OUT}/add-pc-dropdown.png")


def roll_initiative():
    with console() as page:
        seed(page)
        page.get_by_role("button", name="Begin").click()
        page.wait_for_selector("text=Roll initiative")
        page.get_by_label("Initiative for Mira").fill("14")
        page.get_by_label("Initiative for Ren").fill("3")
        modal = page.locator("div[role=dialog], form").filter(has_text="Roll initiative").last
        capture(page, "roll-initiative", modal.bounding_box(),
                {"zara": page.get_by_label("Initiative for Zara").bounding_box(),
                 "surprise": page.get_by_label("Mark Goblin Minion surprised").bounding_box()}, pad=10)
    r = rects(f"{OUT}/roll-initiative.json")
    c = Canvas(f"{OUT}/roll-initiative.png", grow=(0, 150, 0, 0))
    zb, sb = c.box(r["zara"], pad=7), c.box(r["surprise"], pad=7)
    c.label((300, 66), "Type what the player rolled", "ls")
    c.arrow((430, 88), ((zb[0] + zb[2]) / 2, zb[1] - 12))
    c.label((c.im.width - 40, 66), "Mark them surprised", "rs")
    c.arrow((c.im.width - 470, 88), ((sb[0] + sb[2]) / 2, sb[1] - 12))
    return c.save(f"{OUT}/roll-initiative.png")


def tracker_row_shot():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_text("Ogre", exact=True).first.click()
        page.wait_for_timeout(300)
        row = tracker_row(page, "Zara")
        capture(page, "tracker-row", row,
                {"init": find_rect(page, row, "21"),
                 "hpac": find_rect(page, row, "33/33AC 15")}, pad=20)
    r = rects(f"{OUT}/tracker-row.json")
    c = Canvas(f"{OUT}/tracker-row.png", grow=(0, 140, 0, 0), font_size=40)
    ib, hb = c.box(r["init"], pad=8), c.box(r["hpac"], pad=8)
    c.label((30, 70), "Initiative", "ls")
    c.arrow((120, 88), ((ib[0] + ib[2]) / 2, ib[1] - 12))
    c.label((c.im.width - 26, 70), "Hit points and armor class", "rs")
    c.arrow((c.im.width - 640, 88), ((hb[0] + hb[2]) / 2, hb[1] - 12))
    return c.save(f"{OUT}/tracker-row.png")


def apply_effect():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_text("Ogre", exact=True).first.click()
        page.wait_for_timeout(250)
        page.get_by_role("button", name="Apply effect").click()
        page.wait_for_timeout(400)
        first = page.get_by_role("button", name="Prone", exact=True).bounding_box()
        last = page.get_by_role("button", name="Exhaustion", exact=True).bounding_box()
        edge = max(b["x"] + b["width"] for b in (
            page.get_by_role("button", name="Poisoned", exact=True).bounding_box(),
            page.get_by_role("button", name="Invisible", exact=True).bounding_box(), last))
        capture(page, "apply-effect", panel_of(page, "Apply effect to Ogre"), {
            "duration": page.get_by_label("Duration").bounding_box(),
            "reminder": page.get_by_placeholder("e.g. Hex: +1d6 necrotic").bounding_box(),
            "condition": {"x": first["x"], "y": first["y"], "width": edge - first["x"],
                          "height": last["y"] + last["height"] - first["y"]},
            "modifier": page.get_by_role("button", name="Add a bonus or penalty").bounding_box(),
        }, pad=14)
    # Numbered to match the 1–4 list on fight/effects.md.
    r = rects(f"{OUT}/apply-effect.json")
    c = Canvas(f"{OUT}/apply-effect.png", grow=(52, 46, 0, 0), font_size=34)
    for n, key in enumerate(["duration", "reminder", "condition", "modifier"], 1):
        b = c.box(r[key], pad=7)
        c.number((b[0] - 4, b[1] - 6), n, r=22)
    return c.save(f"{OUT}/apply-effect.png")


def _frightened_ogre(page):
    page.get_by_text("Ogre", exact=True).first.click()
    page.wait_for_timeout(250)
    page.get_by_role("button", name="Apply effect").click()
    page.wait_for_timeout(400)
    page.get_by_label("Duration").select_option("save")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Frightened", exact=True).click()
    page.get_by_role("button", name="Apply", exact=True).click()
    page.wait_for_timeout(500)


def effect_badge():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        _frightened_ogre(page)
        row = tracker_row(page, "Ogre")
        capture(page, "effect-badge", row, {"badge": find_rect(page, row, "Frightened")}, pad=18)
    c = Canvas(f"{OUT}/effect-badge.png", grow=(0, 132, 0, 0))
    b = c.box(rects(f"{OUT}/effect-badge.json")["badge"], pad=6)
    c.label((26, 64), "An effect on this creature", "ls")
    c.arrow((150, 84), (b[0] + 22, b[1] - 10))
    return c.save(f"{OUT}/effect-badge.png")


def applied_effects():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        _frightened_ogre(page)
        lst = page.get_by_text("APPLIED EFFECTS").locator("xpath=..").bounding_box()
        ctrl = page.get_by_text("CONTROLS").locator("xpath=..").bounding_box()
        box = {"x": min(lst["x"], ctrl["x"]), "y": ctrl["y"],
               "width": max(lst["width"], ctrl["width"]),
               "height": lst["y"] + lst["height"] - ctrl["y"]}
        capture(page, "applied-effects", box, {"list": lst}, pad=16)
    c = Canvas(f"{OUT}/applied-effects.png")
    c.box(rects(f"{OUT}/applied-effects.json")["list"], pad=6)
    return c.save(f"{OUT}/applied-effects.png")


def _open_attack(page):
    seed(page)
    start(page, ROLLS)
    page.get_by_text("Ogre", exact=True).first.click()
    page.wait_for_timeout(300)
    page.get_by_text("Greatclub.", exact=False).first.click()
    page.wait_for_timeout(400)
    page.get_by_role("button", name="Zara", exact=True).click()
    page.wait_for_timeout(200)


def attack_advantage():
    with console() as page:
        _open_attack(page)
        roll = page.get_by_role("button", name="Normal", exact=True).bounding_box()
        dis = page.get_by_role("button", name="Disadvantage", exact=True).bounding_box()
        capture(page, "attack-advantage", panel_of(page, "Ogre · Greatclub"),
                {"roll": span(roll, dis)}, pad=14)
    c = Canvas(f"{OUT}/attack-advantage.png", grow=(0, 0, 620, 0), font_size=40)
    b = c.box(rects(f"{OUT}/attack-advantage.json")["roll"], pad=8)
    mid = (b[1] + b[3]) / 2
    c.arrow((b[2] + 150, mid), (b[2] + 12, mid))
    c.label((b[2] + 175, mid + 15), "Set this before you roll", "ls")
    return c.save(f"{OUT}/attack-advantage.png")


def attack_resolve():
    with console() as page:
        _open_attack(page)
        page.get_by_role("button", name="Roll attack").click()
        page.wait_for_timeout(600)
        capture(page, "attack-resolve", panel_of(page, "Ogre · Greatclub"), {
            "target": page.get_by_role("button", name="Zara", exact=True).bounding_box(),
            "roll": page.get_by_role("button", name="Reroll").bounding_box(),
            "apply": page.get_by_role("button", name="Apply to Zara").bounding_box(),
        }, pad=14)
    # The chips and the damage field sit left of two of these, so those arrows come
    # in from the right — an arrow must never cover something the reader needs.
    r = rects(f"{OUT}/attack-resolve.json")
    c = Canvas(f"{OUT}/attack-resolve.png", grow=(560, 0, 560, 0), font_size=40)
    tb, rb, ab = c.box(r["target"], pad=7), c.box(r["roll"], pad=7), c.box(r["apply"], pad=7)
    for text, bx in (("Who it hits", tb), ("Take the damage off", ab)):
        mid = (bx[1] + bx[3]) / 2
        c.arrow((bx[2] + 150, mid), (bx[2] + 12, mid))
        c.label((bx[2] + 175, mid + 15), text, "ls")
    mid = (rb[1] + rb[3]) / 2
    c.arrow((rb[0] - 150, mid), (rb[0] - 12, mid))
    c.label((rb[0] - 175, mid + 15), "The roll and the result", "rs")
    return c.save(f"{OUT}/attack-resolve.png")


def dice_log():
    # A short viewport keeps the newest log entry near the dice bar, so the crop is
    # a band rather than the whole page.
    with console(width=1440, height=560) as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_label("Dice formula").fill("1d20+2")
        page.get_by_role("button", name="Roll", exact=True).click()
        page.wait_for_timeout(600)
        bar = span(page.get_by_label("Dice formula").bounding_box(),
                   page.get_by_role("button", name="d4", exact=True).bounding_box())
        entry = page.get_by_text("1d20+2").last.locator("xpath=ancestor::li[1]").bounding_box()
        capture(page, "dice-log", span(bar, entry), {"bar": bar, "entry": entry}, pad=16)
    r = rects(f"{OUT}/dice-log.json")
    c = Canvas(f"{OUT}/dice-log.png", grow=(0, 140, 0, 0), font_size=40)
    bb, eb = c.box(r["bar"], pad=8), c.box(r["entry"], pad=8)
    c.label((30, 70), "Roll anything by hand", "ls")
    c.arrow((190, 88), ((bb[0] + bb[2]) / 2, bb[1] - 12))
    c.label((c.im.width - 26, 70), "Every roll, with its dice", "rs")
    c.arrow((c.im.width - 620, 88), ((eb[0] + eb[2]) / 2, eb[1] - 12))
    return c.save(f"{OUT}/dice-log.png")


def layout():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_text("Ogre", exact=True).first.click()
        page.wait_for_timeout(400)
        capture(page, "layout", {"x": 0, "y": 0, "width": 1440, "height": 900})
    # The five areas getting-started.md numbers: top bar, tracker, stat block,
    # controls + log, bottom bar.
    c = Canvas(f"{OUT}/layout.png", font_size=44)
    for xy, n in (((700, 78), 1), ((490, 1560), 2), ((1720, 1560), 3),
                  ((2700, 1600), 4), ((2170, 1745), 5)):
        c.number(xy, n, r=30)
    return c.save(f"{OUT}/layout.png")


def game_log_modal():
    with console(width=1440, height=1000) as page:
        _open_attack(page)
        page.get_by_role("button", name="Roll attack").click()
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Apply to Zara").click()
        page.wait_for_timeout(500)
        try:
            page.get_by_role("button", name="Close").click(timeout=2000)
        except Exception:
            pass
        page.get_by_role("button", name="Next turn").click()
        page.wait_for_timeout(400)
        page.get_by_role("button", name="View all").click()
        page.wait_for_timeout(600)
        box = page.evaluate("""() => {
            const el = [...document.querySelectorAll('div')].find(e => {
                const r = e.getBoundingClientRect();
                return r.width > 400 && r.width < window.innerWidth * 0.9 && r.height > 300 &&
                       (e.textContent || '').includes('Clear log');
            });
            const r = el.getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        }""")
        capture(page, "game-log-modal", box, {
            "chips": page.get_by_role("button", name="All", exact=True).bounding_box(),
            "clear": page.get_by_role("button", name="Clear log").bounding_box(),
        }, pad=14)
    r = rects(f"{OUT}/game-log-modal.json")
    c = Canvas(f"{OUT}/game-log-modal.png", grow=(560, 0, 560, 0), font_size=40)
    cb, lb = c.box(r["chips"], pad=7), c.box(r["clear"], pad=7)
    mid = (cb[1] + cb[3]) / 2
    c.arrow((cb[0] - 150, mid), (cb[0] - 12, mid))
    c.label((cb[0] - 175, mid + 15), "Filter by kind", "rs")
    mid = (lb[1] + lb[3]) / 2
    c.arrow((lb[2] + 150, mid), (lb[2] + 12, mid))
    c.label((lb[2] + 175, mid + 15), "Empty the history", "ls")
    return c.save(f"{OUT}/game-log-modal.png")


def recap_and_short_rest():
    """Both come from the same fight: win it, read the recap, then rest."""
    with console() as page:
        _open_attack(page)
        page.get_by_role("button", name="Roll attack").click()
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Apply to Zara").click()
        page.wait_for_timeout(500)
        try:
            page.get_by_role("button", name="Close").click(timeout=2000)
        except Exception:
            pass
        set_hp(page, "Mira", 9)
        set_hp(page, "Ren", 15)
        for foe in ("Goblin Minion 2", "Goblin Minion", "Goblin Boss", "Ogre"):
            set_hp(page, foe, 0)
        page.wait_for_timeout(700)
        page.get_by_role("button", name="End combat").click()
        page.wait_for_timeout(700)
        capture(page, "recap", panel_of(page, "Combat recap"), pad=16)
        page.get_by_role("button", name="Done").click()
        page.wait_for_timeout(400)
        page.get_by_role("button", name="Short rest").click()
        page.wait_for_timeout(500)
        capture(page, "short-rest", panel_of(page, "Short rest"),
                {"field": page.locator("input").first.bounding_box()}, pad=14)
    c = Canvas(f"{OUT}/short-rest.png", grow=(0, 0, 560, 0), font_size=40)
    b = c.box(rects(f"{OUT}/short-rest.json")["field"], pad=8)
    mid = (b[1] + b[3]) / 2
    c.arrow((b[2] + 150, mid), (b[2] + 12, mid))
    c.label((b[2] + 175, mid + 15), "Type the new hit points", "ls")
    c.save(f"{OUT}/short-rest.png")
    return "recap + short-rest"


def stat_block_full():
    # 1120 is tall enough that the block's source line is on screen, and short
    # enough that mt-auto leaves no gap above it.
    with console(width=1500, height=1120) as page:
        page.get_by_role("button", name="Show the compendium").click()
        page.wait_for_timeout(700)
        page.get_by_placeholder("Search creatures…").fill("Ancient Black Dragon")
        page.wait_for_timeout(500)
        page.get_by_text("Ancient Black Dragon", exact=True).first.click()
        page.wait_for_timeout(900)
        data = page.evaluate("""() => {
            const want = ['Ancient Black Dragon', 'Legendary Actions'];
            const el = [...document.querySelectorAll('div')].filter(e => {
                const t = e.textContent || ''; return want.every(w => t.includes(w)); }).pop();
            const rect = e => { const r = e.getBoundingClientRect();
                return {x: r.x, y: r.y, width: r.width, height: r.height}; };
            const byText = s => { const n = [...el.querySelectorAll('*')].find(
                x => x.children.length === 0 && (x.textContent || '').trim().startsWith(s));
                return n ? rect(n) : null; };
            return {block: rect(el), header: byText('Ancient Black Dragon'),
                    abilities: rect(el.children[1]), defenses: rect(el.children[2]),
                    traits: byText('Traits'), spellcasting: byText('Spellcasting'),
                    actions: byText('Actions'), legendary: byText('Legendary Actions')};
        }""")
        block = data.pop("block")
        capture(page, "stat-block-full", block, {k: v for k, v in data.items() if v}, pad=16)
    r = rects(f"{OUT}/stat-block-full.json")
    c = Canvas(f"{OUT}/stat-block-full.png", grow=(96, 0, 0, 0), font_size=38)
    for n, key in enumerate(["header", "abilities", "defenses", "traits",
                             "spellcasting", "actions", "legendary"], 1):
        b = r[key]
        c.number((46, c.dy + b[1] + b[3] / 2), n, r=26)
    return c.save(f"{OUT}/stat-block-full.png")


RECIPES = {
    "rule-sets": rule_sets,
    "settings-panel": settings_panel,
    "theme-toggle": theme_toggle,
    "add-pc-dropdown": add_pc_dropdown,
    "roll-initiative": roll_initiative,
    "tracker-row": tracker_row_shot,
    "apply-effect": apply_effect,
    "effect-badge": effect_badge,
    "applied-effects": applied_effects,
    "attack-advantage": attack_advantage,
    "attack-resolve": attack_resolve,
    "dice-log": dice_log,
    "layout": layout,
    "game-log-modal": game_log_modal,
    "recap": recap_and_short_rest,
    "stat-block-full": stat_block_full,
}


def main(argv):
    install = "--install" in argv
    names = [a for a in argv if not a.startswith("--")]
    if not names:
        print("recipes:", " ".join(sorted(RECIPES)))
        return 0
    for name in names:
        if name not in RECIPES:
            print(f"unknown recipe: {name}", file=sys.stderr)
            return 1
        print(name, "->", RECIPES[name]())
        if install:
            for produced in (name, "short-rest" if name == "recap" else None):
                if produced and (Path(OUT) / f"{produced}.png").exists():
                    shutil.copy(Path(OUT) / f"{produced}.png", SCREENS / f"{produced}.png")
                    print("  installed", SCREENS / f"{produced}.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
