// The print edition's design tokens — the only file in print/ that names a length.
//
// Every size, gap, rule weight and colour comes from here, and the reasoning behind
// each one is in TYPOGRAPHY.md. scripts/check-print-tokens.mjs fails the build on a
// `pt` or `mm` literal anywhere else under print/, which is what stops the scale from
// being reopened one call site at a time.
//
// The values below are today's, consolidated: where two call sites held numbers less
// than half a point apart, they now share the nearer token. Re-deriving the scale from
// the web edition is a separate change.

// ------------------------------------------------------------------ colour ---
// These match `:root.light` in site/src/styles/global.css. TYPOGRAPHY.md carries the
// role each one plays; the mapping there is what to change, not these values.
#let ink = rgb("#0f172a") // --text
#let ink-soft = rgb("#475569") // --muted
#let ink-faint = rgb("#94a3b8") // --faint
#let accent = rgb("#4f46e5") // --accent
#let accent-deep = rgb("#4338ca") // --accent-strong
#let rule-col = rgb("#e2e8f0") // --border

// -------------------------------------------------------------------- font ---
// Inter is the closest free match to the app's system-ui stack. Typst falls through
// the list until it finds an installed face, so the build still succeeds without it.
#let body-font = ("Inter", "Helvetica Neue", "Helvetica", "Arial", "Liberation Sans")

// -------------------------------------------------------------- type scale ---
#let t-micro = 6.8pt // art credit
#let t-label = 7.4pt // small-caps labels, table headers, footer, fineprint
#let t-index = 7.6pt // the two generated indexes
#let t-table = 8.0pt // table body, eyebrows
#let t-note = 8.6pt // stat block body, GM notes, type line
#let t-body = 9.2pt // running text
#let t-lead = 10.6pt // cover and end-page lede
#let t-title = 12.6pt // creature, section and wide-section titles
#let t-sub = 15.0pt // cover subtitle
#let t-chapter = 21.0pt // chapter and end-page titles
#let t-cover = 46.0pt // cover title

#let base-size = t-body
#let stat-size = t-note
#let table-size = t-table
#let note-size = t-note

// ------------------------------------------------------------ vertical rhythm ---
// Every gap in the book is a step here. Page geometry is separate, below.
#let s1 = 0.6mm // hairline: inside a line of stats
#let s2 = 1.2mm // within a block
#let s3 = 1.8mm // between related lines
#let s4 = 2.4mm // a label and its body; around a table
#let s5 = 3.0mm // between entries
#let s7 = 4.8mm // before a subheading
#let s8 = 6.0mm // between sections; the index gutter
#let s9 = 7.2mm // before a chapter element

// -------------------------------------------------------------------- rules ---
#let r-hair = 0.5pt // table row rules, section-head and end-page rules
#let r-mid = 1.4pt // the stat-block rule, a left bar
#let r-heavy = 2.5pt // the chapter rule, the cover rule

// ------------------------------------------------------------------ tracking ---
#let tr-tight = 0.6pt // table headers, small-caps labels
#let tr-wide = 1.4pt // eyebrows, the cover kicker

// -------------------------------------------------------------------- insets ---
#let in-cell-x = 5pt // table cell, horizontal
#let in-cell-y = 3.8pt // table cell, vertical
#let in-box = 4pt // a plain boxed note

// ---------------------------------------------------------------- geometry ---
// Page setup, not rhythm: these answer "how big is the page" rather than "how far
// apart are two things", so they do not belong on the spacing scale.
#let page-margin = (x: 14mm, top: 14mm, bottom: 16mm)
#let cover-margin = (x: 20mm, y: 24mm)
#let cover-top = 18mm // above the cover kicker
#let cover-gap = 14mm // kicker to title
#let cover-rule = 36mm // the short rule under the subtitle
