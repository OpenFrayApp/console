// The print edition's design tokens — the only file in print/ that names a length.
//
// Every value here is a measurement of the web edition in light mode, converted at
// 1rem = 9.2pt. TYPOGRAPHY.md carries the derivation and the role each token plays;
// scripts/check-print-tokens.mjs fails the build on a length used anywhere else.

// ------------------------------------------------------------------ colour ---
// These match `:root.light` in site/src/styles/global.css.
#let ink = rgb("#0f172a") // --text
#let ink-soft = rgb("#475569") // --muted
#let ink-faint = rgb("#94a3b8") // --faint
#let accent = rgb("#4f46e5") // --accent
#let rule-col = rgb("#e2e8f0") // --border

// -------------------------------------------------------------------- font ---
// Inter is the closest free match to the app's system-ui stack. Typst falls through
// the list until it finds an installed face, so the build still succeeds without it.
#let body-font = ("Inter", "Helvetica Neue", "Helvetica", "Arial", "Liberation Sans")

// -------------------------------------------------------------- type scale ---
// 1rem on the site is 9.2pt here, which on A4 in two columns gives an 87mm measure.
#let t-body = 9.2pt // 1rem — running text, stat lines, trait and action text
#let t-micro = 0.75 * t-body // section labels, table headers, eyebrows, footer
#let t-index = 0.8 * t-body // the two generated indexes, and only those
#let t-small = 0.875 * t-body // table body, the type line, GM notes
#let t-large = 1.15 * t-body // sub-heads, the cover lede
#let t-title = 1.5 * t-body // creature name, section title, wide-section title
#let t-chapter = 2 * t-body // chapter title, end-page title

// The cover is poster type and sits outside the text scale on purpose. Two sizes,
// one page.
#let d-cover = 46pt
#let d-cover-sub = 15pt

// ----------------------------------------------------------------- leading ---
// The site does not use one line height: Tailwind gives each size its own, and a stat
// block tightens against the prose around it, which is much of why it reads as a unit.
// Typst's `leading` is the gap between lines, so each is the site's value minus one.
// In `em`, so it follows the size at the point of use.
#let lead-body = 0.65em // prose, 1.65 on the site
#let lead-block = 0.5em // inside a stat block, 1.5
#let lead-small = 0.43em // tables and small text, 1.43
#let lead-title = 0.33em // titles, 1.33
#let lead-display = 0.05em // the chapter and cover titles, 1.05

// ----------------------------------------------------------------- rhythm ---
// Block `above`/`below` values, never `v()`. Typst collapses two adjacent block gaps
// to the larger of them; a `v()` adds instead, so a gap built from one is the sum of
// two decisions and correcting it moves both sides.
//
// Each step is a margin measured off the site, expressed against the body size so a
// change to the base carries the whole rhythm with it.
#let sp-0 = 0pt // suppressed: an element that sets its own distance from the last
#let sp-1 = 0.125 * t-body // a creature name to its type line
#let sp-2 = 0.375 * t-body // a heading to its body; a list item
#let sp-3 = 0.5 * t-body // a section label to its first entry
#let sp-4 = 0.625 * t-body // between trait and action entries
#let sp-5 = 0.75 * t-body // the stat block's band padding
#let sp-6 = 0.875 * t-body // under the type line; under the lore
#let sp-7 = 1 * t-body // between paragraphs
#let sp-8 = 1.9 * t-body // before a sub-head
#let sp-9 = 2.75 * t-body // before a section; between stat blocks

// -------------------------------------------------------------------- rules ---
// The site draws borders at 1, 2 and 3 device pixels; one pixel is 0.575pt here.
#let r-hair = 0.6pt // table row rules, the stat block's bands
#let r-mid = 1.15pt // under a section title, under a table header
#let r-heavy = 1.7pt // the chapter rule, the cover rule, a left bar

// ------------------------------------------------------------------ weights ---
// A bold lead-in at 9.2pt on paper is heavier than the same weight on a backlit
// screen. Inline emphasis is semibold; only titles carry full bold.
#let wt-strong = 600
#let wt-title = 700

// ------------------------------------------------------------------ tracking ---
#let tr-label = 0.1em // `tracking-widest`: uppercase labels and eyebrows
#let tr-title = -0.025em // `tracking-tight`: titles and creature names

// -------------------------------------------------------------------- insets ---
#let in-cell-x = 0.6 * t-body // table cell, horizontal
#let in-cell-y = 0.5 * t-body // table cell, vertical
#let in-bar = 1.25 * t-body // indent beside a left rule
#let in-box = 1.375 * t-body // a container's own padding

// ---------------------------------------------------------------- geometry ---
// Page setup, not rhythm: these answer "how big is the page" rather than "how far
// apart are two things".
#let page-margin = (x: 14mm, top: 14mm, bottom: 16mm)
// The cover's top inset lives in the margin: Typst discards a block's `above` spacing
// at a container edge, so the first element on a page cannot hold itself down.
#let cover-margin = (x: 20mm, top: 42mm, bottom: 24mm)
#let cover-gap = 14mm // kicker to title
#let cover-rule = 36mm // the short rule under the subtitle
