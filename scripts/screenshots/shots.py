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

import re
import shutil
import sys
from pathlib import Path

from anno import Canvas, rects
from console import (
    OUT,
    add_creature,
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
SITE_SCREENS = Path(__file__).resolve().parents[2] / "site" / "src" / "assets" / "screenshots"
# Recipes that belong to the marketing site rather than the handbook, and so install
# somewhere else. Everything not listed here is a handbook capture.
SITE_RECIPES = {"console-hero", "group-save-hero", "cast-spell-hero", "compendium-hero"}
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
        # One box over both store buttons — neither browser is the recommended one.
        link = span(page.get_by_role("link", name="Get it for Chrome").bounding_box(),
                    page.get_by_role("link", name="Get it for Firefox").bounding_box())
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


def effect_counter():
    with console() as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_text("Ogre", exact=True).first.click()
        page.wait_for_timeout(250)
        page.get_by_role("button", name="Apply effect").click()
        page.wait_for_timeout(400)
        page.get_by_label("Duration").select_option("counter")
        page.wait_for_timeout(200)
        page.get_by_label("Custom reminder").fill("Depth")
        page.get_by_role("button", name="Apply", exact=True).click()
        page.wait_for_timeout(400)
        # Raise it off zero, or the shot shows Lower and Reset greyed out.
        for _ in range(3):
            page.get_by_role("button", name="Raise Depth").click()
            page.wait_for_timeout(120)
        lst = page.get_by_text("APPLIED EFFECTS").locator("xpath=..").bounding_box()
        low = page.get_by_role("button", name="Lower Depth").bounding_box()
        clear = page.get_by_role("button", name="Clear", exact=True).bounding_box()
        buttons = {"x": low["x"], "y": low["y"],
                   "width": clear["x"] + clear["width"] - low["x"], "height": low["height"]}
        capture(page, "effect-counter", lst, {"buttons": buttons}, pad=8)
    r = rects(f"{OUT}/effect-counter.json")
    c = Canvas(f"{OUT}/effect-counter.png", grow=(0, 132, 0, 0))
    b = c.box(r["buttons"], pad=7)
    c.label((26, 64), "Raise, lower, reset or clear it", "ls")
    c.arrow((260, 84), ((b[0] + b[2]) / 2, b[1] - 12))
    return c.save(f"{OUT}/effect-counter.png")


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


# Wide enough that every top-bar button fits its label on one line. At 1440 they wrap
# to two, and the whole console reads as a squeezed tablet rather than the desktop
# layout it is designed for.
LAYOUT_W, LAYOUT_H = 1800, 1000


def layout():
    with console(width=LAYOUT_W, height=LAYOUT_H) as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_text("Ogre", exact=True).first.click()
        page.wait_for_timeout(400)
        cols = page.evaluate(
            """() => [...document.querySelector('div.grid.h-full').children].map(e => {
                const r = e.getBoundingClientRect()
                return {x: r.x, y: r.y, width: r.width, height: r.height}
            })"""
        )
        capture(page, "layout", {"x": 0, "y": 0, "width": LAYOUT_W, "height": LAYOUT_H}, {
            "logo": page.get_by_title("OpenFray home").bounding_box(),
            # The leftmost top-bar control, so disc 1 lands in the gap beside the logo
            # rather than on the rest icons that sit before Group save.
            "bar": page.get_by_role("button", name="Short rest").bounding_box(),
            "tracker": cols[0],
            "stat": cols[1],
            "controls": cols[2],
            "dice": page.get_by_role("button", name="d4", exact=True).bounding_box(),
            "legal": page.get_by_role("link", name="Privacy").bounding_box(),
        })
    # The five areas getting-started.md numbers: top bar, tracker, stat block,
    # controls + log, bottom bar. Each disc is placed from the rendered layout rather
    # than typed in, so a width change moves them instead of stranding them.
    r = rects(f"{OUT}/layout.json")
    c = Canvas(f"{OUT}/layout.png", font_size=44)
    gap = lambda a, b: ((a[0] + a[2] + b[0]) / 2, a[1] + a[3] / 2)
    c.number(gap(r["logo"], r["bar"]), 1, r=30)
    for key, n in (("tracker", 2), ("stat", 3), ("controls", 4)):
        x, y, w, h = r[key]
        c.number((x + w / 2, y + h - 70), n, r=30)
    c.number(gap(r["dice"], r["legal"]), 5, r=30)
    return c.save(f"{OUT}/layout.png")


# The marketing hero's board: a named party rather than the docs' Zara/Mira/Tav/Ren,
# because this one is read as a picture of somebody's game, not as a figure to follow.
HERO_PARTY = [
    ("Kessa Quick", 15, 26, 5),
    ("Elowen Vale", 12, 22, 3),
    ("Bram Ironfist", 18, 34, 1),
    ("Sister Mirad", 18, 27, 0),
]
# The Hell Hound is immune to Fire and the Quasit resists it, so one Fireball against
# this band shows all three outcomes at once — immune, resisted, and full.
HERO_FOES = (
    ("Ogre", 1),
    ("Mage", 1),
    ("Hell Hound", 1),
    ("Quasit", 1),
    ("Goblin Warrior", 1),
)
HERO_ROLLS = {"Kessa Quick": 25, "Elowen Vale": 23, "Bram Ironfist": 19, "Sister Mirad": 2}


def _condition(page, who, *conditions):
    """Select a combatant and apply conditions that last until removed. The chips are
    looked up inside the dialog: a condition already on a tracker row renders a badge
    with the same accessible name, and the two are otherwise ambiguous."""
    page.get_by_text(who, exact=True).first.click()
    page.wait_for_timeout(250)
    page.get_by_role("button", name="Apply effect").click()
    page.wait_for_timeout(350)
    dialog = page.get_by_role("dialog", name=f"Apply effect to {who}")
    for c in conditions:
        dialog.get_by_role("button", name=c, exact=True).click()
    dialog.get_by_role("button", name="Apply", exact=True).click()
    page.wait_for_timeout(400)


def _hero_board(page):
    """The board every site shot shares — a fight already fought in: two wounded, one
    bloodied, and the conditions that make it worth looking at. One setup, so the three
    pictures on the home page are recognisably the same encounter."""
    seed(page, HERO_PARTY, HERO_FOES)
    start(page, HERO_ROLLS)
    set_hp(page, "Elowen Vale", 12)
    set_hp(page, "Goblin Warrior", 6)
    set_hp(page, "Ogre", 49)
    _condition(page, "Goblin Warrior", "Prone")
    _condition(page, "Ogre", "Prone", "Frightened")
    page.wait_for_timeout(400)


def _full(page, name):
    """The whole console, which is the point of the site's shots."""
    capture(page, name, {"x": 0, "y": 0, "width": LAYOUT_W, "height": LAYOUT_H})
    return name  # no annotation — the site frames these, and its prose labels them


def console_hero():
    """The full console mid-fight, for the site's home page — not the handbook."""
    with console(width=LAYOUT_W, height=LAYOUT_H) as page:
        _hero_board(page)
        return _full(page, "console-hero")


def group_save_hero():
    """One Fireball rolled against six creatures whose Fire defenses all differ."""
    with console(width=LAYOUT_W, height=LAYOUT_H) as page:
        _hero_board(page)
        # Cast the spell rather than opening Group save by hand: only the cast path
        # carries the damage *type*, and without "fire" the Hell Hound's immunity and
        # the Quasit's resistance cannot be applied to what lands.
        page.get_by_role("button", name="Cast spell").click()
        page.wait_for_timeout(600)
        # Naming the caster takes the save DC from the Mage's own spellcasting rather
        # than the casterless default, so the numbers on screen are a Mage's numbers.
        page.get_by_label("Caster").select_option(label="Mage")
        page.wait_for_timeout(300)
        page.get_by_placeholder("Search spells…").fill("Fireball")
        page.wait_for_timeout(500)
        page.get_by_role("button", name=re.compile(r"^Fireball\b")).first.click()
        page.wait_for_timeout(900)
        # The target chips are named for the combatant, exactly like its tracker row —
        # so they are only unambiguous from inside the dialog.
        box = page.get_by_role("dialog").last
        # Two allies caught in the blast alongside the four foes: the whole point of
        # listing both sides is that a Fireball does not respect them. Elowen Vale is
        # left out of it — she is on 12 of 22 and a homepage does not need a dead PC.
        for who in ("Hell Hound", "Quasit", "Ogre", "Goblin Warrior",
                    "Bram Ironfist", "Kessa Quick"):
            box.get_by_role("button", name=who, exact=True).click()
            page.wait_for_timeout(90)
        page.get_by_role("button", name="Roll saves").click()
        page.wait_for_timeout(1100)
        # OpenFray never rolls a player's save, so the two of them are recorded by hand
        # — one each way, which is also what makes the list worth looking at.
        for who, verdict in (("Bram Ironfist", "Save"), ("Kessa Quick", "Save")):
            box.locator("li", has_text=who).first.get_by_role(
                "button", name=verdict, exact=True).click()
            page.wait_for_timeout(200)
        # Stop before Apply damage: the picture is the roll, with every result on screen
        # and the decision still the GM's.
        page.wait_for_timeout(400)
        return _full(page, "group-save-hero")


def _enable_libraries(page, *names):
    """Tick extra content libraries in Settings, on top of the 2024 rules that ship on.

    The checkbox is clicked rather than its label: a first-party library's name inside
    that label is a link to the book, so clicking the text navigates away.
    """
    page.get_by_role("button", name="Settings").click()
    page.wait_for_selector("text=Libraries")
    for name in names:
        page.locator("label", has_text=name).locator("input[type=checkbox]").first.check()
        page.wait_for_timeout(150)
    page.get_by_role("button", name="Done").click()
    page.wait_for_timeout(700)  # the newly-enabled libraries are fetched on demand


def compendium_hero():
    """The compendium open on a creature, for the site's libraries section.

    Shot portrait rather than at the console's usual landscape: it sits in a column
    beside three cards, and a 16:9 crop there is a third of their height with a hole
    under it. Taller means the list and the stat block both stay readable at that width.
    """
    with console(width=1280, height=1500) as page:
        _enable_libraries(page, "Tome of Beasts 3", "Brood & Bloom", "The Waking Garden")
        page.get_by_role("button", name="Show the compendium").click()
        page.wait_for_timeout(800)
        page.get_by_placeholder("Search creatures…").fill("Aboleth")
        page.wait_for_timeout(500)
        page.get_by_text("Aboleth", exact=True).first.click()
        page.wait_for_timeout(900)
        # Clear the search so the list shows its full length — the count above it is
        # part of what the section is claiming.
        page.get_by_placeholder("Search creatures…").fill("")
        page.wait_for_timeout(600)
        capture(page, "compendium-hero", {"x": 0, "y": 0, "width": 1280, "height": 1500})
        return "compendium-hero"


def cast_spell_hero():
    """The Mage's Fireball cast from its own stat block, card and uses showing."""
    with console(width=LAYOUT_W, height=LAYOUT_H) as page:
        _hero_board(page)
        page.get_by_text("Mage", exact=True).first.click()
        page.wait_for_timeout(500)
        # Clicking the spell opens its card; the Cast button inside is what spends a
        # use, so the header still reads the full 2 of its 2/Day.
        page.get_by_role("button", name=re.compile(r"^Fireball\b")).first.click()
        page.wait_for_timeout(700)
        return _full(page, "cast-spell-hero")


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


def add_buttons():
    """The three add buttons, each boxed and labeled (fight/combatants.md)."""
    with console(width=1200, height=420) as page:
        quick = page.get_by_role("button", name="Quick add").bounding_box()
        pc = page.get_by_role("button", name="Add PC", exact=True).bounding_box()
        add = page.get_by_role("button", name="Add creature", exact=True).bounding_box()
        capture(page, "add-buttons", span(quick, pc, add),
                {"quick": quick, "pc": pc, "add": add}, pad=26)
    r = rects(f"{OUT}/add-buttons.json")
    c = Canvas(f"{OUT}/add-buttons.png", grow=(240, 0, 240, 290), font_size=36)
    qb, pb, ab = c.box(r["quick"], pad=5), c.box(r["pc"], pad=5), c.box(r["add"], pad=5)
    # Staggered rows so three adjacent labels don't collide.
    c.label((qb[0] - 190, c.im.height - 160), "A throwaway combatant", "ls")
    c.arrow((qb[0] + 60, c.im.height - 190), ((qb[0] + qb[2]) / 2, qb[3] + 12))
    c.label(((pb[0] + pb[2]) / 2 - 140, c.im.height - 40), "A player character", "ls")
    c.arrow(((pb[0] + pb[2]) / 2, c.im.height - 76), ((pb[0] + pb[2]) / 2, pb[3] + 12))
    c.label((c.im.width - 30, c.im.height - 160), "One from the compendium", "rs")
    c.arrow((c.im.width - 480, c.im.height - 190), ((ab[0] + ab[2]) / 2 + 40, ab[3] + 12))
    return c.save(f"{OUT}/add-buttons.png")


def rest_buttons():
    """The short/long rest cluster above a selected character (fight/rests.md)."""
    with console() as page:
        seed(page)
        page.get_by_text("Ren", exact=True).first.click()
        page.wait_for_timeout(300)
        short = page.get_by_role("button", name=re.compile("Short rest")).bounding_box()
        long_ = page.get_by_role("button", name=re.compile("Long rest")).bounding_box()
        cluster = span(short, long_)
        clip = {"x": cluster["x"] - 26, "y": cluster["y"] - 20,
                "width": cluster["width"] + 360, "height": 330}
        capture(page, "rest-buttons", clip, {"cluster": cluster, "short": short, "long": long_})
    r = rects(f"{OUT}/rest-buttons.json")
    c = Canvas(f"{OUT}/rest-buttons.png", grow=(0, 280, 200, 0), font_size=40)
    box = c.box(r["cluster"], pad=10)
    scx = c.dx + r["short"][0] + r["short"][2] / 2
    lcx = c.dx + r["long"][0] + r["long"][2] / 2
    # Labels live in the grown strip above the bar — the panel below is all content.
    c.label((lcx + 60, 100), "Long rest", "ls")
    c.arrow((lcx + 50, 130), (lcx, box[1] - 14))
    c.label((20, 216), "Short rest", "ls")
    c.arrow((scx, 246), (scx, box[1] - 14))
    return c.save(f"{OUT}/rest-buttons.png")


def begin_shot():
    """The play button that starts the fight, over a filled board (fight/tracker.md)."""
    with console() as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_role("button", name="Stop").click()
        page.wait_for_timeout(500)
        play = page.get_by_role("button", name="Begin").bounding_box()
        mira = tracker_row(page, "Mira")
        clip = {"x": 0, "y": 0, "width": play["x"] + play["width"] + 30,
                "height": mira["y"] + mira["height"] + 16}
        capture(page, "begin", clip, {"play": play})
    r = rects(f"{OUT}/begin.json")
    c = Canvas(f"{OUT}/begin.png", font_size=44)
    b = c.box(r["play"], pad=6)
    mid = (b[1] + b[3]) / 2
    c.arrow((b[0] - 320, mid), (b[0] - 16, mid))
    c.label((b[0] - 350, mid + 16), "Begin", "rs")
    return c.save(f"{OUT}/begin.png")


def turn_controls():
    """The round bar: turn buttons and pause/stop, boxed and labeled (fight/tracker.md)."""
    with console() as page:
        seed(page)
        start(page, ROLLS)
        prev = page.get_by_role("button", name=re.compile("Previous turn")).bounding_box()
        nxt = page.get_by_role("button", name=re.compile("Next turn")).bounding_box()
        pause = page.get_by_role("button", name=re.compile("Pause")).bounding_box()
        stop = page.get_by_role("button", name=re.compile("^Stop")).bounding_box()
        round_ = page.get_by_text(re.compile("Round 1", re.I)).first.bounding_box()
        bar = span(round_, prev, nxt, pause, stop)
        clip = {"x": bar["x"] - 26, "y": bar["y"] - 14,
                "width": bar["width"] + 52, "height": bar["height"] + 90}
        capture(page, "turn-controls", clip,
                {"turns": span(prev, nxt), "ps": span(pause, stop)})
    r = rects(f"{OUT}/turn-controls.json")
    c = Canvas(f"{OUT}/turn-controls.png", grow=(0, 190, 0, 0), font_size=44)
    tb, pb = c.box(r["turns"], pad=8), c.box(r["ps"], pad=8)
    c.label((40, 70), "Move through turns", "ls")
    c.arrow((240, 92), ((tb[0] + tb[2]) / 2 - 30, tb[1] - 14))
    c.label((c.im.width - 40, 70), "Pause or end fight", "rs")
    c.arrow((c.im.width - 420, 92), ((pb[0] + pb[2]) / 2 - 20, pb[1] - 14))
    return c.save(f"{OUT}/turn-controls.png")


def drag_handle():
    """A row's six-dot drag handle, boxed with a callout (fight/tracker.md)."""
    with console() as page:
        seed(page)
        add_creature(page, "Mage")
        start(page, ROLLS)
        handle = page.locator('span[aria-label="Drag to reorder Ren"]').bounding_box()
        row = tracker_row(page, "Ren")
        clip = {"x": row["x"] - 8, "y": row["y"] - 130,
                "width": row["width"] + 16, "height": row["height"] + 260}
        capture(page, "drag-handle", clip, {"handle": handle})
    r = rects(f"{OUT}/drag-handle.json")
    c = Canvas(f"{OUT}/drag-handle.png", font_size=44)
    b = c.box(r["handle"], pad=6)
    mid = (b[1] + b[3]) / 2
    c.arrow((b[2] + 420, mid), (b[2] + 16, mid))
    c.label((b[2] + 450, mid - 12), "Drag to move", "ls")
    c.label((b[2] + 450, mid + 44), "a combatant", "ls")
    return c.save(f"{OUT}/drag-handle.png")


def _open_apply_effect(page, name):
    """Select `name` and open its Apply effect box."""
    page.get_by_text(name, exact=True).first.click()
    page.wait_for_timeout(250)
    page.get_by_role("button", name="Apply effect").click()
    page.wait_for_timeout(400)


def example_reckless():
    """The worked Reckless example: an advantage modifier, written out (fight/effects.md)."""
    with console() as page:
        seed(page)
        start(page, ROLLS)
        _open_apply_effect(page, "Ren")
        page.get_by_label("Duration").select_option(label="1 round")
        page.get_by_role("button", name="Add a bonus or penalty").click()
        page.wait_for_timeout(200)
        page.get_by_label("Modifier effect").select_option(label="Advantage")
        page.get_by_label("Applies to").select_option(label="Attack rolls")
        page.get_by_role("radio", name="Rolls made against it").check()
        page.get_by_label("Modifier label").fill("Reckless attack")
        page.wait_for_timeout(200)
        capture(page, "example-reckless", panel_of(page, "Apply effect to Ren"), pad=12)
    return "example-reckless"  # no annotation — the derived sentence is the point


def example_reminder():
    """The worked reminder example: free text, until removed (fight/effects.md)."""
    with console() as page:
        seed(page)
        start(page, ROLLS)
        _open_apply_effect(page, "Zara")
        page.get_by_label("Duration").select_option(label="Until removed")
        reminder = page.get_by_placeholder("e.g. Hex: +1d6 necrotic")
        reminder.fill("Covered in oil - Beware of fire damage")
        # Blur and rewind so the capture shows the start of the note, not its tail.
        reminder.evaluate("el => { el.blur(); el.scrollLeft = 0 }")
        page.wait_for_timeout(200)
        capture(page, "example-reminder", panel_of(page, "Apply effect to Zara"), pad=12)
    return "example-reminder"  # no annotation — a plain crop


def cast_spell():
    """A caster's Spellcasting section: uses left, click to cast (fight/spells.md)."""
    with console(width=1500, height=1120) as page:
        add_creature(page, "Archmage")
        page.get_by_text("Archmage", exact=True).first.click()
        page.wait_for_timeout(600)
        head = page.get_by_role("heading", name="Spellcasting").bounding_box()
        perday = page.get_by_text("2/DAY EACH").bounding_box()
        oneday = page.get_by_text("1/DAY EACH").bounding_box()
        spell = page.get_by_role("button", name="Mind Blank (1)").bounding_box()
        section = span(head, perday, oneday, spell)
        section["width"] = max(section["width"], 1180)
        capture(page, "cast-spell", section, {"perday": perday, "spell": spell}, pad=20)
    r = rects(f"{OUT}/cast-spell.json")
    c = Canvas(f"{OUT}/cast-spell.png", font_size=40)
    pb, sb = c.box(r["perday"], pad=8), c.box(r["spell"], pad=8)
    # The label sits beside the heading, where the panel is empty — over the At Will
    # list it would cover the very spells the reader is being shown.
    c.label((pb[0] + 300, 80), "Total usages available per day", "ls")
    c.arrow((pb[0] + 285, 105), ((pb[0] + pb[2]) / 2 + 20, pb[1] - 10))
    c.label((sb[2] + 180, sb[1] - 40), "Click to cast the spell and consume a usage", "ls")
    c.arrow((sb[2] + 160, sb[1] - 30), (sb[2] + 10, (sb[1] + sb[3]) / 2))
    return c.save(f"{OUT}/cast-spell.png")


def group_save():
    """The Group save box with its five working parts boxed (fight/saves.md)."""
    with console(width=1440, height=1000) as page:
        seed(page)
        start(page, ROLLS)
        page.get_by_role("button", name="Group save").click()
        page.wait_for_timeout(400)
        for target in ("Goblin Boss", "Goblin Minion", "Goblin Minion 2"):
            page.get_by_role("button", name=target, exact=True).click()
        page.get_by_label("Damage").fill("3d8")
        page.wait_for_timeout(200)
        targets = span(
            page.get_by_text("Allies", exact=True).bounding_box(),
            page.get_by_role("button", name="Zara", exact=True).first.bounding_box(),
            page.get_by_role("button", name="Goblin Minion 2", exact=True).first.bounding_box(),
        )
        capture(page, "group-save", panel_of(page, "Group save"), {
            "dc": page.get_by_label("Save DC").bounding_box(),
            "onsave": page.get_by_label("On save").bounding_box(),
            "damage": page.get_by_label("Damage").bounding_box(),
            "targets": targets,
            "roll": page.get_by_role("button", name="Roll saves").bounding_box(),
        }, pad=14)
    r = rects(f"{OUT}/group-save.json")
    c = Canvas(f"{OUT}/group-save.png")
    for key in ("dc", "onsave", "damage", "targets", "roll"):
        c.box(r[key], pad=6)
    return c.save(f"{OUT}/group-save.png")


def _zara_down(page):
    """Start the fight, drop Zara to 0, and record two saves and a fail."""
    seed(page)
    start(page, ROLLS)
    set_hp(page, "Zara", 0)
    page.get_by_text("Zara", exact=True).first.click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_timeout(150)
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_timeout(150)
    page.get_by_role("button", name="Fail", exact=True).click()
    page.wait_for_timeout(300)


def death_save_row():
    """A downed player's row, with the save/fail pips boxed (fight/death.md)."""
    with console() as page:
        _zara_down(page)
        row = tracker_row(page, "Zara")
        pips = span(
            page.get_by_text("Saves", exact=True).locator("xpath=..").bounding_box(),
            page.get_by_text("Fails", exact=True).locator("xpath=..").bounding_box(),
        )
        clip = {"x": row["x"] - 8, "y": row["y"] - 120,
                "width": row["width"] + 16, "height": row["height"] + 250}
        capture(page, "death-save-row", clip, {"pips": pips})
    c = Canvas(f"{OUT}/death-save-row.png")
    c.box(rects(f"{OUT}/death-save-row.json")["pips"], pad=8)
    return c.save(f"{OUT}/death-save-row.png")


def death_saves():
    """The death-save controls: record it, or roll in the app (fight/death.md)."""
    with console() as page:
        _zara_down(page)
        save = page.get_by_role("button", name="Save", exact=True).bounding_box()
        fail = page.get_by_role("button", name="Fail", exact=True).bounding_box()
        roll = page.get_by_role("button", name=re.compile("Roll death save")).bounding_box()
        # The heading reads CONTROLS on screen but the uppercasing is CSS, not DOM text.
        heading = page.get_by_text(re.compile("^Controls$", re.I)).bounding_box()
        cluster = span(save, fail, roll)
        clip = {"x": heading["x"] - 22, "y": heading["y"] - 16,
                "width": cluster["width"] + 260, "height": 540}
        capture(page, "death-saves", clip, {"cluster": cluster})
    r = rects(f"{OUT}/death-saves.json")
    c = Canvas(f"{OUT}/death-saves.png", font_size=44)
    b = c.box(r["cluster"], pad=10)
    tip = ((b[0] + b[2]) / 2 + 40, b[3] + 16)
    c.arrow((tip[0] + 260, tip[1] + 260), tip)
    c.label((tip[0] - 80, tip[1] + 340), "Record the player's roll", "ls")
    c.label((tip[0] - 80, tip[1] + 396), "or let OpenFray roll", "ls")
    return c.save(f"{OUT}/death-saves.png")


def compendium_shot():
    """The whole compendium, with the toggle that opens it boxed (library/compendium.md)."""
    with console() as page:
        page.get_by_role("button", name="Show the compendium").click()
        page.wait_for_timeout(700)
        page.get_by_placeholder("Search creatures…").fill("Ancient Black Dragon")
        page.wait_for_timeout(500)
        page.get_by_text("Ancient Black Dragon", exact=True).first.click()
        page.wait_for_timeout(900)
        page.get_by_placeholder("Search creatures…").fill("")
        page.wait_for_timeout(500)
        toggle = page.get_by_role("button", name="Show the compendium").bounding_box()
        capture(page, "compendium", {"x": 0, "y": 0, "width": 1440, "height": 900},
                {"toggle": toggle})
    r = rects(f"{OUT}/compendium.json")
    c = Canvas(f"{OUT}/compendium.png")
    b = c.box(r["toggle"], pad=6)
    c.arrow((b[0] - 330, b[3] + 130), (b[0] - 8, b[3] - 20))
    return c.save(f"{OUT}/compendium.png")


def library_badges():
    """A slice of the creature list, two rows' badges boxed (library/compendium.md)."""
    with console(width=1500, height=1120) as page:
        page.get_by_role("button", name="Show the compendium").click()
        page.wait_for_timeout(700)
        first = page.get_by_role("button", name=re.compile("^Air Elemental")).bounding_box()
        rows = [page.get_by_role("button", name=re.compile(f"^{name}")).bounding_box()
                for name in ("Allosaurus", "Ancient Black Dragon")]
        badges = [page.get_by_role("button", name=re.compile(f"^{name}"))
                  .locator("span").filter(has_text=re.compile("Core|5\\.5e")).first.bounding_box()
                  for name in ("Allosaurus", "Ancient Black Dragon")]
        edges = [page.get_by_role("button", name=re.compile(f"^{name}"))
                 .locator("span").filter(has_text="5.5e").first.bounding_box()
                 for name in ("Allosaurus", "Ancient Black Dragon")]
        mark = span(*badges, *edges)
        clip = {"x": first["x"] - 10, "y": first["y"] - 14,
                "width": first["width"] + 20, "height": 250}
        capture(page, "library-badges", clip, {"badges": mark})
    c = Canvas(f"{OUT}/library-badges.png")
    c.box(rects(f"{OUT}/library-badges.json")["badges"], pad=8)
    return c.save(f"{OUT}/library-badges.png")


RECIPES = {
    "add-buttons": add_buttons,
    "begin": begin_shot,
    "cast-spell": cast_spell,
    "compendium": compendium_shot,
    "console-hero": console_hero,
    "group-save-hero": group_save_hero,
    "cast-spell-hero": cast_spell_hero,
    "compendium-hero": compendium_hero,
    "death-save-row": death_save_row,
    "death-saves": death_saves,
    "drag-handle": drag_handle,
    "example-reckless": example_reckless,
    "example-reminder": example_reminder,
    "group-save": group_save,
    "library-badges": library_badges,
    "rest-buttons": rest_buttons,
    "turn-controls": turn_controls,
    "rule-sets": rule_sets,
    "settings-panel": settings_panel,
    "theme-toggle": theme_toggle,
    "add-pc-dropdown": add_pc_dropdown,
    "roll-initiative": roll_initiative,
    "tracker-row": tracker_row_shot,
    "apply-effect": apply_effect,
    "effect-badge": effect_badge,
    "effect-counter": effect_counter,
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
            dest = SITE_SCREENS if name in SITE_RECIPES else SCREENS
            for produced in (name, "short-rest" if name == "recap" else None):
                if produced and (Path(OUT) / f"{produced}.png").exists():
                    shutil.copy(Path(OUT) / f"{produced}.png", dest / f"{produced}.png")
                    print("  installed", dest / f"{produced}.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
