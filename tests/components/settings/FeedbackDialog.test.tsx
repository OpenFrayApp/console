// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FeedbackDialog } from '../../../src/components/settings/FeedbackDialog.tsx'

vi.hoisted(() => vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'synthetic-site-key'))

beforeEach(() => {
  window.turnstile = {
    render: (_host, options) => {
      options.callback('synthetic-token')
      return 'widget'
    },
    remove: () => undefined,
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete window.turnstile
})

/** Fill a valid report through the visible form controls. */
function fill(category = 'bug') {
  render(
    <FeedbackDialog
      open
      onClose={() => undefined}
      counts={{ creatures: 3, players: 2, npcs: 1 }}
    />,
  )
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: category } })
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Synthetic title' } })
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'Synthetic description' },
  })
}

it('posts the entered title, opt-in details, and expected behavior and shows the created issue', async () => {
  const network = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { result: 'issue', url: 'https://github.com/OpenFrayApp/console/issues/42' },
        { status: 201 },
      ),
    )
  vi.stubGlobal('fetch', network)
  fill()
  fireEvent.change(screen.getByLabelText('Expected behavior (optional)'), {
    target: { value: 'Expected result' },
  })
  fireEvent.click(screen.getByLabelText('Include technical details'))
  fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
  expect(await screen.findByText('Feedback posted on GitHub.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View issue' })).toHaveAttribute(
    'href',
    'https://github.com/OpenFrayApp/console/issues/42',
  )
  expect(JSON.parse(network.mock.calls[0][1].body)).toMatchObject({
    title: 'Synthetic title',
    expected: 'Expected result',
    details: { creatures: 3, players: 2, npcs: 1 },
    challenge: 'synthetic-token',
  })
})

it('preserves failed Security feedback and never offers public GitHub reporting', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
  fill('security')
  fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.getByLabelText('Title')).toHaveValue('Synthetic title')
  expect(screen.getByRole('link', { name: 'Email report' })).toHaveAttribute(
    'href',
    'mailto:reports@openfray.app',
  )
  expect(screen.queryByRole('link', { name: 'Report on GitHub' })).toBeNull()
})

it('distinguishes email acceptance and clears the successful draft', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ result: 'email' }, { status: 201 })),
  )
  const props = { open: true, onClose: vi.fn(), counts: { creatures: 0, players: 0, npcs: 0 } }
  const view = render(<FeedbackDialog {...props} />)
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Synthetic title' } })
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'Synthetic description' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
  expect(await screen.findByText(/Feedback sent by email/)).toHaveTextContent(
    'Delivery hasn’t been confirmed.',
  )
  expect(screen.queryByRole('link', { name: 'View issue' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  view.rerender(<FeedbackDialog {...props} open={false} />)
  view.rerender(<FeedbackDialog {...props} />)
  expect(screen.getByLabelText('Title')).toHaveValue('')
})

it('warns before closing during submission and blocks repeated submits', async () => {
  let resolve!: (value: Response) => void
  const network = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done
    }),
  )
  vi.stubGlobal('fetch', network)
  fill()
  const form = screen.getByRole('button', { name: 'Send feedback' }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByText(/Closing won’t cancel submission/)).toBeInTheDocument()
  expect(network).toHaveBeenCalledTimes(1)
  await act(async () => resolve(Response.json({ result: 'email' }, { status: 201 })))
})

it('contains keyboard focus and restores it after closing', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  const props = { open: true, onClose: vi.fn(), counts: { creatures: 0, players: 0, npcs: 0 } }
  const view = render(<FeedbackDialog {...props} />)
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  screen.getByRole('button', { name: 'Cancel' }).focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  view.rerender(<FeedbackDialog {...props} open={false} />)
  expect(trigger).toHaveFocus()
  trigger.remove()
})

it('keeps a draft across closing and reopening and makes Security private', () => {
  const onClose = vi.fn()
  const props = { open: true, onClose, counts: { creatures: 3, players: 2, npcs: 1 } }
  const view = render(<FeedbackDialog {...props} />)
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'A report' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'What happened' } })
  expect(screen.getByLabelText('Expected behavior (optional)')).toBeInTheDocument()
  expect(screen.getByLabelText('Include technical details')).not.toBeChecked()
  fireEvent.click(screen.getByLabelText('Include technical details'))
  expect(
    screen.getByText(
      /Creatures on board: 3 Player characters on board: 2 Nonplayer characters on board: 1/,
    ),
  ).toBeInTheDocument()
  view.rerender(<FeedbackDialog {...props} open={false} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  view.rerender(<FeedbackDialog {...props} />)
  expect(screen.getByLabelText('Title')).toHaveValue('A report')
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'security' } })
  expect(screen.getByText(/emailed privately/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Include technical details')).toBeNull()
  expect(screen.queryByLabelText('Expected behavior (optional)')).toBeNull()
})
