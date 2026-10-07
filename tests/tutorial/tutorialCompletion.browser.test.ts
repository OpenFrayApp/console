// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { commands, page, userEvent } from 'vitest/browser'
import type { User } from '@supabase/supabase-js'
import type { RosterPc } from '../../src/schema/roster.ts'
import { loadSettings, saveSettings } from '../../src/state/settings.ts'
import { decodeSession } from '../../src/codecs/session.ts'
import { renderTutorial, startPracticeFight, resolvePracticeFight } from './setupHarness.tsx'
import { enableNativeConfirmation } from './browserHarness.ts'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))
vi.mock('../../src/state/indexedDbRecovery.ts', async (original) => {
  const { IndexedDbRecovery } =
    await original<typeof import('../../src/state/indexedDbRecovery.ts')>()
  return {
    IndexedDbRecovery: class extends IndexedDbRecovery {
      /** Isolate normal recovery writes for this full-flow browser journey. */
      constructor() {
        super(`tutorial-completion-${crypto.randomUUID()}`)
      }
    },
  }
})
const fixture = vi.hoisted(() => ({ attack: 9, save: 0, saved: [] as RosterPc[] }))
vi.mock('../../src/state/cloudPlayers.ts', () => ({
  loadRosterPcs: async () => fixture.saved,
  saveRosterPc: async (pc: RosterPc) => {
    fixture.saved = [...fixture.saved, pc]
  },
  updateRosterPc: vi.fn(),
  deleteRosterPc: vi.fn(),
}))
vi.mock('../../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, {
        ...ctx,
        rand: () =>
          ctx.kind === 'attack' ? fixture.attack : ctx.kind === 'save' ? fixture.save : 5,
      }),
  }
})
const browser = commands as typeof commands & {
  emulateTouch(enabled: boolean): Promise<void>
  confirmBoardClear(accept: boolean): Promise<{ type: string; message: string }>
}
const controls = {
  click: (element: HTMLElement) => userEvent.click(element),
  fill: (element: HTMLElement, value: string) => userEvent.fill(element, value),
  select: (element: HTMLElement, value: string) => userEvent.selectOptions(element, value),
  enter: () => userEvent.keyboard('{Enter}'),
}

/** Assert hit testing and visibility without scrolling, focusing, or moving the target. */
async function expectReachable(target: HTMLElement, guided = true) {
  await expect
    .poll(() => {
      const box = target.getBoundingClientRect()
      const dock = guided
        ? screen.getByRole('dialog', { name: 'Tutorial introduction' }).getBoundingClientRect().top
        : innerHeight
      return (
        box.width > 0 &&
        box.height > 0 &&
        box.left >= 0 &&
        box.right <= innerWidth &&
        box.top >= 0 &&
        box.bottom <= dock &&
        target.contains(
          document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
        )
      )
    })
    .toBe(true)
}

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  fixture.saved = []
  await browser.emulateTouch(false)
})

it.each([
  {
    width: 375,
    height: 812,
    library: 'srd-5.2',
    dark: false,
    signedIn: false,
    miss: false,
    allySave: true,
  },
  {
    width: 1180,
    height: 820,
    library: 'srd-5.1',
    dark: true,
    signedIn: true,
    miss: true,
    allySave: false,
  },
  {
    width: 1440,
    height: 900,
    library: 'srd-5.2',
    dark: false,
    signedIn: true,
    miss: false,
    allySave: true,
  },
  {
    width: 844,
    height: 390,
    library: 'srd-5.1',
    dark: true,
    signedIn: false,
    miss: true,
    allySave: false,
  },
  {
    width: 820,
    height: 1180,
    library: 'srd-5.2',
    dark: true,
    signedIn: false,
    miss: false,
    allySave: true,
  },
])(
  'finishes the entire real-control journey at $width × $height (signed in=$signedIn, $library) with native cancellation/retry',
  async ({ width, height, library, dark, signedIn, miss, allySave }) => {
    enableNativeConfirmation()
    await page.viewport(width, height)
    await browser.emulateTouch(width !== 1440)
    if (dark) document.documentElement.classList.add('dark')
    fixture.attack = miss ? 0 : 9
    fixture.save = miss ? 19 : 0
    const existing = { id: 'existing', name: 'Existing adventurer', ac: 18, maxHp: 50 }
    fixture.saved = signedIn ? [existing] : []
    saveSettings({ enabledLibraries: [library] })
    renderTutorial(signedIn ? ({ id: 'browser-owner' } as User) : null)
    await startPracticeFight(controls, signedIn)
    await resolvePracticeFight(controls, library, { miss, allySave })
    expect(screen.getByText(/Choose Stop/)).toBeTruthy()
    const stop = screen.getByRole('button', { name: 'Stop' })
    await expectReachable(stop)
    if (width !== 1440) {
      const box = stop.getBoundingClientRect()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    if (width === 1440) {
      for (const [w, h] of [
        [375, 812],
        [844, 390],
        [1180, 820],
      ]) {
        await page.viewport(w, h)
        await expectReachable(stop)
      }
    }
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }), { force: true })
    expect(screen.queryByRole('dialog', { name: 'Combat recap' })).toBeNull()
    for (let tab = 0; tab < 4; tab++) {
      await userEvent.tab()
      expect([stop, screen.getByRole('button', { name: 'Exit tutorial' })]).toContain(
        document.activeElement,
      )
    }
    await userEvent.click(stop)
    const done = screen.getByRole('button', { name: 'Done' })
    for (let tab = 0; tab < 10 && document.activeElement !== done; tab++) await userEvent.tab()
    await expectReachable(done)
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText(/browser.*confirmation.*Cancel/)).toBeTruthy()
    const trash = screen.getByRole('button', { name: 'Remove everyone and clear the log' })
    await expectReachable(trash)
    const confirmation = await browser.confirmBoardClear(false)
    expect(confirmation).toEqual({
      type: 'confirm',
      message: 'Remove everyone from the board and clear the game log? This can’t be undone.',
    })
    expect(loadSettings().tutorialSuppression).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Tutorial complete' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeTruthy()
    const exit = screen.getByRole('button', { name: 'Exit tutorial' })
    await expectReachable(exit, false)
    await userEvent.click(exit)
    await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    await expectReachable(trash)
    await browser.confirmBoardClear(true)
    const complete = await screen.findByRole('dialog', { name: 'Tutorial complete' })
    expect(loadSettings().tutorialSuppression).toBe('completed')
    await expect
      .poll(() => {
        const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
        return (
          decoded.status === 'ok' &&
          decoded.snapshot.encounter.combatants.length === 0 &&
          decoded.snapshot.encounter.log.length === 0 &&
          decoded.snapshot.encounter.round === 0
        )
      })
      .toBe(true)
    const continueButton = within(complete).getByRole('button', {
      name: signedIn ? 'Back to the console' : 'Continue without an account',
    })
    await expectReachable(continueButton, false)
    if (signedIn) {
      expect(within(complete).queryByRole('button', { name: 'Sign in' })).toBeNull()
      expect(fixture.saved).toEqual([
        existing,
        expect.objectContaining({ name: 'Rowan', maxHp: 30, ac: 12 }),
      ])
    } else expect(within(complete).getByRole('button', { name: 'Sign in' })).toBeTruthy()
    await userEvent.click(continueButton)
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  },
)
