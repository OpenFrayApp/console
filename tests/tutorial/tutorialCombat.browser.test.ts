// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { commands, page, userEvent } from 'vitest/browser'
import { renderTutorial, startPracticeFight } from './setupHarness.tsx'
import { saveSettings } from '../../src/state/settings.ts'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))
vi.mock('../../src/state/indexedDbRecovery.ts', async (original) => {
  const { IndexedDbRecovery } =
    await original<typeof import('../../src/state/indexedDbRecovery.ts')>()
  return {
    IndexedDbRecovery: class extends IndexedDbRecovery {
      /** Isolate normal recovery writes from other browser journeys. */
      constructor() {
        super(`tutorial-combat-${crypto.randomUUID()}`)
      }
    },
  }
})
const dice = vi.hoisted(() => ({ natural: 10 }))
vi.mock('../../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, { ...ctx, rand: () => (ctx.kind === 'attack' ? dice.natural - 1 : 5) }),
  }
})

const touch = commands as typeof commands & { emulateTouch(enabled: boolean): Promise<void> }
const controls = {
  click: (element: HTMLElement) => userEvent.click(element),
  fill: (element: HTMLElement, value: string) => userEvent.fill(element, value),
  select: (element: HTMLElement, value: string) => userEvent.selectOptions(element, value),
}

/** Verify the current task can be reached above the guide by a real pointer. */
async function expectUsable(target: HTMLElement) {
  await expect
    .poll(() => {
      const box = target.getBoundingClientRect()
      const guide = screen
        .getByRole('dialog', { name: 'Tutorial introduction' })
        .getBoundingClientRect()
      return (
        box.left >= 0 &&
        box.right <= innerWidth &&
        box.top >= 0 &&
        box.bottom <= guide.top &&
        target.contains(
          document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
        )
      )
    })
    .toBe(true)
}

afterEach(async () => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  await touch.emulateTouch(false)
})

it.each([
  { width: 375, height: 812, natural: 10, dark: false, coarse: true },
  { width: 1180, height: 820, natural: 1, dark: true, coarse: true },
  { width: 1440, height: 900, natural: 20, dark: false, coarse: false },
  { width: 844, height: 390, natural: 10, dark: true, coarse: true },
  { width: 820, height: 1180, natural: 1, dark: false, coarse: true },
])(
  'resolves real combat controls and contains focus at $width × $height with natural $natural',
  async ({ width, height, natural, dark, coarse }) => {
    await page.viewport(width, height)
    await touch.emulateTouch(coarse)
    if (dark) document.documentElement.classList.add('dark')
    dice.natural = natural
    renderTutorial()
    await startPracticeFight(controls)
    const hp = screen.getByRole('button', { name: '68' })
    await expectUsable(hp)
    if (width === 844) {
      const tracker = screen.getByRole('main')
      await userEvent.wheel(tracker, { delta: { y: -500 } })
      await expect
        .poll(() => hp.getBoundingClientRect().top > tracker.getBoundingClientRect().bottom)
        .toBe(true)
      await userEvent.wheel(tracker, { delta: { y: 500 } })
      await expect
        .poll(() => hp.getBoundingClientRect().bottom <= tracker.getBoundingClientRect().bottom)
        .toBe(true)
    }
    await userEvent.click(hp)
    const field = screen.getByRole('textbox', { name: 'Hit points for Ogre' })
    await userEvent.fill(field, '-3')
    await userEvent.keyboard('{Enter}')
    const javelin = await screen.findByRole('button', { name: 'Javelin.' })
    await expectUsable(javelin)
    await userEvent.click(screen.getByRole('button', { name: 'Greatclub.' }), { force: true })
    expect(screen.queryByRole('dialog', { name: 'Ogre · Greatclub' })).toBeNull()
    await userEvent.click(javelin)
    const dialog = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }), { force: true })
    expect(dialog).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rowan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reroll' }), { force: true })
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    expect(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).toBeTruthy()
    for (let index = 0; index < 12; index++) {
      await userEvent.tab()
      expect(
        dialog.contains(document.activeElement) ||
          document.activeElement === screen.getByRole('button', { name: 'Exit tutorial' }),
      ).toBe(true)
      expect((document.activeElement as HTMLElement).closest('[inert]')).toBeNull()
    }
    const complete =
      natural === 1
        ? within(dialog).getByRole('button', { name: 'Close' })
        : screen.getByRole('button', { name: 'Apply to Rowan' })
    await expectUsable(complete)
    if (natural === 20) {
      await page.viewport(844, 390)
      await touch.emulateTouch(true)
      document.documentElement.classList.add('dark')
      for (let index = 0; index < 8 && document.activeElement !== complete; index++)
        await userEvent.tab()
      expect(document.activeElement).toBe(complete)
      await expectUsable(complete)
    }
    await userEvent.click(complete)
    expect(screen.queryByRole('dialog', { name: 'Ogre · Javelin' })).toBeNull()
    const effect = screen.getByRole('button', { name: 'Apply effect' })
    await expectUsable(effect)
    await userEvent.click(effect)
    const prone = screen.getByRole('button', { name: 'Prone' })
    await expectUsable(prone)
    await userEvent.click(screen.getByRole('button', { name: 'Poisoned' }), { force: true })
    expect(screen.getByRole('button', { name: 'Poisoned' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    if (natural === 20) {
      await page.viewport(375, 812)
      await expectUsable(prone)
    }
    await userEvent.click(prone)
    expect(screen.queryByText(/Prone applied/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }), { force: true })
    expect(screen.getByRole('dialog', { name: 'Apply effect to Ogre' })).toBeTruthy()
    const apply = screen.getByRole('button', { name: 'Apply' })
    await expectUsable(apply)
    await userEvent.click(apply)
    expect(screen.getByText(/Prone applied/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByRole('button', { name: 'Prone' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Search references' }))
    expect(screen.getByRole('combobox', { name: 'Search references' })).toBeTruthy()
  },
)

it.each(['Javelin', 'Apply effect'])(
  'continues the unopened %s task after desktop becomes swipe without test-side scrolling',
  async (task) => {
    await page.viewport(1440, 900)
    dice.natural = 10
    renderTutorial()
    await startPracticeFight(controls)
    await userEvent.click(screen.getByRole('button', { name: '68' }))
    await userEvent.fill(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), '-3')
    await userEvent.keyboard('{Enter}')
    if (task === 'Apply effect') {
      const javelin = screen.getByRole('button', { name: 'Javelin.' })
      await expectUsable(javelin)
      await userEvent.click(javelin)
      const attack = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
      await userEvent.click(within(attack).getByRole('button', { name: 'Rowan' }))
      await userEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      await userEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    }
    const target = screen.getByRole('button', { name: task === 'Javelin' ? 'Javelin.' : task })
    await expectUsable(target)
    await touch.emulateTouch(true)
    await page.viewport(375, 812)
    await expectUsable(target)
    expect(screen.queryByText(/task control is not visible/)).toBeNull()
    await userEvent.click(target)
    if (task === 'Javelin') {
      const attack = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
      await userEvent.click(within(attack).getByRole('button', { name: 'Rowan' }))
      await userEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      await userEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
      expect(screen.getByText(/Choose Apply effect for the Ogre/)).toBeTruthy()
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Prone' }))
      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
      expect(screen.getByText(/Prone applied/)).toBeTruthy()
    }
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  },
)

it.each(['Stat block', 'Controls'])(
  'retains the ordinary %s pane through desktop and swipe dimension changes',
  async (pane) => {
    await page.viewport(375, 812)
    saveSettings({ tutorialSuppression: 'dismissed' })
    renderTutorial()
    await userEvent.click(screen.getByRole('button', { name: pane }))
    const content =
      pane === 'Stat block'
        ? screen.getByText(/Click anyone in the tracker to see their stat block/)
        : screen.getByRole('heading', { name: 'Quick roll' })
    /** Observe the visible normal pane without scrolling or changing focus. */
    const expectPane = async () => {
      await expect
        .poll(() => {
          const box = content.getBoundingClientRect()
          return box.width > 0 && box.left >= 0 && box.right <= innerWidth
        })
        .toBe(true)
      expect(screen.getByRole('button', { name: pane }).getAttribute('aria-current')).toBe('page')
    }
    await expectPane()
    await page.viewport(1440, 900)
    await page.viewport(820, 1180)
    await expectPane()
    await page.viewport(375, 812)
    await expectPane()
    await page.viewport(844, 390)
    await expectPane()
  },
)
