# The print edition

The PDF of a first-party library, built from the same sources as the web edition so the
two cannot drift apart.

```
site/src/content/waking-garden/*.mdx  ─┐
                                        ├─▶ generate-print.mjs ─▶ chapters/*.typ ─┐
public/compendium/…-creatures.json    ─┘                                           │
                                                                                   ▼
                                            waking-garden.typ ──▶ typst ──▶ PDF
                                            bestiary.typ (layout)
```

## Build

```sh
npm run print          # regenerate the chapters and compile the PDF
npm run print:watch    # live preview; recompiles on save
```

Typst is a single self-contained binary under Apache-2.0 — no TeX, no account,
no network:

```sh
brew install typst
```

Fonts: the template asks for **Inter** first, then falls through to Helvetica and Arial.
Inter is the closest free match to the app's `system-ui` stack, so the PDF matches the
site. Without it the build still succeeds on the fallbacks.

```sh
brew install --cask font-inter
```

## The rule that matters

**Never edit `chapters/*.typ`.** They are generated and overwritten. Edit the MDX in
`site/src/content/waking-garden/` and the change reaches both editions.

`npm run build` fails if the generated chapters are out of date, so the two can't drift
silently. That guard runs on Node alone — Typst is not needed to build the site.

## What lives where

| File                | Owns                                                                                                                | Edited by              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `chapters/*.typ`    | The prose and the creature roster                                                                                   | **Nobody** — generated |
| `waking-garden.typ` | The arrangement: which pages exist, in what order, plus the cover, contents, indexes, console spread, and licensing | Hand                   |
| `bestiary.typ`      | The layout: two columns, stat blocks, encounters, tables                                                            | Hand                   |
| `lib.typ`           | Shared imports and `show-creature`                                                                                  | Hand                   |

The split exists because the two editions share a **text** but not a **running order**.
Print has a cover, a contents page, generated indexes and an end spread that the web has
no equivalent for; the web has navigation and a landing page that print doesn't. Only
`waking-garden.typ` knows about any of that.

## Two things that are deliberately different in print

- **"book", not "library".** The MDX says library, because that's the web's word. The
  generator swaps whole words only, and asserts how many times each one occurs — if a
  copy edit changes the count, the build fails and a human looks. A substitution keyed to
  a whole sentence is what made an earlier import script unmaintainable.
- **Fineprint.** The end page carries the edition-compatibility line, the Wizards of the
  Coast disclaimer and the AGPL. The web drops all three, because its footer already
  states them on every page.

## Cross-references

A creature link in the MDX (`[Rollrind](…#c-rollrind)`) becomes a page reference —
"Rollrind (p. 7)" — resolved at compile time from a label on each stat block. The slug is
the same one the web uses for its anchors, so one source drives both. An unresolved
reference falls back to the bare name rather than failing.

## Adding another library

Copy `waking-garden.typ`, point it at a different JSON, and write its spine. You should
not need to touch `bestiary.typ`. Teach `generate-print.mjs` where the new MDX lives.

## Art

Art is optional everywhere — every creature renders correctly with none, so pieces can be
added as they arrive. A creature's `art: { src, alt, credit?, full? }` gives either a
one-column portrait (~1000px wide at 300dpi) or a full-width plate (~2150px). PNG or JPEG,
not WebP: one asset set should feed both the PDF and the web build.
