# Print typography

The formatting specification for the print edition. Every size, gap, rule and colour in
`bestiary.typ` comes from this document, and this document comes from the web edition.

Read this before changing anything visual in `print/`. The rule that makes it work:

> **A call site names a role, never a value.** No `pt` and no `mm` appears outside
> `theme.typ`.

## Why this exists

The first proof was tuned per call site: 47 distinct lengths across three files, 12 font
sizes several of which were a third of a point apart, and three negative `v()` calls put
in to cancel space something else had added. With no scale, closing one gap makes the next
one look wrong, so the tuning never converges.

The web edition doesn't have that problem, because it inherits a design system. This
document ports that system to Typst rather than inventing a second one.

## The reference is the site, not the PDF in `local/`

`local/The Waking Garden — a bestiary for OpenFray.pdf` is a browser print of
`local/typst-src/the-waking-garden.html`, a standalone predecessor of the Astro edition.
It is **not** authoritative and does not match the site.

The reference is <https://openfray.app/the-waking-garden> **in light mode**. Every number
below was measured off the running site with `getComputedStyle`, not read off that PDF.
Two of the print edition's most visible features turned out to be inventions with no
counterpart on the site, and are removed:

- **The filled accent bar behind table headers.** The site has no filled header on any
  table. A header row is plain text over an accent bottom rule.
- **Indigo creature names.** The site sets every heading — chapter title, section title,
  creature name — in `--text`. Indigo is for labels and rules.

## The conversion

The site's base is `1rem = 16px`. The print base is **9.2pt**, which on A4 in two columns
with 14mm margins gives an 87mm measure and about 55 characters to the line.

    1rem  →  9.2pt

Every value below is that multiplication, then rounded to 0.05pt. Where the site holds two
values less than half a point apart in print, they collapse to one and the note says so —
a sub-point distinction does not survive on paper, and carrying it is how the scale grew
to twelve sizes the first time.

## Colour

The tokens already match `:root.light` in `site/src/styles/global.css` exactly. What was
wrong was the role each one played, not the values.

| Token       | Hex       | Site variable |
| ----------- | --------- | ------------- |
| `ink`       | `#0f172a` | `--text`      |
| `ink-soft`  | `#475569` | `--muted`     |
| `ink-faint` | `#94a3b8` | `--faint`     |
| `accent`    | `#4f46e5` | `--accent`    |
| `rule-col`  | `#e2e8f0` | `--border`    |

`accent-tint` and `rule-strong` are deleted: both are defined today, neither is used, and
neither has a counterpart on the site.

Roles, as measured:

| Element                                      | Colour      |
| -------------------------------------------- | ----------- |
| Running prose, list items, table cells       | `ink-soft`  |
| Stat-block trait and action text             | `ink-soft`  |
| Stat-block field values (AC, HP, Speed)      | `ink-soft`  |
| A bold lead-in inside prose (`**Terrain.**`) | `ink`       |
| Every heading and creature name              | `ink`       |
| Stat-block field labels (AC, HP, Speed)      | `accent`    |
| Section labels (TRAITS, ACTIONS), eyebrows   | `accent`    |
| The type line under a creature name          | `ink-faint` |
| Running footer                               | `ink-faint` |

The current template sets body text in `ink`. That single line is most of why the proof
reads heavier than the site.

## Type scale

Six text sizes. Each is a measured site role; the collapsed pairs are noted.

| Token       | rem   | Print  | Used for                                                    |
| ----------- | ----- | ------ | ----------------------------------------------------------- |
| `t-micro`   | 0.75  | 6.9pt  | Section labels, table headers, eyebrows, footer, art credit |
| `t-small`   | 0.875 | 8.05pt | Table body, the type line, GM notes, spellcasting note      |
| `t-body`    | 1     | 9.2pt  | Running text, stat lines, trait and action text             |
| `t-large`   | 1.15  | 10.6pt | Sub-heads, the cover lede                                   |
| `t-title`   | 1.5   | 13.8pt | Creature name, section title, group title                   |
| `t-chapter` | 2     | 18.4pt | Chapter title                                               |

Collapsed: prose tables (0.92rem) join the stat tables at `t-small`; sub-heads (1.12rem)
join the lede at `t-large`; section titles (1.45rem) join creature names at `t-title`.

The cover is poster type and sits outside this scale on purpose — `d-cover` 46pt and
`d-cover-sub` 15pt, used on one page and nowhere else.

## Leading

The site does not use one line height. Tailwind gives each size its own, and the block
tightens against the prose around it — which is a large part of why a stat block reads as
a unit. Typst's `leading` is the gap between lines, so it is the site's line height minus
one.

| Context               | Site | `leading` |
| --------------------- | ---- | --------- |
| Running prose         | 1.65 | 0.65em    |
| Inside a stat block   | 1.5  | 0.5em     |
| Tables and small text | 1.43 | 0.43em    |
| Titles                | 1.33 | 0.33em    |
| Chapter title         | 1.05 | 0.05em    |

The template currently sets `leading: 0.64em` once, for everything.

## Spacing scale

In `em` of the body size, so a change to the base carries the whole rhythm with it. Every
step is a measured site margin.

| Token  | em    | Print  | Site source                         |
| ------ | ----- | ------ | ----------------------------------- |
| `sp-1` | 0.125 | 1.15pt | Creature name to its type line      |
| `sp-2` | 0.375 | 3.45pt | A heading to its body; a list item  |
| `sp-3` | 0.5   | 4.6pt  | A section label to its first entry  |
| `sp-4` | 0.625 | 5.75pt | Between trait and action entries    |
| `sp-5` | 0.75  | 6.9pt  | The stat block's band padding       |
| `sp-6` | 0.875 | 8.05pt | Under the type line; under the lore |
| `sp-7` | 1     | 9.2pt  | Between paragraphs                  |
| `sp-8` | 1.9   | 17.5pt | Before a sub-head                   |
| `sp-9` | 2.75  | 25.3pt | Before a section                    |

Insets are a separate group, because padding inside a container is not vertical rhythm:

| Token     | em      | Print     | Used for                  |
| --------- | ------- | --------- | ------------------------- |
| `in-cell` | 0.6/0.5 | 5.5/4.6pt | Table cell, x and y       |
| `in-box`  | 1.375   | 12.65pt   | A container's own padding |
| `in-bar`  | 1.25    | 11.5pt    | Indent beside a left rule |

## Rules

The site draws borders at 1, 2 and 3 device pixels. At `1rem = 16px = 9.2pt`, one pixel is
0.575pt.

| Token      | Print  | Colour     | Used for                                              |
| ---------- | ------ | ---------- | ----------------------------------------------------- |
| `r-hair`   | 0.6pt  | `rule-col` | Table row rules, the stat block's section bands       |
| `r-medium` | 1.15pt | `accent`   | Under a section title; under a table header           |
| `r-heavy`  | 1.7pt  | `accent`   | The chapter rule; a stat block's top edge; a left bar |

Five weights today (`0.4 / 0.5 / 1.4 / 2.5 / 3pt`), none of them related.

## The spacing model

This is the part that stops one fix breaking the next. Typst collapses adjacent block
spacing to `max(first.below, second.above)`; manual `v()` **adds** instead. So a gap built
from a `v()` plus a block's own spacing is the sum of two decisions, and correcting it
moves both sides.

Rules for the template:

1. **Every structural element is a `block`**, and its gaps are `above:` and `below:` from
   the spacing scale. Adjacent gaps then collapse and cannot double.
2. **Paragraph rhythm is `set par(leading:, spacing:)`**, set once per context, not per
   call site.
3. **`v()` is allowed only as `v(weak: true)`**, for optical correction. Weak spacing
   collapses against paragraph spacing and disappears at a container edge, which is the
   behaviour we want; plain `v()` is not.
4. **Negative `v()` is banned.** All three current uses cancel space added elsewhere; the
   fix is the neighbouring block's `above`, not a correction on top.
5. **`hrule()` returns a line and nothing else.** It currently bakes `v(s3)` on both
   sides, so the space around a rule cannot be set from the call site and stacks on top of
   the enclosing block's own spacing.
6. **A size, colour or gap never appears at a call site.** Call sites use roles:
   `#creature-name`, `#kicker`, `#eyebrow`, `#section-title`, `#label-head`, `#wide-head`.

## Where the tokens live

`print/theme.typ` holds all of it, and is imported by:

- `bestiary.typ` — the layout, which is the only file that composes roles into elements;
- `waking-garden.typ` — the spine, which today carries twelve literal sizes of its own;
- the markup emitted by `scripts/generate-print.mjs`, which today writes `12.5pt` and
  `7.6pt` into generated chapters as JavaScript string literals. It emits `#wide-head(…)`
  instead, and stops knowing about sizes.

That third one matters most. A size that lives in a Node script cannot be reached by a
change to the Typst scale, which is the mechanism behind "I changed one thing and
something else moved."

## The stat block

The site's structure is correct and print follows it. Two differences from the current
template are structural, not cosmetic:

- **The four top fields sit in one wrapping row**, not four stacked lines. AC, Initiative,
  HP and Speed flow with a `sp-5` gap between pairs.
- **The ability table has a Score column.** The template folds the score into the ability
  cell, so its header row reads `— mod save — mod save` with two empty cells.

Structure, top to bottom, with the band rules that separate the parts:

| Part                                      | Type                                          | Colour                               | Gap below |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------ | --------- |
| Name                                      | `t-title`, bold, tracking −0.025em            | `ink`                                | `sp-1`    |
| Type line                                 | `t-small`, italic                             | `ink-faint`                          | `sp-6`    |
| Lore                                      | `t-body`                                      | `ink-soft`                           | `sp-6`    |
| — `r-hair` band rule —                    |                                               |                                      |           |
| AC / Initiative / HP / Speed              | `t-body`; label bold                          | label `accent`, value `ink-soft`     | `sp-5`    |
| — `r-hair` band rule —                    |                                               |                                      |           |
| Ability table                             | `t-small`; header `t-micro` uppercase tracked | header `ink-faint`, cells `ink-soft` | `sp-5`    |
| — `r-hair` band rule —                    |                                               |                                      |           |
| Defences, senses, languages, CR           | `t-body`, one line each, `sp-1` apart         | as the top fields                    | `sp-5`    |
| — `r-hair` band rule, then each section — |                                               |                                      |           |
| Section label                             | `t-micro`, bold, uppercase, tracking 0.1em    | `accent`                             | `sp-3`    |
| Entry                                     | `t-body`, bold lead-in                        | lead-in `ink`, text `ink-soft`       | `sp-4`    |

No border box. The block gets a container for its own padding and background, and the band
rules do the separating — the site's own outline is a 1px border that reads as a card on
screen and as clutter on paper.

## Layout

Settled decisions that are not typography but interact with it:

- **Floats.** `chapter()`, `wide()` and `endpage()` all use
  `place(top, scope: "parent", float: true)`. Floats ride to the top of a container and
  hold their relative order, so two in a row leave the first page half empty — which is
  what page 3 does today. `place.flush()` is the mechanism for forcing pending floats
  down; the spine calls it between the two indexes.
- **`wide[]` does not escape an enclosing block.** `scope: "parent"` only reaches the page
  when the call is at top level, so a wide table nested inside `section()` silently renders
  in one column. The generator already emits wide sections at top level for this reason;
  keep it that way.
- **Column filling.** `statblock` is breakable but opens with a large unbreakable run —
  art, name, type line, lore, rule, stat header, abilities. When that run is a third of a
  column it cannot fit at the bottom of one, and the column ends early. The unbreakable
  unit shrinks to name through type line; the rest may break.
- **The Perennial** gets a page of its own, single column. Its block runs longer than a
  page in two columns, and shrinking its type to fit would put one creature off the scale.

## Guardrails

Two, in the same family as `check-spacing.mjs` and `check-css-specificity.mjs`:

- **`scripts/check-print-tokens.mjs`** — fails the build on a `pt` or `mm` literal in
  `print/` outside `theme.typ`, or on a `v()` call that is not `weak: true`. This is what
  keeps the scale from being reopened one call site at a time.
- **A page-image diff.** `typst compile --format png` every page at a fixed ppi before a
  change and after, and compare. A rhythm change shows up three pages downstream, where
  nobody is looking; the site's CSS work needed the same discipline and every regression
  worth catching there was invisible to the eye and obvious in the numbers.
