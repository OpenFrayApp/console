// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReportResult } from '../../../src/state/reports.ts'

const report = vi.hoisted(() => ({ result: 'ok' as ReportResult, calls: [] as unknown[][] }))

vi.mock('../../../src/state/reports.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/state/reports.ts')>()
  return {
    ...actual,
    reportShare: (...args: unknown[]) => {
      report.calls.push(args)
      return Promise.resolve(report.result)
    },
  }
})

vi.mock('../../../src/lib/turnstile.ts', () => ({ turnstileConfigured: true }))

vi.mock('../../../src/components/share/TurnstileChallenge.tsx', () => ({
  TurnstileChallenge: ({
    onToken,
    onUnavailable,
  }: {
    onToken: (token: string) => void
    onUnavailable: () => void
  }) => (
    <>
      <button type="button" onClick={() => onToken('challenge-token')}>
        Complete verification
      </button>
      <button type="button" onClick={onUnavailable}>
        Fail verification
      </button>
    </>
  ),
}))

const { ReportShareDialog } = await import('../../../src/components/share/ReportShareDialog.tsx')

afterEach(() => {
  cleanup()
  report.result = 'ok'
  report.calls = []
  delete (window as { fathom?: unknown }).fathom
})

/** Complete the challenge and submit the report form. */
function sendReport() {
  fireEvent.click(screen.getByRole('button', { name: 'Complete verification' }))
  fireEvent.click(screen.getByRole('button', { name: 'Send report' }))
}

/** Stand in for Fathom, which the real `track` calls through when the script has loaded. */
function countEvents() {
  const trackEvent = vi.fn()
  ;(window as { fathom?: unknown }).fathom = { trackEvent }
  return trackEvent
}

describe('ReportShareDialog', () => {
  it('counts a report that landed, and not one that didn’t', async () => {
    // The number says how often somebody found something worth reporting. Counting the
    // attempt instead would fold a broken server into that.
    report.result = 'failed'
    const trackEvent = countEvents()
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    sendReport()
    await waitFor(() => expect(screen.getByText(/Couldn’t send/)).toBeInTheDocument())
    expect(trackEvent).not.toHaveBeenCalled()

    report.result = 'ok'
    sendReport()
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('Encounter reported'))
  })

  it('sends the code with the reason, so nobody has to copy a link', async () => {
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'impersonation' } })
    fireEvent.change(screen.getByLabelText('Anything to add (optional)'), {
      target: { value: '  Claims to be someone else.  ' },
    })
    sendReport()

    await waitFor(() =>
      expect(report.calls[0]).toEqual([
        'k7mqx3rt9p',
        'impersonation',
        'Claims to be someone else.',
        '',
        'challenge-token',
      ]),
    )
    await screen.findByText(/somebody will read it/)
  })

  it('offers no way to demand a takedown, because none could be honoured', async () => {
    // An anonymous publisher leaves no identity on the row, so a claim to one arriving
    // through this form is unverifiable. Offering the option would promise something
    // nobody can act on; a publisher who wants that guarantee signs in.
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    const reasons = [...screen.getByLabelText('Reason').querySelectorAll('option')]
    expect(reasons.map((o) => o.value)).toEqual([
      'spam',
      'sexual',
      'hate',
      'impersonation',
      'copyright',
      'other',
    ])
    expect(reasons.map((o) => o.textContent).join(' ')).not.toMatch(/take.*down/i)
  })

  it('takes a report with no message at all', async () => {
    // Picking a reason is the whole effort for most reporters; a form that demanded prose
    // would collect nothing.
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    sendReport()
    await waitFor(() =>
      expect(report.calls[0]).toEqual(['k7mqx3rt9p', 'spam', '', '', 'challenge-token']),
    )
  })

  it('offers an address to reply to without ever requiring one', async () => {
    // Optional both ways: a report goes through with the field empty, and an address given
    // travels with it.
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    const email = screen.getByLabelText('Your email (optional)') as HTMLInputElement
    expect(email.value).toBe('')
    expect(screen.getByText(/don’t have to say who you are/)).toBeTruthy()

    fireEvent.change(email, { target: { value: 'reader@example.com' } })
    sendReport()
    await waitFor(() =>
      expect(report.calls[0]).toEqual([
        'k7mqx3rt9p',
        'spam',
        '',
        'reader@example.com',
        'challenge-token',
      ]),
    )
  })

  it('says a typo is a typo rather than losing the reply', async () => {
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Your email (optional)'), {
      target: { value: 'reader@example' },
    })
    sendReport()
    await screen.findByText(/doesn’t look like an email address/)
    expect(report.calls).toHaveLength(0)
  })

  it('does not send until the abuse challenge is complete', async () => {
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }))
    await screen.findByText(/Complete the verification/)
    expect(report.calls).toHaveLength(0)
  })

  it('gives an email fallback when the challenge cannot load', async () => {
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fail verification' }))
    await screen.findByText(/Verification isn’t available/)
    expect(report.calls).toHaveLength(0)
  })

  it('gives an address to write to when reporting isn’t set up', async () => {
    report.result = 'unavailable'
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    sendReport()
    await screen.findByText(/reports@openfray.app/)
  })

  it('says a failure is a failure rather than thanking them for nothing', async () => {
    report.result = 'failed'
    render(<ReportShareDialog code="k7mqx3rt9p" onClose={vi.fn()} />)
    sendReport()
    await screen.findByText(/Couldn’t send that/)
    expect(screen.queryByText(/somebody will read it/)).toBeNull()
  })
})
