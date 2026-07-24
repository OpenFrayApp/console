// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Callouts for the hand-captured screenshots — the screens capture-docs-screenshots.mjs
// can't reach because they need a signed-in account or the browser extension. Run
// `node scripts/annotate-screenshot.mjs` after editing.
//
// `rect` and `crop` are in **image pixels**, measured off the source PNG. Everything
// else matches the options in scripts/lib/annotations.mjs: text, place (left/right/top/
// bottom), pad, weight, n + badge for numbered regions.
//
// Most of these carry no callout at all: a form whose fields are already labelled says
// more without one. Only mark what the screen itself doesn't explain.

const IN = 'docs/src/assets/screens/incoming'
const OUT = 'docs/src/assets/screens'

export const SHOTS = [
  {
    // The derived average is the whole "you mark intent, OpenFray does the sums" idea.
    in: `${IN}/custom-creature.png`,
    out: `${OUT}/custom-creature.png`,
    items: [
      {
        rect: { x: 866, y: 874, width: 150, height: 50 },
        text: 'Hit dice in, average out',
        // Above: to either side it would cover the hit-dice fields it's describing.
        place: 'top',
        gap: 12,
        pad: 6,
        weight: 2,
      },
    ],
  },
  {
    in: `${IN}/custom-spell.png`,
    out: `${OUT}/custom-spell.png`,
    items: [],
  },
  {
    in: `${IN}/campaign-form.png`,
    out: `${OUT}/campaign-form.png`,
    items: [],
  },
  {
    in: `${IN}/campaigns-tab.png`,
    out: `${OUT}/campaigns-tab.png`,
    items: [],
  },
  {
    in: `${IN}/characters-tab.png`,
    out: `${OUT}/characters-tab.png`,
    // The card runs out of content well before the bottom of the window.
    crop: { x: 0, y: 0, width: 3454, height: 1300 },
    items: [],
  },
  {
    in: `${IN}/campaign-picker.png`,
    out: `${OUT}/campaign-picker.png`,
    items: [],
  },
  {
    // Trim the window chrome down the left and the title bar above it.
    in: `${IN}/importer-popup.png`,
    out: `${OUT}/importer-popup.png`,
    crop: { x: 16, y: 16, width: 838, height: 1188 },
    items: [],
  },
  {
    in: `${IN}/import-json.png`,
    out: `${OUT}/import-json.png`,
    items: [],
  },
]
