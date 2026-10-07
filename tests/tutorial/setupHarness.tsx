// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { render, screen } from '@testing-library/react'
import App from '../../src/App.tsx'
import { AuthContext } from '../../src/auth/useAuth.ts'
import { authState } from '../fixtures.ts'
import type { User } from '@supabase/supabase-js'

/** Render the real console with external identity supplied at its public boundary. */
export function renderTutorial(user: User | null = null) {
  const container = document.createElement('div')
  container.style.height = '100%'
  document.body.append(container)
  return render(
    <AuthContext.Provider value={authState({ user })}>
      <App />
    </AuthContext.Provider>,
    { container },
  )
}

/** Set up the practice fight through real controls in either rendered test environment. */
export async function startPracticeFight(
  controls: {
    click: (element: HTMLElement) => unknown
    fill: (element: HTMLElement, value: string) => unknown
    select: (element: HTMLElement, value: string) => unknown
  },
  signedIn = false,
) {
  await controls.click(await screen.findByRole('button', { name: 'Start tutorial' }))
  /** Open the visible desktop control or its swipe menu equivalent. */
  const openAdd = async (name: string) => {
    const button = screen.queryByRole('button', { name })
    if (button) await controls.click(button)
    else {
      await controls.click(screen.getByRole('button', { name: 'Add to the encounter' }))
      await controls.click(screen.getByRole('menuitem', { name }))
    }
  }
  await openAdd('Add PC')
  if (signedIn) {
    await controls.click(screen.getByRole('button', { name: 'Create a character…' }))
    await controls.click(await screen.findByRole('button', { name: 'Create character' }))
  }
  await controls.fill(screen.getByRole('textbox', { name: 'PC name' }), 'Rowan')
  await controls.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
  await controls.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
  await controls.click(screen.getByRole('button', { name: signedIn ? 'Create PC' : 'Add' }))
  if (signedIn)
    await controls.click(await screen.findByRole('button', { name: 'Add to encounter' }))
  await openAdd('Quick add')
  await controls.fill(screen.getByRole('textbox', { name: 'Quick add name' }), 'Robin')
  await controls.fill(screen.getByRole('textbox', { name: 'Max HP' }), '30')
  await controls.fill(screen.getByRole('textbox', { name: 'AC' }), '12')
  await controls.select(screen.getByRole('combobox', { name: 'Side' }), 'friend')
  await controls.click(screen.getByRole('button', { name: 'Add' }))
  for (const name of ['Mage', 'Ogre']) {
    await openAdd('Add creature')
    await controls.fill(screen.getByRole('searchbox', { name: 'Search creatures' }), name)
    await controls.click(await screen.findByRole('button', { name: new RegExp(`^${name} `) }))
  }
  await controls.click(screen.getByRole('button', { name: 'Begin' }))
  for (const [index, name] of ['Rowan', 'Robin', 'Mage', 'Ogre'].entries())
    await controls.fill(
      screen.getByRole('textbox', { name: `Initiative for ${name}` }),
      String(20 - index),
    )
  await controls.click(screen.getByRole('button', { name: 'Start combat' }))
}
