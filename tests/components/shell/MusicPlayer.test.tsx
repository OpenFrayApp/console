// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MusicPlayer } from '../../../src/components/shell/MusicPlayer.tsx'
import { musicCatalog } from '../../../src/music/catalog.ts'
import type { MusicPlayerSnapshot } from '../../../src/music/player.ts'

afterEach(cleanup)

const queued: MusicPlayerSnapshot = {
  selectedId: 'ancient-god',
  status: 'queued',
  error: null,
  volume: 0.7,
}

/** Render the player with callback spies and an overridable public state. */
function setup(state: MusicPlayerSnapshot = queued) {
  const onSelect = vi.fn()
  const onPlay = vi.fn()
  const onPause = vi.fn()
  const onVolume = vi.fn()
  render(
    <MusicPlayer
      tracks={musicCatalog}
      state={state}
      onSelect={onSelect}
      onPlay={onPlay}
      onPause={onPause}
      onVolume={onVolume}
    />,
  )
  return { onSelect, onPlay, onPause, onVolume }
}

describe('MusicPlayer', () => {
  it('offers a title picker, music toggle, and vertical volume control', () => {
    const { onSelect, onPlay, onVolume } = setup()

    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play music' }))
    fireEvent.click(screen.getByRole('button', { name: 'Music volume' }))
    const volume = screen.getByRole('slider', { name: 'Music volume' })
    fireEvent.change(volume, { target: { value: '35' } })

    expect(screen.getByRole('option', { name: 'Ancient God' })).toBeInTheDocument()
    expect(volume).toHaveAttribute('aria-orientation', 'vertical')
    expect(onSelect).toHaveBeenCalledWith(null)
    expect(onPlay).toHaveBeenCalledOnce()
    expect(onVolume).toHaveBeenCalledWith(0.35)
  })

  it('changes the toggle to Pause while playing', () => {
    const { onPause } = setup({ ...queued, status: 'playing' })

    fireEvent.click(screen.getByRole('button', { name: 'Pause music' }))

    expect(onPause).toHaveBeenCalledOnce()
  })

  it.each([
    ['loading', null, 'Loading music…', 'Pause music'],
    ['error', 'offline', 'Music needs a connection.', 'Play music'],
    [
      'error',
      'unavailable',
      'That track is unavailable. Choose another track or try again.',
      'Play music',
    ],
    ['error', 'rejected', 'Playback was blocked. Press Play to try again.', 'Play music'],
  ] as const)(
    'announces the %s state without disabling the controls',
    (status, error, message, toggleLabel) => {
      setup({ ...queued, status, error })

      expect(screen.getByRole('status')).toHaveTextContent(message)
      expect(screen.getByLabelText('Music track')).toBeEnabled()
      expect(screen.getByRole('button', { name: toggleLabel })).toBeEnabled()
    },
  )
})
