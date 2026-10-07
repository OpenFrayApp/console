// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { commands, page, userEvent } from 'vitest/browser'
import type { User } from '@supabase/supabase-js'
import { saveSettings } from '../../src/state/settings.ts'
import { renderTutorial } from './setupHarness.tsx'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))
vi.mock('../../src/state/indexedDbRecovery.ts', async (original) => {
  const { IndexedDbRecovery } =
    await original<typeof import('../../src/state/indexedDbRecovery.ts')>()
  return {
    IndexedDbRecovery: class extends IndexedDbRecovery {
      /** Keep each browser journey's real recovery writes in its own disposable database. */
      constructor() {
        super(`tutorial-browser-${crypto.randomUUID()}`)
      }
    },
  }
})

/** Open only the visible normal add control in the current responsive shell. */
async function openAdd(name: string) {
  const direct = screen.queryByRole('button', { name })
  if (direct) await userEvent.click(direct)
  else {
    await userEvent.click(screen.getByRole('button', { name: 'Add to the encounter' }))
    await userEvent.click(screen.getByRole('menuitem', { name }))
  }
}

/** Check a real interactive target is on screen and outside the instruction dock. */
async function expectUsable(target: HTMLElement) {
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  const box = target.getBoundingClientRect()
  const exit = screen.getByRole('button', { name: 'Exit tutorial' }).getBoundingClientRect()
  expect(box.width).toBeGreaterThan(0)
  expect(box.left).toBeGreaterThanOrEqual(0)
  expect(box.right).toBeLessThanOrEqual(innerWidth)
  expect(box.bottom).toBeLessThan(exit.top)
  await expect
    .poll(() => document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
    .toBe(target)
}

const touchCommands = commands as typeof commands & {
  emulateTouch(enabled: boolean): Promise<void>
}

afterEach(async () => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  await touchCommands.emulateTouch(false)
})

it.each([
  { width: 375, height: 812 },
  { width: 1180, height: 820 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
  { width: 820, height: 1180 },
])(
  'guides visible controls and blocks pointer, keyboard and dismissal at $width × $height',
  async ({ width, height }) => {
    await page.viewport(width, height)
    if (width === 844 || width === 820) await touchCommands.emulateTouch(true)
    renderTutorial()
    await userEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
    const search = screen.getByRole('button', { name: 'Search references' })
    await userEvent.click(search, { force: true })
    expect(screen.queryByRole('combobox', { name: 'Search references' })).toBeNull()
    await openAdd('Add PC')
    const name = screen.getByRole('textbox', { name: 'PC name' })
    await expectUsable(name)
    await userEvent.type(name, 'Rowan')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    expect(screen.getByRole('textbox', { name: 'PC name' })).toBe(name)
    await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
    await expectUsable(screen.getByRole('button', { name: 'Add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText(/Quick add.*Friend/)).toBeTruthy()
    await openAdd('Quick add')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Quick add name' }), 'Robin')
    await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'friend')
    document.documentElement.classList.add('dark')
    await page.viewport(820, 1180)
    // A resize may replace a desktop draft with the swipe form. Guidance must recover through Add.
    if (!screen.queryByRole('textbox', { name: 'Quick add name' })) {
      await openAdd('Quick add')
      await userEvent.fill(screen.getByRole('textbox', { name: 'Quick add name' }), 'Robin')
      await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
      await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'friend')
    }
    await expectUsable(screen.getByRole('button', { name: 'Add' }))
    for (let index = 0; index < 12; index++) {
      await userEvent.tab()
      expect([
        screen.getByRole('textbox', { name: 'Quick add name' }),
        screen.getByRole('combobox', { name: 'Side' }),
        screen.getByRole('textbox', { name: 'AC' }),
        screen.getByRole('textbox', { name: 'Max HP' }),
        screen.getByRole('button', { name: 'Add' }),
        screen.getByRole('button', { name: 'Exit tutorial' }),
      ]).toContain(document.activeElement)
    }
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    expect(screen.getByRole('textbox', { name: 'Quick add name' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Robin' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Search references' }))
    expect(screen.getByRole('combobox', { name: 'Search references' })).toBeTruthy()
  },
)

it.each([
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
])(
  'uses the real signed-in roster creation and scrolled modal at $width × $height',
  async ({ width, height }) => {
    await page.viewport(width, height)
    await touchCommands.emulateTouch(width === 375)
    renderTutorial({ id: 'browser-setup-owner' } as User)
    await userEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
    await openAdd('Add PC')
    await userEvent.click(screen.getByRole('button', { name: 'Create a character…' }))
    const create = await screen.findByRole('button', { name: 'Create character' })
    await expectUsable(create)
    await userEvent.click(create)
    await userEvent.fill(screen.getByRole('textbox', { name: 'PC name' }), 'New adventurer')
    await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }), { force: true })
    expect(screen.getByRole('dialog', { name: 'New player character' })).toBeTruthy()
    const submit = screen.getByRole('button', { name: 'Create PC' })
    await expectUsable(submit)
    await userEvent.click(submit)
    const add = await screen.findByRole('button', { name: 'Add to encounter' })
    await expectUsable(add)
    await userEvent.click(add)
    expect(screen.getByRole('button', { name: 'Remove New adventurer' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByRole('button', { name: 'Remove New adventurer' })).toBeTruthy()
  },
)

it.each([
  { width: 375, height: 812, library: 'srd-5.2' },
  { width: 1180, height: 820, library: 'srd-5.1' },
  { width: 1440, height: 900, library: 'srd-5.2' },
])(
  'starts the real $library fight through library loading and manual initiative at $width × $height',
  async ({ width, height, library }) => {
    await page.viewport(width, height)
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await userEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
    await openAdd('Add PC')
    await userEvent.fill(screen.getByRole('textbox', { name: 'PC name' }), 'Rowan')
    await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await openAdd('Quick add')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Quick add name' }), 'Robin')
    await userEvent.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
    await userEvent.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'friend')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    for (const name of ['Mage', 'Ogre']) {
      await openAdd('Add creature')
      await userEvent.fill(screen.getByRole('searchbox', { name: 'Search creatures' }), name)
      const pick = await screen.findByRole('button', { name: new RegExp(`^${name} `) })
      await expectUsable(pick)
      await userEvent.click(pick)
    }
    await userEvent.click(screen.getByRole('button', { name: 'Begin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }), { force: true })
    expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeTruthy()
    for (const [index, name] of ['Rowan', 'Robin', 'Mage', 'Ogre'].entries()) {
      const field = screen.getByRole('textbox', { name: `Initiative for ${name}` })
      expect((field as HTMLInputElement).value).toBe('')
      await expectUsable(field)
      await userEvent.fill(field, String(20 - index))
    }
    await expectUsable(screen.getByRole('button', { name: 'Start combat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.getByText(/Your fight has started/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeTruthy()
  },
)

it('keeps Exit available when a target disappears and recovers with the newly visible swipe Add control', async () => {
  await page.viewport(1440, 900)
  renderTutorial()
  await userEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
  screen.getByRole('button', { name: 'Add PC' }).hidden = true
  expect(await screen.findByText(/The task control is not visible yet/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  await page.viewport(375, 812)
  await openAdd('Add PC')
  await expectUsable(screen.getByRole('textbox', { name: 'PC name' }))
  expect(screen.queryByText(/The task control is not visible yet/)).toBeNull()
})

it.each(
  [
    { width: 375, height: 812, padding: '16px' },
    { width: 1440, height: 900, padding: '32px' },
  ].flatMap((viewport) => [false, true].map((afterExit) => ({ ...viewport, afterExit }))),
)(
  'preserves ordinary responsive FormModal bottom padding at $width × $height afterExit=$afterExit',
  async ({ width, height, padding, afterExit }) => {
    await page.viewport(width, height)
    renderTutorial({ id: 'ordinary-modal-owner' } as User)
    if (afterExit) {
      await userEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
      await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
      await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    } else await userEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    await openAdd('Add PC')
    await userEvent.click(screen.getByRole('button', { name: 'Create a character…' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create character' }))
    const modal = screen.getByRole('dialog', { name: 'New player character' })
    expect(getComputedStyle(modal.parentElement!).paddingBottom).toBe(padding)
  },
)
