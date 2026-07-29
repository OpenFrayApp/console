// ============================================================================
// waking-garden.typ — the print edition's spine.
//
//   npm run print          # regenerate chapters and compile the PDF
//   typst watch print/waking-garden.typ   # live preview while editing
//
// This file owns the ARRANGEMENT and nothing else: which pages exist, in what
// order, and the matter print has that the web doesn't — the cover, the
// contents, the indexes, the console spread, and where licensing sits.
//
// The prose and the stat blocks are NOT here. They come from chapters/*.typ,
// generated from the web edition's MDX by scripts/generate-print.mjs. Editing a
// chapter file is pointless; it is overwritten. Edit the MDX.
// ============================================================================

#import "lib.typ": *

#show: book.with(
  title: "The Waking Garden",
  subtitle: "A bestiary of cultivated horrors, compatible with 5e and 5.5e",
)

// ----------------------------------------------------------------- cover ---
#cover(
  title: [The Waking\ Garden],
  subtitle: [A bestiary of cultivated horrors, compatible with 5e and 5.5e.],
  lede: [
    Sixty-seven creatures for a world where the things people grow have started growing
    back. Twelve species of sentient vegetable across three stages of life, the ecology
    that lives alongside them, the fey who tend them, and the thing they are all cuttings
    from.
  ],
  meta: [
    *67 creatures* · CR 0#minus;22 · 19 ready-to-run fights \
    Built for OpenFray, a free combat console for Game Masters — openfray.app
  ],
)

// ----------------------------------------------------------- front matter ---
// The web calls this "How to use this library"; print says book. No intro here: the
// cover carries the lede, and repeating it was what made this page read as a mess.
#chapter(eyebrow: "", title: "How to use this book")[]

#include "chapters/overview.typ"

#pagebreak(weak: true)

// Generated from the data at compile time, so it cannot drift from the stat blocks.
#wide[
  #wide-head("Index by challenge rating")
  #set text(size: t-index)
  #let sorted = creatures.sorted(key: c => (c.cr, c.name))
  #let half = calc.ceil(sorted.len() / 2)
  #let idx-table(rows) = data-table(
    columns: (auto, auto, 1fr, auto),
    aligns: (center, right, left, left),
    head: ("cr", "xp", "creature", "type"),
    rows: rows.map(c => (
      align(center)[#cr-str(c.cr)],
      align(right)[#str(c.xp)],
      [#c.name],
      [#title-case(c.type.split(" ").last())],
    )).flatten(),
  )
  #grid(
    columns: (1fr, 1fr), gutter: s8,
    idx-table(sorted.slice(0, half)),
    idx-table(sorted.slice(half)),
  )
]

#include "chapters/index-species.typ"

// -------------------------------------------------------------- chapters ---
#chapter(number: 1, title: "The garden")[]
#include "chapters/chapter-1.typ"

#chapter(number: 2, title: "Stage 1: The rooted")[]
#include "chapters/chapter-2.typ"

#chapter(number: 3, title: "Stage 2: The uprooted")[]
#include "chapters/chapter-3.typ"

#chapter(number: 4, title: "Stage 3: The crowned")[]
#include "chapters/chapter-4.typ"

#chapter(number: 5, title: "The rest of the garden")[]
#include "chapters/chapter-5.typ"

#chapter(number: 6, title: "The Gardener and its retinue")[]
#include "chapters/chapter-6.typ"

#chapter(number: 7, title: "The Perennial")[]
#include "chapters/chapter-7.typ"

#chapter(title: "Encounter seeds")[]
#include "chapters/appendix-a.typ"

// --------------------------------------------------------------- end page ---
// Print-only: the web says this on its landing page and in its footer.
#endpage[
  #text(size: t-table, weight: 700, fill: accent, tracking: tr-wide)[BUILT FOR OPENFRAY]
  #v(s3)
  #text(size: t-chapter, weight: 800, fill: ink)[Run this book in the console]
  #v(s5)
  #block(width: 70%)[
    #text(size: t-lead, fill: ink-soft)[
      OpenFray is a free, open-source combat console for running Dungeons and Dragons fights
      in your browser — 5.5e (2024) first, with 5e (2014) support. It keeps the initiative
      order, everyone's hit points, the conditions and effects on each creature, what a
      creature has left to spend, and the dice.
    ]
  ]
  #v(s7)
  #text(size: t-body)[openfray.app/console · openfray.app/docs · github.com/SirDarcanos/openfray]
  #v(s9)
  #line(length: 100%, stroke: r-hair + rule-col)
  #v(s5)
  #set text(size: t-table, fill: ink-soft)
  #label-head("Licensing and credits")
  #v(s3)
  *Creatures and mechanics* — the stat blocks and game mechanics, every field of a creature
  entry other than its description, are licensed CC BY 4.0. Reuse them with attribution to
  OpenFray (openfray.app), a link to the licence, and a note that changes were made. \
  *Lore, art, and prose* — © 2026 OpenFray, all rights reserved. \
  *Game rules* — conditions, spell names, and rules terminology come from the System
  Reference Document 5.2.1, used under CC BY 4.0.
  #v(s5)
  #block(inset: (left: s5), stroke: (left: r-mid + accent))[
    This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by
    Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is
    licensed under the Creative Commons Attribution 4.0 International License, available at
    https://creativecommons.org/licenses/by/4.0/legalcode.
  ]
  #v(s5)
  // Print keeps this line; the web drops it, because the site footer already carries
  // the compatibility statement, the trademark disclaimer and the AGPL on every page.
  #text(size: t-label, fill: ink-faint)[
    Compatible with Dungeons and Dragons 5e (2014) and 5.5e (2024). Not affiliated with,
    endorsed, sponsored, or specifically approved by Wizards of the Coast LLC. OpenFray is
    free and ad-free, and the console's own code is licensed AGPL-3.0.
  ]
]
