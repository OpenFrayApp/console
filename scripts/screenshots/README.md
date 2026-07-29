# Handbook screenshots

Re-shoots the handbook's captures from the running console, at 2× (Retina), with the
red annotation [`STYLE.md`](../../STYLE.md) asks for. A screenshot is a bug when the UI
moves on, and re-taking one by hand is slow enough that it doesn't get done — this
makes it a one-liner.

## Running it

Needs Python 3 and the Chrome already installed on the machine (no browser download).

```bash
python3 -m venv .venv && .venv/bin/pip install playwright pillow
```

Start the console first — the recipes drive the real app:

```bash
npm run dev
```

Then, from this directory:

```bash
.venv/bin/python shots.py                        # list the recipes
.venv/bin/python shots.py tracker-row            # shoot into out/
.venv/bin/python shots.py --install tracker-row  # …and copy into docs/src/assets/screens/
```

**Look at the result before installing.** The image and the page's alt text have to
agree; several captures were committed in the past describing red highlighting that was
never drawn.

## How it fits together

| File         | What it does                                                       |
| ------------ | ------------------------------------------------------------------ |
| `console.py` | Opens the console, fills the board, finds elements, clips regions. |
| `anno.py`    | Draws the boxes, arrows, labels and numbered discs.                |
| `shots.py`   | One function per screenshot; the recipe list at the bottom.        |

`capture()` writes `out/<name>.png` plus `out/<name>.json`, the latter holding the marked
elements' rects in image pixels. `anno.Canvas` reads that JSON, so annotation positions
follow the app rather than being typed in by hand — change a label in the console and the
box still lands on it.

The house style, measured off the existing captures rather than guessed:

- **Red `#E5484A`** (the color `STYLE.md` specifies), 6px stroke, ~12px corner radius.
- **Arrows** are plain block arrows: even shaft, one triangular head, straight back.
- **Labels** are Arial Bold, red fill, ~6px white outline.
- **Numbered discs** when the page's prose is a numbered list — and the numbers must
  match that list.

Arrows approach through empty space. An arrow that crosses a chip or a field hides
something the reader needs; if the space left of a target is occupied, come in from the
right instead.

## Not covered yet

- **Signed-in captures.** `characters-tab`, `campaigns-tab`, `campaign-form`,
  `campaign-picker`, `custom-creature`, `custom-spell`, `import-json`,
  `add-pc-dropdown-signedin` all need an account, so no recipe exists. They'd need a
  seeded test user and a way to sign in headlessly.
- **`spent-recharge-ability.png`** still shows the old _Core Rules 2024_ source line. It
  needs a recharge ability in its spent, greyed state, which means resolving the breath
  weapon through the save box.
- **The GIFs** (`reorder-combatants`, `set-concentration`, `use-reaction`) are recorded by
  hand.
- **`importer-*.png`** show Chrome and the extension, not the console.
