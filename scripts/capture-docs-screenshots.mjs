// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Regenerates the annotated screenshots the handbook uses (docs/src/assets/screens).
// It drives a real dev server, so start one first, then:
//
//   npm run dev
//   node scripts/capture-docs-screenshots.mjs
//
// Playwright is not a project dependency (its postinstall downloads browsers, which
// would slow every Pages build); it is resolved from an npx/global cache at run time,
// and drives the locally installed Chrome so nothing has to be downloaded.
//
//   npx --yes playwright --version   # puts a copy in the npx cache if it is missing
//
// Env: OPENFRAY_URL, OUT_DIR, PW_CHANNEL (set empty for Playwright's own Chromium),
// DEBUG=1 to print the interactive elements at each step while writing new shots.

import { createRequire } from 'node:module'
import { readdirSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.OPENFRAY_URL ?? 'http://localhost:5199/console/'
const OUT = process.env.OUT_DIR ?? 'docs/src/assets/screens'
const VIEWPORT = { width: 1440, height: 900 }
const DEBUG = !!process.env.DEBUG

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

// ---------------------------------------------------------------- annotations

// Runs in the page so callouts line up with real elements. `items` carry rects
// already measured by Playwright, plus the label to attach.
function drawAnnotations(items) {
  const RED = '#ff2f45'
  document.getElementById('of-annotations')?.remove()

  const layer = document.createElement('div')
  layer.id = 'of-annotations'
  layer.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;' +
    'font:600 15px/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;overflow:visible')
  layer.append(svg)
  document.body.append(layer)

  const PAD = 6
  const MARGIN = 10
  const vw = window.innerWidth
  const vh = window.innerHeight
  const placed = []
  const hits = (a, b) =>
    a.x < b.x + b.w + 8 && a.x + a.w + 8 > b.x && a.y < b.y + b.h + 8 && a.y + a.h + 8 > b.y

  for (const item of items) {
    const r = {
      left: item.rect.x - window.scrollX - PAD,
      top: item.rect.y - window.scrollY - PAD,
      width: item.rect.width + PAD * 2,
      height: item.rect.height + PAD * 2,
    }
    r.right = r.left + r.width
    r.bottom = r.top + r.height

    if (item.box !== false) {
      const box = document.createElement('div')
      box.dataset.ofMark = '1'
      box.style.cssText =
        `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
        `border:3px solid ${RED};border-radius:${item.radius ?? 10}px;` +
        `box-shadow:0 0 0 2px rgba(0,0,0,.35),0 0 22px rgba(255,47,69,.45)`
      layer.append(box)
      placed.push({ x: r.left, y: r.top, w: r.width, h: r.height })
    }

    if (item.n == null && !item.text) continue

    // A bare number sits on the box corner, keyed to a legend in the prose.
    if (item.place === 'corner') {
      const badge = document.createElement('div')
      badge.dataset.ofMark = '1'
      badge.textContent = String(item.n)
      badge.style.cssText =
        `position:fixed;left:${r.left - 15}px;top:${r.top - 15}px;width:30px;height:30px;` +
        `display:flex;align-items:center;justify-content:center;border-radius:999px;` +
        `background:${RED};color:#fff;font-size:16px;font-weight:800;` +
        `box-shadow:0 2px 10px rgba(0,0,0,.5)`
      layer.append(badge)
      continue
    }

    const pill = document.createElement('div')
    pill.dataset.ofMark = '1'
    pill.style.cssText =
      'position:fixed;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;' +
      `background:${RED};color:#fff;padding:7px 13px;border-radius:999px;` +
      'box-shadow:0 2px 10px rgba(0,0,0,.45);letter-spacing:.01em'
    if (item.n != null) {
      const badge = document.createElement('span')
      badge.textContent = String(item.n)
      badge.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;' +
        `border-radius:999px;background:#fff;color:${RED};font-size:13px;font-weight:800`
      pill.append(badge)
    }
    if (item.text) pill.append(document.createTextNode(item.text))
    layer.append(pill)

    const pw = pill.offsetWidth
    const ph = pill.offsetHeight

    // Place outside the box, flipping to the opposite side when it would fall
    // off-screen, then step further out until it stops colliding with earlier marks.
    let place = item.place ?? 'right'
    const room = {
      right: vw - r.right,
      left: r.left,
      top: r.top,
      bottom: vh - r.bottom,
    }
    const need = place === 'left' || place === 'right' ? pw + MARGIN : ph + MARGIN
    if (room[place] < need + 24) {
      const flip = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' }[place]
      if (room[flip] >= need + 24) place = flip
    }

    const step = place === 'left' || place === 'right' ? pw + 16 : ph + 14
    let gap = item.gap ?? 40
    let x
    let y
    for (let i = 0; i < 8; i++) {
      if (place === 'right' || place === 'left') {
        x = place === 'right' ? r.right + gap : r.left - gap - pw
        y = r.top + r.height / 2 - ph / 2
      } else {
        x = r.left + r.width / 2 - pw / 2
        y = place === 'top' ? r.top - gap - ph : r.bottom + gap
      }
      x = Math.min(Math.max(x, MARGIN), vw - pw - MARGIN)
      y = Math.min(Math.max(y, MARGIN), vh - ph - MARGIN)
      if (!placed.some((p) => hits({ x, y, w: pw, h: ph }, p))) break
      gap += step
    }
    pill.style.left = `${x}px`
    pill.style.top = `${y}px`
    placed.push({ x, y, w: pw, h: ph })

    // Arrow from the pill's near edge to the nearest point on the box.
    const from = {
      right: { x, y: y + ph / 2 },
      left: { x: x + pw, y: y + ph / 2 },
      top: { x: x + pw / 2, y: y + ph },
      bottom: { x: x + pw / 2, y },
    }[place]
    const to = {
      right: { x: r.right, y: Math.min(Math.max(from.y, r.top + 8), r.bottom - 8) },
      left: { x: r.left, y: Math.min(Math.max(from.y, r.top + 8), r.bottom - 8) },
      top: { x: Math.min(Math.max(from.x, r.left + 8), r.right - 8), y: r.top },
      bottom: { x: Math.min(Math.max(from.x, r.left + 8), r.right - 8), y: r.bottom },
    }[place]

    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const tip = { x: to.x - ux * 3, y: to.y - uy * 3 }
    const base = { x: tip.x - ux * 13, y: tip.y - uy * 13 }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', from.x)
    line.setAttribute('y1', from.y)
    line.setAttribute('x2', base.x)
    line.setAttribute('y2', base.y)
    line.setAttribute('stroke', RED)
    line.setAttribute('stroke-width', '3.5')
    line.setAttribute('stroke-linecap', 'round')
    svg.append(line)

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    head.setAttribute(
      'points',
      [
        `${tip.x},${tip.y}`,
        `${base.x - uy * 6},${base.y + ux * 6}`,
        `${base.x + uy * 6},${base.y - ux * 6}`,
      ].join(' '),
    )
    head.setAttribute('fill', RED)
    svg.append(head)
  }
}

/** Union of everything drawn, so a close-up can crop to just the marked area. */
function measureAnnotations(pad) {
  const marks = [...document.querySelectorAll('#of-annotations [data-of-mark]')]
  if (!marks.length) return null
  const rects = marks.map((m) => m.getBoundingClientRect())
  const x = Math.max(0, Math.min(...rects.map((r) => r.left)) - pad)
  const y = Math.max(0, Math.min(...rects.map((r) => r.top)) - pad)
  const right = Math.min(window.innerWidth, Math.max(...rects.map((r) => r.right)) + pad)
  const bottom = Math.min(window.innerHeight, Math.max(...rects.map((r) => r.bottom)) + pad)
  return { x, y, width: right - x, height: bottom - y }
}

// ---------------------------------------------------------------- helpers

async function annotate(page, items) {
  const measured = []
  for (const item of items) {
    // `locators` boxes several elements at once (a row of tabs, say).
    const targets = item.locators ?? [item.locator]
    const boxes = []
    for (const target of targets) {
      try {
        const b = await target.first().boundingBox({ timeout: 3000 })
        if (b) boxes.push(b)
      } catch {
        continue
      }
    }
    if (!boxes.length) {
      console.warn(`    ! skipped callout: ${item.text ?? item.n ?? '(unnamed)'}`)
      continue
    }
    const x = Math.min(...boxes.map((b) => b.x))
    const y = Math.min(...boxes.map((b) => b.y))
    const rect = {
      x,
      y,
      width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
      height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
    }
    const { locator, locators, ...rest } = item
    void locator
    void locators
    measured.push({ ...rest, rect })
  }
  await page.evaluate(drawAnnotations, measured)
}

async function shot(page, name, { clip, clipTo, pad = 26, items = [] } = {}) {
  if (items.length) await annotate(page, items)
  await page.waitForTimeout(150)
  let region = clip === 'auto' ? await page.evaluate(measureAnnotations, pad) : clip

  // Always keep the named element whole — a modal shouldn't lose its title or
  // its buttons just because the callouts sit in the middle of it.
  if (clipTo) {
    const b = await clipTo.first().boundingBox()
    if (b) {
      const a = region ?? b
      const x = Math.max(0, Math.min(a.x, b.x - pad))
      const y = Math.max(0, Math.min(a.y, b.y - pad))
      const right = Math.min(VIEWPORT.width, Math.max(a.x + a.width, b.x + b.width + pad))
      const bottom = Math.min(VIEWPORT.height, Math.max(a.y + a.height, b.y + b.height + pad))
      region = { x, y, width: right - x, height: bottom - y }
    }
  }

  await page.screenshot({ path: join(OUT, `${name}.png`), clip: region ?? undefined })
  await page.evaluate(() => document.getElementById('of-annotations')?.remove())
  console.log(`  ✓ ${name}.png`)
}

async function dump(page, label) {
  if (!DEBUG) return
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }
    return [...document.querySelectorAll('button,input,select,textarea,h1,h2,h3')]
      .filter(vis)
      .map(
        (el) =>
          `${el.tagName} "${(el.getAttribute('aria-label') || el.placeholder || el.innerText || '').slice(0, 45).replace(/\n/g, ' ')}"`,
      )
  })
  console.log(`  — ${label}: ${info.join(' | ')}`)
}

// ---------------------------------------------------------------- the board

const PARTY = [
  { name: 'Bram Ironfist', ac: 18, hp: 34, init: 1, pp: 12 },
  { name: 'Kessa Quick', ac: 15, hp: 26, init: 5, pp: 15 },
  { name: 'Elowen Vale', ac: 12, hp: 22, init: 3, pp: 13 },
  { name: 'Sister Mirad', ac: 18, hp: 27, init: 0, pp: 14 },
]

const FOES = ['Ogre', 'Goblin Boss', 'Goblin Warrior', 'Mage']

async function addParty(page) {
  for (const pc of PARTY) {
    await page.getByRole('button', { name: 'Add PC' }).click()
    await page.getByLabel('PC name').fill(pc.name)
    await page.getByLabel('AC', { exact: true }).fill(String(pc.ac))
    await page.getByLabel('Max HP').fill(String(pc.hp))
    await page.getByLabel('Initiative modifier').fill(String(pc.init))
    await page.getByLabel('Passive Perception').fill(String(pc.pp))
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.keyboard.press('Escape')
  }
}

async function addFoes(page) {
  for (const name of FOES) {
    await page.getByRole('button', { name: 'Add creature' }).click()
    await page.getByPlaceholder('Search creatures…').fill(name)
    await page
      .getByRole('button', { name: new RegExp(`^${name}\\b`) })
      .first()
      .click()
    await page.keyboard.press('Escape')
  }
}

// ---------------------------------------------------------------- run

async function main() {
  const { chromium } = loadPlaywright()
  mkdirSync(OUT, { recursive: true })

  // Drives the locally installed Chrome so no browser download is needed. Set
  // PW_CHANNEL='' to use Playwright's own bundled build instead.
  const channel = process.env.PW_CHANNEL ?? 'chrome'
  const browser = await chromium.launch(channel ? { channel } : {})
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })

  console.log('Building the demo board…')
  await addParty(page)
  await addFoes(page)

  const tracker = page.locator('main section').first()
  const statBlock = page.locator('main section').nth(1)
  const tools = page.locator('main aside')
  const diceBar = page.locator('footer form')
  const addCreature = page.getByRole('button', { name: 'Add creature' })
  const row = (name) => tracker.locator('[role=button]').filter({ hasText: name }).first()
  const modal = () => page.locator('div.fixed.inset-0').last().locator('> div, > form').first()

  console.log('Capturing…')

  // --- before combat -------------------------------------------------------

  await shot(page, 'add-buttons', {
    clip: 'auto',
    items: [
      {
        locator: page.getByRole('button', { name: 'Quick add' }),
        text: 'Invented on the spot',
        place: 'bottom',
      },
      { locator: page.getByRole('button', { name: 'Add PC' }), text: 'A player', place: 'bottom' },
      { locator: addCreature, text: 'From the compendium', place: 'bottom' },
    ],
  })

  const mage = row('Mage')
  await shot(page, 'tracker-row', {
    clip: 'auto',
    items: [
      { locator: mage.locator('div.w-7'), text: 'Initiative', place: 'bottom' },
      { locator: mage.locator('span.truncate').first(), text: 'Who it is', place: 'bottom' },
      {
        locator: mage.locator('div.text-right span.tabular-nums').first(),
        text: 'Hit points — click to change them',
        place: 'bottom',
      },
      { locator: mage.locator('div.text-right div.text-xs'), text: 'Armor class', place: 'bottom' },
    ],
  })

  // --- start the fight -----------------------------------------------------

  await page.getByRole('button', { name: 'Begin' }).click()
  await page.waitForTimeout(250)
  await shot(page, 'roll-initiative', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      {
        locator: page.getByLabel('Initiative for Bram Ironfist'),
        text: 'Type a player’s roll, or leave it blank to roll',
        place: 'left',
      },
      {
        locator: page.getByLabel('Mark Bram Ironfist surprised'),
        text: 'Mark anyone surprised',
        place: 'right',
      },
    ],
  })
  await page.getByRole('button', { name: 'Start combat' }).click()
  await page.waitForTimeout(300)

  // --- in combat -----------------------------------------------------------

  const ogre = row('Ogre')
  await ogre.click()
  await page.waitForTimeout(200)

  await shot(page, 'layout', {
    items: [
      { locator: tracker, n: 1, place: 'corner' },
      { locator: statBlock, n: 2, place: 'corner' },
      { locator: tools, n: 3, place: 'corner' },
      { locator: diceBar, n: 4, place: 'corner' },
      { locator: addCreature, n: 5, place: 'corner' },
    ],
  })

  await shot(page, 'turn-controls', {
    clip: 'auto',
    items: [
      {
        locator: page.getByRole('heading', { name: /Round/i }),
        text: 'The round you are on',
        place: 'bottom',
      },
      {
        locator: page.getByRole('button', { name: 'Previous turn' }),
        text: 'Back a turn',
        place: 'bottom',
      },
      {
        locator: page.getByRole('button', { name: 'Next turn' }),
        text: 'On to the next turn',
        place: 'bottom',
      },
      {
        locator: page.getByRole('button', { name: 'Stop' }),
        text: 'Pause, or end the fight',
        place: 'bottom',
      },
    ],
  })

  // --- effects -------------------------------------------------------------

  await page.getByRole('button', { name: 'Apply effect' }).click()
  await page.waitForTimeout(200)
  await shot(page, 'apply-effect', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      { locator: page.getByText('DURATION'), n: 1, text: 'How long it lasts', place: 'left' },
      { locator: page.getByText('CONDITION'), n: 2, text: 'Tap a condition', place: 'left' },
      { locator: page.getByText('MODIFIER'), n: 3, text: 'Or build a bonus', place: 'left' },
      { locator: page.getByText('REMINDER'), n: 4, text: 'Or just leave a note', place: 'left' },
    ],
  })

  await page.getByLabel('Duration').selectOption({ label: 'Save ends' })
  await dump(page, 'save ends')
  await page.getByRole('button', { name: 'Frightened', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(250)

  await shot(page, 'effect-badge', {
    clip: 'auto',
    pad: 40,
    items: [
      {
        locator: ogre.locator('div.mt-1').getByText('Frightened'),
        text: 'The effect shows on the row',
        place: 'right',
      },
    ],
  })

  const effectsPanel = page.getByText('APPLIED EFFECTS').locator('..')
  await shot(page, 'applied-effects', {
    clip: 'auto',
    clipTo: effectsPanel,
    items: [
      {
        locator: effectsPanel,
        text: 'How each effect ends, and how to end it',
        place: 'left',
      },
    ],
  })

  // --- spells --------------------------------------------------------------

  await mage.click()
  await page.waitForTimeout(250)
  await shot(page, 'cast-spell', {
    clip: 'auto',
    clipTo: page.getByRole('heading', { name: 'Spellcasting' }).locator('..'),
    items: [
      {
        locator: page.getByRole('button', { name: 'Fireball (2)' }),
        text: 'Click a spell to cast it',
        place: 'bottom',
      },
      { locator: page.getByText('2/DAY EACH'), text: 'What it has left today', place: 'left' },
    ],
  })

  await page.getByRole('button', { name: 'Group save' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'group-save', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      { locator: page.getByLabel('Save DC'), text: 'The number to beat', place: 'top' },
      { locator: page.getByLabel('On save'), text: 'What a save earns', place: 'top' },
      { locator: page.getByLabel('Damage'), text: 'A formula, or a number', place: 'top' },
      { locator: page.getByText('TARGETS'), text: 'Who is rolling', place: 'left' },
      { locator: page.getByRole('button', { name: 'Roll saves' }), text: '', place: 'right' },
    ],
  })
  await page.getByRole('button', { name: 'Close' }).click()
  await page.waitForTimeout(200)

  // --- dice and the log ----------------------------------------------------

  await shot(page, 'dice-log', {
    clip: 'auto',
    items: [
      { locator: diceBar, text: 'Roll anything by hand', place: 'top' },
      {
        locator: tools
          .locator('li, div')
          .filter({ hasText: /1d20 \[/ })
          .last(),
        text: 'Every roll, with its dice and bonuses',
        place: 'left',
      },
    ],
  })

  // --- the compendium ------------------------------------------------------

  await page.getByRole('button', { name: 'Compendium' }).click()
  await page.waitForTimeout(400)
  const aboleth = page.getByRole('button', { name: /^Aboleth/ }).first()
  await aboleth.click()
  await page.waitForTimeout(400)
  await shot(page, 'compendium', {
    items: [
      {
        locators: ['Creatures', 'Spells', 'Characters', 'Campaigns'].map((t) =>
          page.getByRole('button', { name: t, exact: true }),
        ),
        text: 'Four tabs',
        place: 'right',
        gap: 90,
      },
    ],
  })

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.waitForTimeout(400)
  const libraries = page.getByText('Content libraries').locator('..')
  await shot(page, 'rule-sets', {
    clip: 'auto',
    clipTo: libraries,
    items: [
      {
        locator: page.getByRole('checkbox').first().locator('..'),
        text: 'Tick the ones your table plays',
        place: 'right',
      },
    ],
  })

  await browser.close()
  console.log(`\nDone → ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
