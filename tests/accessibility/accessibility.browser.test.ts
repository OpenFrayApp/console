// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import App from '../../src/App.tsx'
import { CombatantRow } from '../../src/components/tracker/CombatantRow.tsx'
import { Button, Chip, IconButton, TabButton } from '../../src/components/ui/primitives.tsx'
import '../../src/index.css'

const accessibilityCommands = commands as typeof commands & {
  emulateAccessibilityMedia(options: {
    forcedColors?: 'active' | 'none'
    reducedMotion?: 'reduce' | 'no-preference'
  }): Promise<void>
  emulateTouch(enabled: boolean): Promise<void>
}

/** Clear browser state and restore the default emulated environment. */
async function resetBrowser(): Promise<void> {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
  await accessibilityCommands.emulateAccessibilityMedia({
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  })
  await accessibilityCommands.emulateTouch(false)
  await page.viewport(1280, 720)
}

/** Render the console after setting the viewport used by its shell queries. */
async function renderConsole(width: number, height: number): Promise<void> {
  await page.viewport(width, height)
  render(createElement(App))
  await screen.findByRole('button', { name: width <= 1024 ? 'Add to the encounter' : 'Quick add' })
}

/** Report whether the document itself overflows horizontally. */
function hasPageOverflow(): boolean {
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
}

beforeEach(resetBrowser)
afterEach(resetBrowser)

describe('core keyboard journey', () => {
  it('has no serious or critical automated accessibility violations', async () => {
    await renderConsole(1280, 720)
    const result = await axe.run(document)
    const blocking = result.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    )

    expect(blocking).toEqual([])
  })

  it('keeps keyboard focus visible and inside the viewport while adding a combatant', async () => {
    await renderConsole(1280, 720)

    await userEvent.tab()
    const focused = document.activeElement as HTMLElement
    const style = getComputedStyle(focused)
    const bounds = focused.getBoundingClientRect()

    expect(focused).toBeInstanceOf(HTMLAnchorElement)
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2)
    expect(style.outlineStyle).not.toBe('none')
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)

    await userEvent.keyboard('{Control>}a{/Control}')
    const name = await screen.findByLabelText('Quick add name')
    expect(document.activeElement).toBe(name)
    await userEvent.fill(name, 'Bandit')
    await userEvent.fill(screen.getByLabelText('Max HP'), '10')
    await userEvent.keyboard('{Enter}')
    expect(screen.getAllByText('Bandit')[0]).toBeVisible()

    await userEvent.keyboard('b')
    expect(await screen.findByRole('dialog', { name: 'Roll initiative' })).toBeVisible()
    const initiative = screen.getByLabelText('Initiative for Bandit')
    expect(document.activeElement).toBe(initiative)
    expect(initiative.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight)
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Round 1' })).toBeVisible()

    await userEvent.keyboard('n')
    expect(screen.getByRole('heading', { name: 'Round 2' })).toBeVisible()
  })
})

describe('reflow and user text settings', () => {
  it('keeps a core task available at 320 CSS pixels', async () => {
    await renderConsole(320, 720)
    expect(hasPageOverflow()).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Add to the encounter' }))
    expect(await screen.findByRole('menu')).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Quick add' })).toBeVisible()
  })

  it('completes a core task with text resized to 200 percent', async () => {
    document.documentElement.style.fontSize = '200%'
    await renderConsole(1280, 720)

    await userEvent.keyboard('{Control>}a{/Control}')
    const name = await screen.findByLabelText('Quick add name')
    await userEvent.fill(name, 'Zoomed bandit')
    await userEvent.fill(screen.getByLabelText('Max HP'), '10')
    await userEvent.keyboard('{Enter}')
    expect(screen.getAllByText('Zoomed bandit')[0]).toBeVisible()
  })

  it('keeps controls available with WCAG text spacing applied', async () => {
    Object.assign(document.body.style, {
      letterSpacing: '0.12em',
      lineHeight: '1.5',
      wordSpacing: '0.16em',
    })
    await renderConsole(320, 720)
    for (const paragraph of document.querySelectorAll<HTMLElement>('p')) {
      paragraph.style.marginBottom = '2em'
    }

    expect(hasPageOverflow()).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Add to the encounter' }))
    expect(await screen.findByRole('menuitem', { name: 'Quick add' })).toBeVisible()
  })

  it('keeps the focused field visible when the visual height contracts', async () => {
    await renderConsole(390, 844)
    await userEvent.click(screen.getByRole('button', { name: 'Add to the encounter' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Quick add' }))
    const name = await screen.findByLabelText('Quick add name')

    await page.viewport(390, 420)
    const bounds = name.getBoundingClientRect()
    expect(document.activeElement).toBe(name)
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
  })
})

describe('display and input preferences', () => {
  it('retains visible focus and operation in forced colors', async () => {
    await accessibilityCommands.emulateAccessibilityMedia({ forcedColors: 'active' })
    await renderConsole(1280, 720)
    expect(matchMedia('(forced-colors: active)').matches).toBe(true)

    await userEvent.tab()
    const focused = document.activeElement as HTMLElement
    expect(getComputedStyle(focused).outlineStyle).not.toBe('none')
    await userEvent.keyboard('{Control>}a{/Control}')
    expect(await screen.findByLabelText('Quick add name')).toBeVisible()
  })

  it('removes non-essential transitions when reduced motion is requested', async () => {
    await accessibilityCommands.emulateAccessibilityMedia({ reducedMotion: 'reduce' })
    await renderConsole(1280, 720)
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

    const wordmark = screen.getByTitle('OpenFray home')
    expect(Number.parseFloat(getComputedStyle(wordmark).transitionDuration)).toBeLessThanOrEqual(
      0.01,
    )
  })

  it('gives primary and repeated controls a 44 CSS pixel touch target', async () => {
    await accessibilityCommands.emulateTouch(true)
    render(
      createElement(
        'div',
        { className: 'flex gap-2' },
        createElement(Button, null, 'Add'),
        createElement(IconButton, { 'aria-label': 'Settings' }),
        createElement(Chip, null, 'Prone'),
        createElement(TabButton, { active: false }, 'Tracker'),
        createElement(CombatantRow, {
          combatant: {
            isPC: true,
            kind: 'quick',
            side: 'foe',
            combatantId: 'touch-bandit',
            name: 'Bandit',
            initiative: 12,
            ac: 12,
            status: 'active',
            hp: { current: 10, max: 10, temp: 0 },
            concentration: null,
            effects: [],
          },
          reorderable: true,
        }),
      ),
    )
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)

    for (const control of screen.getAllByRole('button')) {
      const bounds = control.getBoundingClientRect()
      expect(
        bounds.width,
        control.textContent ?? control.getAttribute('aria-label') ?? '',
      ).toBeGreaterThanOrEqual(44)
      expect(
        bounds.height,
        control.textContent ?? control.getAttribute('aria-label') ?? '',
      ).toBeGreaterThanOrEqual(44)
    }
  })
})
