// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Snapshots computed styles so a CSS change can be verified by measurement — every
// regression worth catching on the site has been invisible to the eye and obvious in
// the numbers (see AGENTS.md, "How the site is styled").
//
//   node scripts/measure-css.mjs snapshot <url> <out.json> [--theme light|dark]
//   node scripts/measure-css.mjs diff <before.json> <after.json>
//
// Snapshot before the change, snapshot after, diff. An empty diff means the refactor
// held; anything listed is a real computed-style change to justify or fix.
import { readFileSync, writeFileSync } from 'node:fs'
import { loadPlaywright } from './lib/playwright.mjs'

// The properties that have actually regressed here: box, type, and color. Sizes that
// follow content (width/height) are left out — they churn without meaning.
const PROPS = [
  'display',
  'position',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-decoration-line',
  'color',
  'background-color',
  'border-top-width',
  'border-bottom-width',
  'border-color',
  'border-radius',
  'gap',
  'column-count',
  'text-align',
  'opacity',
]

/** Load a page and record PROPS for every element, keyed by its tag.class ancestry path. */
async function snapshot(url, outFile, theme) {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  if (theme) {
    await page.addInitScript((t) => localStorage.setItem('openfray-theme', t), theme)
  }
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const styles = await page.evaluate((props) => {
    /** A stable, readable key: the tag.class chain from body, with sibling indexes. */
    const keyOf = (el) => {
      const parts = []
      for (let node = el; node && node !== document.body; node = node.parentElement) {
        const cls = [...node.classList].sort().join('.')
        const siblings = node.parentElement ? [...node.parentElement.children] : [node]
        const nth = siblings.indexOf(node)
        parts.unshift(`${node.tagName.toLowerCase()}${cls ? '.' + cls : ''}[${nth}]`)
      }
      return parts.join(' > ')
    }
    const out = {}
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('script, style, noscript')) continue
      const computed = getComputedStyle(el)
      const entry = {}
      for (const p of props) entry[p] = computed.getPropertyValue(p)
      out[keyOf(el)] = entry
    }
    return out
  }, PROPS)

  await browser.close()
  writeFileSync(outFile, JSON.stringify({ url, theme: theme ?? null, styles }, null, 1))
  console.log(`Measured ${Object.keys(styles).length} elements on ${url} → ${outFile}`)
}

/** Compare two snapshots and print every per-element property change. */
function diff(beforeFile, afterFile) {
  const before = JSON.parse(readFileSync(beforeFile, 'utf8')).styles
  const after = JSON.parse(readFileSync(afterFile, 'utf8')).styles
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  let changes = 0
  for (const key of keys) {
    const a = before[key]
    const b = after[key]
    if (!a || !b) {
      console.log(`${!a ? 'ADDED' : 'REMOVED'}  ${key}`)
      changes++
      continue
    }
    for (const p of PROPS) {
      if (a[p] !== b[p]) {
        console.log(`${key}\n    ${p}: ${a[p]} → ${b[p]}`)
        changes++
      }
    }
  }
  if (changes === 0) {
    console.log('No computed-style changes.')
  } else {
    console.log(`\n${changes} change(s).`)
    process.exitCode = 1
  }
}

const [mode, a, b, themeFlag, themeValue] = process.argv.slice(2)
if (mode === 'snapshot' && a && b) {
  await snapshot(a, b, themeFlag === '--theme' ? themeValue : undefined)
} else if (mode === 'diff' && a && b) {
  diff(a, b)
} else {
  console.error('Usage: measure-css.mjs snapshot <url> <out.json> [--theme light|dark]')
  console.error('       measure-css.mjs diff <before.json> <after.json>')
  process.exit(1)
}
