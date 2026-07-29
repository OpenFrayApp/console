// Shared setup for the print edition. Both the spine and every generated chapter
// import this, because Typst's `include` does not share the importer's scope — a
// chapter file has to bring its own `section`, `encounter` and `show-creature`.
//
// Compile from the repo root so the absolute data path resolves:
//   typst compile --root . print/waking-garden.typ
#import "bestiary.typ": *

// The same file the console fetches, so the book and the app cannot disagree.
#let creatures = json("/public/compendium/waking-garden-creatures.json")

#let by-name = {
  let d = (:)
  for c in creatures { d.insert(c.name, c) }
  d
}

// A missing name renders a red box rather than failing the build, so a typo is
// visible on the page instead of silent.
#let show-creature(name, note: none) = {
  let c = by-name.at(name, default: none)
  if c == none {
    block(fill: rgb("#fee2e2"), inset: in-box)[MISSING CREATURE: #name]
  } else {
    statblock(c)
    if note != none { gm-note(note) }
  }
}
