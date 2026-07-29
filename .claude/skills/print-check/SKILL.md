---
name: print-check
description: Verify The Waking Garden's print edition still paginates correctly after a change to site/ styles, book content, stat blocks, or print.astro. Checks page count, cross-reference resolution, and the library→book word map.
---

# Check the print edition

The print edition (`site/src/pages/the-waking-garden/print.astro`) renders the whole
book through the site's own components and Paged.js lays it out on A4. It shares the
site's stylesheets, so **site CSS changes can silently reflow the book**. Read
AGENTS.md → "How the print edition is built" before changing it; this skill is the
verification loop.

## Workflow

1. Start the site dev server: `npm run dev -w site`.
2. Open `http://localhost:4321/the-waking-garden/print/` in the browser pane.
   **The page is blank for ~40–60s while Paged.js paginates** — that is normal.
   Pagination is done when `document.body.dataset.pages` is set.
3. Read the browser console. A healthy run logs exactly:
   - `Paged.js: <N> pages, <X>/<Y> refs resolved.` — X must equal Y, and N should
     match the last known page count (git log the last `Print:` commit if unsure;
     a moved page count on a pure-CSS change is a regression signal).
   - No `Print: replaced …` warning — that fires when the library→book word map's
     occurrence count drifts; if the copy edit was intentional, update
     `EXPECTED_LIBRARY_TERMS` in `print.astro` in the same change.
   - No `Print: … reference(s) found no target.` warning.
4. `document.body.dataset.pages === 'failed'` means Paged.js threw — the console
   has the error. The classic cause: a stylesheet other than `print-paged.css`
   reached Paged.js (css-tree cannot parse Tailwind v4's `@media (width >= 40rem)`
   and dies with a blank page).
5. For a visual check, screenshot the paginated result; for the real artifact,
   print to PDF from a normal browser with backgrounds on.

## Traps (each cost a debugging session)

- `break-after: avoid` is discarded by Paged.js — groups with `break-inside: avoid`
  are built in `print.astro`; don't move that into CSS.
- Pagination is non-deterministic unless it awaits `document.fonts.ready` — do not
  remove that await, and don't trust a page count measured before fonts load.
- Cross-references resolve after pagination against the rendered clones; Paged.js
  keeps source markup in a `<template>`, so every creature id exists twice — query
  inside `.pagedjs_pages` only.
- The route is local-only: `scripts/assemble-site.mjs` deletes it from `dist/` and
  the sitemap filter hides it. If it ever appears on the live site, that stripping
  broke.
