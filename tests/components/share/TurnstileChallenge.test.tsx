// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
  delete window.turnstile
  document.getElementById('openfray-turnstile')?.remove()
})

describe('report challenge', () => {
  it('renders a report-scoped Turnstile widget and removes it with the dialog', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'public-site-key')
    const onToken = vi.fn()
    const remove = vi.fn()
    const renderWidget = vi.fn(
      (_container: HTMLElement, options: { callback: (token: string) => void }) => {
        options.callback('verified-token')
        return 'widget-1'
      },
    )
    window.turnstile = { render: renderWidget as never, remove }
    const { TurnstileChallenge } =
      await import('../../../src/components/share/TurnstileChallenge.tsx')

    const view = render(
      <TurnstileChallenge onToken={onToken} resetKey={0} onUnavailable={vi.fn()} />,
    )
    expect(renderWidget).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: 'public-site-key', action: 'report', theme: 'auto' }),
    )
    expect(onToken).toHaveBeenCalledWith('verified-token')

    view.unmount()
    expect(remove).toHaveBeenCalledWith('widget-1')
  })

  it('reports a blocked challenge script as unavailable', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'public-site-key')
    const onUnavailable = vi.fn()
    const { TurnstileChallenge } =
      await import('../../../src/components/share/TurnstileChallenge.tsx')
    render(<TurnstileChallenge onToken={vi.fn()} resetKey={0} onUnavailable={onUnavailable} />)

    document.getElementById('openfray-turnstile')?.dispatchEvent(new Event('error'))
    expect(onUnavailable).toHaveBeenCalledOnce()
  })
})
