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
import { drawAnnotations, measureAnnotations } from './lib/annotations.mjs'

const BASE = process.env.OPENFRAY_URL ?? 'http://localhost:5199/console/'
const OUT = process.env.OUT_DIR ?? 'docs/src/assets/screens'
const VIEWPORT = { width: 1440, height: 900 }
const DEBUG = !!process.env.DEBUG

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

/** Measure each item's locator(s) on the live page, then draw the callouts over them. */
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

/** Draw the callouts, save OUT/<name>.png ('auto' clips to the marks), then remove them. */
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

/** Print the visible controls and headings under a label; a no-op unless DEBUG=1. */
async function dump(page, label) {
  if (!DEBUG) return
  const info = await page.evaluate(() => {
    /** Whether an element is actually rendered: its bounding box has any size. */
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

/** Add every PARTY member through the console's Add PC form. */
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

/** Add every FOES creature by compendium search, taking the first match. */
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

/** Drive the console through every requested recipe and write the annotated shots. */
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
  /** The tracker row for a combatant, found by the name in its text. */
  const row = (name) => tracker.locator('[role=button]').filter({ hasText: name }).first()
  /** The panel inside the topmost open modal (the last full-screen fixed overlay). */
  const modal = () => page.locator('div.fixed.inset-0').last().locator('> div, > form').first()

  console.log('Capturing…')

  // --- before combat -------------------------------------------------------

  // The three buttons sit shoulder to shoulder, so the boxes are tight and thin.
  const addButton = { pad: 2, weight: 2, place: 'bottom' }
  await shot(page, 'add-buttons', {
    clip: 'auto',
    items: [
      {
        ...addButton,
        locator: page.getByRole('button', { name: 'Quick add' }),
        text: 'A throwaway combatant',
      },
      {
        ...addButton,
        locator: page.getByRole('button', { name: 'Add PC' }),
        text: 'A player character',
      },
      { ...addButton, locator: addCreature, text: 'One from the compendium' },
    ],
  })

  await shot(page, 'rest-buttons', {
    clip: 'auto',
    pad: 50,
    items: [
      {
        locator: page.getByRole('button', { name: 'Short rest' }),
        text: 'Short rest',
        place: 'bottom',
        pad: 2,
        weight: 2,
      },
      {
        locator: page.getByRole('button', { name: 'Long rest' }),
        text: 'Long rest',
        place: 'bottom',
        pad: 2,
        weight: 2,
      },
    ],
  })

  await page.getByRole('button', { name: 'Short rest' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'short-rest', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      {
        locator: page.getByLabel(/^New HP for/).first(),
        text: 'A number sets it; +7 heals',
        place: 'left',
        pad: 2,
        weight: 2,
      },
    ],
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // The last row, so the labels drop into the empty tracker below it instead of
  // covering other rows. HP and AC share one box — separately they sit millimetres
  // apart and the two boxes swallow each other.
  const lastRow = tracker.locator('[role=button]').last()
  const lastRowBox = await lastRow.boundingBox()
  const trkBox = await tracker.boundingBox()
  await shot(page, 'tracker-row', {
    // Wide enough for the right-hand label to fit, tall enough for a row of context
    // above and the labels below — no further.
    clip: {
      x: Math.max(0, trkBox.x - 8),
      y: Math.max(0, lastRowBox.y - 105),
      width: trkBox.width + 130,
      height: 250,
    },
    items: [
      {
        locator: lastRow.locator('div.w-7'),
        text: 'Initiative',
        place: 'bottom',
        pad: 2,
        weight: 2,
      },
      {
        locators: [
          lastRow.locator('div.text-right span.tabular-nums').first(),
          lastRow.locator('div.text-right div.text-xs'),
        ],
        text: 'Hit points and armor class',
        place: 'bottom',
        pad: 3,
        weight: 2,
      },
    ],
  })

  // --- start the fight -----------------------------------------------------

  await shot(page, 'begin', {
    clip: 'auto',
    pad: 60,
    items: [
      {
        locator: page.getByRole('button', { name: 'Begin' }),
        text: 'Begin — starts the fight',
        place: 'left',
      },
    ],
  })

  await page.getByRole('button', { name: 'Begin' }).click()
  await page.waitForTimeout(250)
  await shot(page, 'roll-initiative', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      {
        locator: page.getByLabel('Initiative for Bram Ironfist'),
        text: 'Players: type what they rolled',
        place: 'left',
      },
      {
        locator: page.getByLabel('Mark Bram Ironfist surprised'),
        text: 'Mark them surprised',
        place: 'bottom',
      },
      {
        locator: page.getByLabel('Initiative for Ogre'),
        text: 'Creatures are rolled for you',
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

  // The five regions of the console. The three columns are flush against each other,
  // so their boxes are inset (negative pad) and thin — otherwise the borders collide.
  // Numbers only — no box. Any border drawn at a column's edge lands on the content
  // that runs to that edge (the log's totals, the Stop button, the CONTROLS heading),
  // and the three columns are already visually distinct without one.
  const region = { place: 'corner', box: false }
  await shot(page, 'layout', {
    items: [
      // Numbers go bottom-left, where each column runs out of content. The header
      // and footer are one row tall, so theirs are nudged into the gap between
      // their left-hand content and the controls in the middle.
      { ...region, locator: tracker, n: 1, badge: 'bl' },
      { ...region, locator: statBlock, n: 2, badge: 'bl' },
      { ...region, locator: tools, n: 3, badge: 'bl' },
      { ...region, locator: page.locator('header').first(), n: 4, badgeDx: 225 },
      { ...region, locator: page.locator('footer').first(), n: 5, badgeDx: 390 },
    ],
  })

  await shot(page, 'turn-controls', {
    clip: 'auto',
    items: [
      // Placed right so the labels sit in the gaps rather than over the rows. The
      // round number needs no label, and each pair of buttons reads as one control.
      {
        locators: [
          page.getByRole('button', { name: 'Previous turn' }),
          page.getByRole('button', { name: 'Next turn' }),
        ],
        text: 'Move through the turns',
        place: 'top',
        weight: 2,
      },
      {
        locators: [
          page.getByRole('button', { name: 'Pause' }),
          page.getByRole('button', { name: 'Stop' }),
        ],
        text: 'Pause or end the fight',
        place: 'top',
        weight: 2,
      },
    ],
  })

  // The drag handle is easy to miss, so it gets its own close-up.
  await shot(page, 'drag-handle', {
    clip: 'auto',
    pad: 34,
    items: [
      {
        locator: ogre.locator('span[aria-label^="Drag to reorder"]'),
        text: 'Drag this to move a creature',
        place: 'right',
        pad: 3,
        weight: 2,
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

  // Worked examples. Both are deliberately NOT spells: a spell would be cast from the
  // Cast spell flow, which applies its effect itself. This box is for the things
  // nothing in the app knows about.
  //
  // 1 — Reckless Attack: the barbarian announces it, so attacks against him have
  // advantage until his next turn. Captured configured but not yet applied.
  await page.getByLabel('Duration').selectOption({ label: '1 round' })
  await page.getByLabel('Modifier effect').selectOption({ label: 'Advantage' })
  await page.getByLabel('Applies to').selectOption({ label: 'Attack rolls' })
  await page.getByRole('radio', { name: 'Rolls made against it' }).check()
  await page.getByLabel('Modifier label').fill('Reckless')
  await page.waitForTimeout(150)
  await shot(page, 'example-reckless', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      {
        locator: page.getByRole('button', { name: 'Apply modifier' }),
        text: 'OpenFray writes it out — then apply',
        place: 'right',
        pad: 2,
        weight: 2,
      },
    ],
  })

  // 2 — A reminder, the escape hatch for anything the boxes above can't express.
  // Reopened from scratch so example 1's half-filled modifier isn't still on screen.
  await page.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Apply effect' }).click()
  await page.waitForTimeout(200)
  await page.getByLabel('Duration').selectOption({ label: 'Until removed' })
  await page
    .getByPlaceholder('e.g. Hex: +1d6 necrotic')
    .fill('Standing in the oil — first fire damage ignites it')
  await page.waitForTimeout(150)
  await shot(page, 'example-reminder', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      {
        locators: [
          page.getByPlaceholder('e.g. Hex: +1d6 necrotic'),
          page.getByRole('button', { name: 'Add', exact: true }),
        ],
        text: 'Anything the boxes above can’t say',
        place: 'top',
        pad: 3,
        weight: 2,
      },
    ],
  })

  await dump(page, 'save ends')
  await page.getByRole('button', { name: 'Frightened', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(250)

  // A few rows around the badge: enough to place it in the tracker, not the whole
  // column.
  const trackerBox = await tracker.boundingBox()
  const ogreBox = await ogre.boundingBox()
  await shot(page, 'effect-badge', {
    clip: {
      x: Math.max(0, trackerBox.x - 8),
      y: Math.max(0, ogreBox.y - 110),
      width: trackerBox.width + 16,
      height: 300,
    },
    items: [
      {
        locator: ogre.locator('div.mt-1').getByText('Frightened'),
        text: 'The effect shows on the row',
        place: 'bottom',
        pad: 3,
        weight: 2,
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

  await row('Mage').click()
  await page.waitForTimeout(250)
  await shot(page, 'cast-spell', {
    clip: 'auto',
    // The whole stat block, so it's obvious this list lives on the creature.
    clipTo: statBlock,
    items: [
      {
        locator: page.getByRole('button', { name: 'Fireball (2)' }),
        text: 'Click a spell to cast it',
        place: 'bottom',
        pad: 2,
        weight: 2,
      },
      {
        locator: page.getByText('2/DAY EACH'),
        text: 'What it has left today',
        place: 'left',
        pad: 2,
        weight: 2,
      },
    ],
  })

  await page.getByRole('button', { name: 'Group save' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'group-save', {
    clip: 'auto',
    clipTo: modal(),
    items: [
      // Only the two fields whose behaviour isn't obvious from the form itself —
      // the DC is labelled "DC" and the target list has its own headings.
      {
        locator: page.getByLabel('On save'),
        text: 'What a successful save earns',
        place: 'top',
        pad: 2,
        weight: 2,
      },
      {
        locator: page.getByLabel('Damage'),
        text: 'A formula, or a number you were told',
        place: 'top',
        pad: 2,
        weight: 2,
      },
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

  // --- death saves ---------------------------------------------------------

  // Drop a player to 0 through the tracker's own HP editor, so the row and the
  // controls show what a GM actually sees when someone goes down.
  const bram = row('Bram Ironfist')
  await bram.click()
  await bram.getByRole('button', { name: /^\d+$/ }).first().click()
  await page.locator('input:focus').fill('0')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)

  const bramBox = await bram.boundingBox()
  const trBox = await tracker.boundingBox()
  await shot(page, 'death-save-row', {
    clip: {
      x: Math.max(0, trBox.x - 8),
      y: Math.max(0, bramBox.y - 80),
      width: trBox.width + 130,
      height: 240,
    },
    items: [
      {
        locator: bram.locator('div.mt-1').first(),
        text: 'Successes and failures so far',
        place: 'bottom',
        pad: 3,
        weight: 2,
      },
    ],
  })

  await shot(page, 'death-saves', {
    clip: 'auto',
    pad: 34,
    items: [
      {
        locators: [
          page.getByRole('button', { name: 'Save', exact: true }),
          page.getByRole('button', { name: 'Fail', exact: true }),
        ],
        text: 'Record what the player rolled',
        place: 'bottom',
        pad: 3,
        weight: 2,
      },
      {
        locator: page.getByRole('button', { name: /Roll death save/ }),
        text: 'Or let OpenFray roll it',
        place: 'bottom',
        pad: 3,
        weight: 2,
      },
    ],
  })

  // --- the compendium ------------------------------------------------------

  await page.getByRole('button', { name: 'Compendium' }).click()
  await page.waitForTimeout(400)
  const aboleth = page.getByRole('button', { name: /^Aboleth/ }).first()
  await aboleth.click()
  await page.waitForTimeout(400)
  // Numbered regions, like the console layout — the whole window is unreadable at
  // docs width, so detail lives in the cropped shot below instead.
  const compGrid = page.locator('main div.grid').first()
  await shot(page, 'compendium', {
    items: [
      {
        ...region,
        locators: ['Creatures', 'Spells', 'Characters', 'Campaigns'].map((t) =>
          page.getByRole('button', { name: t, exact: true }),
        ),
        n: 1,
      },
      // The search and the results, not the whole left column — that would swallow
      // the tabs and nest one region inside another.
      {
        ...region,
        locators: [
          page.getByPlaceholder('Search creatures…'),
          page.getByRole('button', { name: /^Ancient Gold Dragon/ }),
        ],
        n: 2,
        badge: 'bl',
      },
      { ...region, locator: compGrid.locator('> div').nth(1), n: 3, badge: 'bl' },
    ],
  })

  // The badges are the one thing on that screen you can't guess, so they get a
  // close-up where the text is actually legible.
  const abolethBox = await aboleth.boundingBox()
  await shot(page, 'library-badges', {
    clip: {
      x: Math.max(0, abolethBox.x - 10),
      y: Math.max(0, abolethBox.y - 16),
      width: 980,
      height: 210,
    },
    items: [
      {
        locator: aboleth.locator('span').filter({ hasText: 'Core' }).first(),
        text: 'Which book, and which rules',
        place: 'right',
        pad: 3,
        weight: 2,
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
