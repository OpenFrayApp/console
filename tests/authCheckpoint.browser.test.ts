// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import App from '../src/App.tsx'
import { AuthContext } from '../src/auth/useAuth.ts'
import { authState } from './fixtures.ts'
import { saveSettings } from '../src/state/settings.ts'
import { loadAuthRecovery } from '../src/state/authRecovery.ts'
import { encodeSession } from '../src/codecs/session.ts'
import { recoverySnapshot } from './fixtures/sessionSnapshot.ts'
import '../src/index.css'

const navigation = vi.hoisted(() => ({ leave: vi.fn(), account: vi.fn() }))
vi.mock('../src/auth/signInNavigation.ts', () => ({
  navigateToSiteSignIn: navigation.leave,
  navigateToSiteAccount: navigation.account,
}))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
  navigation.leave.mockReset()
})

it.each([1280, 768])('keeps header checkpoint controls clickable at width %s', async (width) => {
  await page.viewport(width, 900)
  saveSettings({ tutorialSuppression: 'dismissed' })
  const legacy = encodeSession(recoverySnapshot('legacy-private'))
  if (legacy.status !== 'ok') throw new Error('Invalid fixture')
  sessionStorage.setItem('openfray:session', legacy.serialized)
  render(createElement(AuthContext.Provider, { value: authState() }, createElement(App)))
  await screen.findByRole('button', { name: 'Save failed' })
  const write = Storage.prototype.setItem
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === 'openfray:auth-recovery') throw new DOMException('Full', 'QuotaExceededError')
    return write.call(this, key, value)
  })
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  const dialog = await screen.findByRole('dialog', { name: 'Sign-in checkpoint' })
  expect(dialog.closest('[inert]')).toBeNull()
  const download = vi.spyOn(URL, 'createObjectURL')
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await userEvent.click(screen.getByRole('button', { name: 'Download recovery copy' }))
  expect(download).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
  expect(screen.queryByRole('dialog', { name: 'Sign-in checkpoint' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByRole('dialog', { name: 'Sign-in checkpoint' })
  storage.mockRestore()
  await userEvent.click(screen.getByRole('button', { name: 'Retry sign-in' }))
  await expect.poll(() => navigation.leave.mock.calls.length).toBe(1)
  expect(loadAuthRecovery().snapshot?.encounter.combatants).toEqual([])
  expect(sessionStorage.getItem('openfray:session')).toBe(legacy.serialized)
})
