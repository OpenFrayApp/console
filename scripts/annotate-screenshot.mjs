// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Draws the handbook's red callouts onto a PNG captured by hand. Most screenshots come
// from the Python harness in scripts/screenshots/, which drives the live app — use this
// only for screens it can't reach: anything behind a sign-in, and the browser extension.
//
//   node scripts/annotate-screenshot.mjs
//
// It reads scripts/docs-screenshot-annotations.mjs, which lists each source image and
// where its callouts go. Coordinates there are in **image pixels** — measure them
// straight off the PNG. `scale` (default 2) says how many image pixels are one CSS
// pixel, so a Retina capture keeps the same stroke weights as the generated shots.
//
// These outputs do NOT regenerate when the UI changes, so recapture by hand when the
// screen they show moves on.

import { createRequire } from 'node:module'
import { readdirSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { drawAnnotations } from './lib/annotations.mjs'
import { SHOTS } from './docs-screenshot-annotations.mjs'

/** Resolve Playwright from node_modules or the npx cache, throwing if neither has it. */
function loadPlaywright() {
  const require = createRequire(import.meta.url)
  const candidates = ['playwright']
  const npx = join(homedir(), '.npm', '_npx')
  try {
    for (const dir of readdirSync(npx))
      candidates.push(join(npx, dir, 'node_modules', 'playwright'))
  } catch {
    // No npx cache — the plain specifier above may still resolve.
  }
  for (const id of candidates) {
    try {
      return require(id)
    } catch {
      continue
    }
  }
  throw new Error('Playwright not found. Run: npx --yes playwright --version')
}

/** Draw each listed shot's callouts over its PNG and write the result to its out path. */
async function main() {
  const { chromium } = loadPlaywright()
  const channel = process.env.PW_CHANNEL ?? 'chrome'
  const browser = await chromium.launch(channel ? { channel } : {})

  for (const shot of SHOTS) {
    if (!existsSync(shot.in)) {
      console.warn(`  ! missing, skipped: ${shot.in}`)
      continue
    }
    const scale = shot.scale ?? 2
    const data = readFileSync(shot.in).toString('base64')

    // Size the page to the image so one CSS pixel is `scale` image pixels; the
    // callouts then land at the same visual weight as the generated screenshots.
    const context = await browser.newContext({ deviceScaleFactor: scale })
    const page = await context.newPage()
    await page.setContent(
      `<style>html,body{margin:0;background:#020617}img{display:block}</style>` +
        `<img id="shot" src="data:image/png;base64,${data}">`,
    )
    const img = page.locator('#shot')
    const natural = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }))
    const css = { width: Math.round(natural.w / scale), height: Math.round(natural.h / scale) }
    await page.setViewportSize(css)
    await img.evaluate((el, s) => {
      el.style.width = `${s.width}px`
      el.style.height = `${s.height}px`
    }, css)

    const items = shot.items.map(({ rect, ...rest }) => ({
      ...rest,
      rect: {
        x: rect.x / scale,
        y: rect.y / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      },
    }))
    await page.evaluate(drawAnnotations, items)
    await page.waitForTimeout(120)

    const clip = shot.crop
      ? {
          x: shot.crop.x / scale,
          y: shot.crop.y / scale,
          width: shot.crop.width / scale,
          height: shot.crop.height / scale,
        }
      : undefined
    mkdirSync(dirname(shot.out), { recursive: true })
    await page.screenshot({ path: shot.out, clip })
    await context.close()
    console.log(`  ✓ ${shot.out}`)
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
