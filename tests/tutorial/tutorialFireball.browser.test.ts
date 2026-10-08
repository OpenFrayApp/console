// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { commands, page, userEvent } from 'vitest/browser'
import { renderTutorial, startPracticeFight } from './setupHarness.tsx'
import { saveSettings } from '../../src/state/settings.ts'
import { enableNativeConfirmation, tutorialControlIsReachable } from './browserHarness.ts'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))
vi.mock('../../src/state/indexedDbRecovery.ts', async (original) => {
  const { IndexedDbRecovery } =
    await original<typeof import('../../src/state/indexedDbRecovery.ts')>()
  return {
    IndexedDbRecovery: class extends IndexedDbRecovery {
      /** Isolate this journey's ordinary recovery writes. */
      constructor() {
        super(`tutorial-fireball-${crypto.randomUUID()}`)
      }
    },
  }
})
vi.mock('../../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, {
        ...ctx,
        rand: () => (ctx.kind === 'attack' ? 9 : ctx.kind === 'save' ? 0 : 5),
      }),
  }
})
const touch = commands as typeof commands & {
  emulateTouch(enabled: boolean): Promise<void>
  confirmBoardClear(accept: boolean): Promise<{ type: string; message: string }>
}
const controls = {
  click: (element: HTMLElement) => userEvent.click(element),
  fill: (element: HTMLElement, value: string) => userEvent.fill(element, value),
  select: (element: HTMLElement, value: string) => userEvent.selectOptions(element, value),
}

/** Observe actual pointer reachability without moving, scrolling, or focusing the target. */
async function expectUsable(target: HTMLElement) {
  await expect.poll(() => tutorialControlIsReachable(target)).toBe(true)
}

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  await touch.emulateTouch(false)
})

it.each([
  { width: 375, height: 812, library: 'srd-5.2', dark: false },
  { width: 1180, height: 820, library: 'srd-5.1', dark: true },
  { width: 1440, height: 900, library: 'srd-5.2', dark: true },
  { width: 844, height: 390, library: 'srd-5.1', dark: false },
  { width: 820, height: 1180, library: 'srd-5.2', dark: false },
])(
  'casts/resolves/advances with visible panes and contained focus at $width × $height ($library)',
  async ({ width, height, library, dark }) => {
    await page.viewport(width, height)
    await touch.emulateTouch(width !== 1440)
    if (dark) document.documentElement.classList.add('dark')
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await startPracticeFight(controls)
    await userEvent.click(screen.getByRole('button', { name: library === 'srd-5.2' ? '68' : '59' }))
    await userEvent.fill(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), '-3')
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Javelin.' }))
    const attack = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
    await userEvent.click(within(attack).getByRole('button', { name: 'Rowan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Prone' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('heading', { name: 'Step 10. Start the Mage’s turn' })).toBeTruthy()
    await expectUsable(screen.getByRole('button', { name: 'Next turn' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    const fireball = await screen.findByRole('button', { name: /^Fireball/ })
    await expectUsable(fireball)
    if (width === 1440) {
      await page.viewport(375, 812)
      await touch.emulateTouch(true)
      await expectUsable(fireball)
    }
    await userEvent.click(screen.getByRole('button', { name: /^Mage Armor/ }), { force: true })
    expect(screen.queryByRole('dialog', { name: 'Mage casts Mage Armor' })).toBeNull()
    await userEvent.click(fireball)
    const cast = screen.getByRole('button', { name: 'Cast' })
    await expectUsable(cast)
    await userEvent.click(cast)
    const dialog = screen.getByRole('dialog', { name: 'Mage · Fireball' })
    const robin = within(dialog).getByRole('button', { name: 'Robin' })
    const ogre = within(dialog).getByRole('button', { name: 'Ogre' })
    await expectUsable(robin)
    for (let index = 0; index < 8 && document.activeElement !== ogre; index++) await userEvent.tab()
    await expectUsable(ogre)
    expect(within(dialog).getByRole('button', { name: 'Rowan' })).toBeDisabled()
    await userEvent.click(robin)
    expect(screen.getByRole('button', { name: 'Roll saves' })).toBeDisabled()
    await userEvent.click(ogre)
    await userEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    const row = screen.getByRole('textbox', { name: 'Damage to Robin' }).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('textbox', { name: 'Damage to Robin' })).toHaveValue('24')
    expect(screen.getByRole('textbox', { name: 'Damage to Ogre' })).toHaveValue('48')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }), { force: true })
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    expect(screen.getByRole('textbox', { name: 'Damage to Robin' })).toHaveValue('24')
    for (let index = 0; index < 10; index++) {
      await userEvent.tab()
      expect(
        dialog.contains(document.activeElement) ||
          document.activeElement ===
            screen.getByRole('region', { name: 'Tutorial instructions' }) ||
          document.activeElement === screen.getByRole('button', { name: 'Exit tutorial' }),
      ).toBe(true)
      expect((document.activeElement as HTMLElement).closest('[inert]')).toBeNull()
    }
    if (width === 1440) {
      const apply = screen.getByRole('button', { name: 'Apply damage' })
      // Keyboard traversal is ordinary user navigation of a scrolled resolution panel.
      for (let index = 0; index < 12 && document.activeElement !== apply; index++)
        await userEvent.tab()
      expect(document.activeElement).toBe(apply)
      await expectUsable(apply)
      await page.viewport(844, 390)
      await expect.poll(() => document.activeElement).toBe(apply)
      await expectUsable(apply)
    }
    await userEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    const next = screen.getByRole('button', { name: 'Next turn' })
    await expectUsable(next)
    if (width === 1440) {
      await page.viewport(1180, 820)
      await expectUsable(next)
      await page.viewport(375, 812)
      await expectUsable(next)
    }
    await userEvent.click(next)
    expect(screen.getByText(/Turn advanced/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  },
)

it('finishes exceptional dying-ally turns, automatic recap, and native cleanup on swipe', async () => {
  enableNativeConfirmation()
  await page.viewport(375, 812)
  await touch.emulateTouch(true)
  renderTutorial()
  await startPracticeFight(controls)
  await userEvent.click(screen.getByRole('button', { name: '68' }))
  await userEvent.fill(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), '-3')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getByRole('button', { name: 'Next turn' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Javelin.' }))
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).getByRole('button', {
      name: 'Rowan',
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
  await userEvent.fill(screen.getByRole('textbox', { name: 'Damage to apply' }), '60')
  await userEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
  await userEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  await userEvent.click(screen.getByRole('button', { name: 'Prone' }))
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next turn' }))
  const fireball = screen.getByRole('button', { name: /^Fireball/ })
  await expectUsable(fireball)
  await userEvent.click(fireball)
  await userEvent.click(screen.getByRole('button', { name: 'Cast' }))
  const dialog = screen.getByRole('dialog', { name: 'Mage · Fireball' })
  for (const name of ['Robin', 'Ogre'])
    await userEvent.click(within(dialog).getByRole('button', { name }))
  await userEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
  await userEvent.click(
    within(screen.getByRole('textbox', { name: 'Damage to Robin' }).closest('li')!).getByRole(
      'button',
      { name: 'Fail' },
    ),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
  const next = screen.getByRole('button', { name: 'Next turn' })
  await expectUsable(next)
  await userEvent.click(next)
  const death = screen.getByRole('button', { name: 'Roll death save' })
  await expectUsable(death)
  await userEvent.click(death)
  await expectUsable(next)
  for (let turn = 0; turn < 3; turn++) await userEvent.click(next)
  await expectUsable(screen.getByRole('button', { name: 'Roll death save' }))
  await userEvent.click(screen.getByRole('button', { name: 'Roll death save' }))
  const recap = screen.getByRole('dialog', { name: 'Combat recap' })
  const done = within(recap).getByRole('button', { name: 'Done' })
  // Reach the dialog's own control using normal keyboard traversal.
  for (let tab = 0; tab < 8 && document.activeElement !== done; tab++) await userEvent.tab()
  await expectUsable(done)
  await userEvent.click(done)
  expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Step 14. Clear the practice board' })).toBeTruthy()
  const trash = screen.getByRole('button', { name: 'Remove everyone and clear the log' })
  await expectUsable(trash)
  await touch.confirmBoardClear(false)
  expect(screen.queryByRole('dialog', { name: 'Tutorial complete' })).toBeNull()
  await expectUsable(trash)
  await touch.confirmBoardClear(true)
  const complete = await screen.findByRole('dialog', { name: 'Tutorial complete' })
  await userEvent.click(
    within(complete).getByRole('button', { name: 'Continue without an account' }),
  )
})
