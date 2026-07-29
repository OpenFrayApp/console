---
name: measure-css
description: Verify a site/ CSS or layout change by measuring computed styles before and after, instead of eyeballing. Use whenever editing site/src/styles/*, a Tailwind class list in site/, or a site layout/component — every real regression here was invisible to the eye and obvious in the numbers.
---

# Measure a CSS change instead of eyeballing it

The rule (AGENTS.md → "How the site is styled"): before changing shared CSS or a
layout in `site/`, snapshot computed styles; after the change, diff. The regressions
this workflow exists for — preflight eating list markers, utility-order flips, a
`text-*` silently changing `line-height`, a dropped script-hook class — all render
"looking fine" and measure differently.

## Workflow

1. Start the site dev server if it isn't running: `npm run dev -w site`
   (localhost:4321).
2. Snapshot every page the change can reach, **before** touching anything:

   ```bash
   node scripts/measure-css.mjs snapshot http://localhost:4321/ /tmp/before-home.json
   node scripts/measure-css.mjs snapshot http://localhost:4321/the-waking-garden/chapter-1/ /tmp/before-ch1.json
   ```

   Pages worth including by area: `/` (home), `/compendium`, `/privacy`,
   `/the-waking-garden/` and one chapter, plus `--theme light` variants when the
   change touches theme variables (dark is the default).

3. Make the change.
4. Snapshot again to `after-*.json`, then diff each pair:

   ```bash
   node scripts/measure-css.mjs diff /tmp/before-home.json /tmp/after-home.json
   ```

5. **The diff must be empty, or every line must be an intended change.** The diff
   exits non-zero when anything moved, so it slots into a shell `&&` chain.

## What the diff can't see

- **Script-hook classes** (`.lightbox-next`, `.nav-toggle`, `.shot-thumb`): removing
  one breaks behavior while every computed style stays identical. Grep for the class
  name in `site/src` before deleting any class.
- **The print edition** shares these stylesheets. After a `waking-garden.css` or
  `global.css` change, run the print-check skill too.
- Pseudo-elements and `::backdrop` are not walked; check `.lightbox` behavior by
  hand if you touched it.

Playwright resolves from the npx cache; if the script says it's missing, seed it once
with `npx --yes playwright --version`.
