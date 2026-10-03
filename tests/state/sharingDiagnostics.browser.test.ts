// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { PlayerView } from '../../src/components/player/PlayerView.tsx'
import { playerBoard } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'
import { clearSharingDiagnostics } from '../../src/state/sharingDiagnostics.ts'
import {
  INITIAL_PLAYER_PROTOCOL_STATE,
  sendGameMasterMessage,
} from '../../src/state/playerProtocol.ts'
import {
  LIVE_VIEW_CAPABILITY_BYTES,
  liveViewTopics,
  mintLiveViewCapability,
} from '../../src/state/liveViewAuthority.ts'
import { makeRealtimeStub } from './supabaseMock.ts'
import '../../src/index.css'

const supa = vi.hoisted(() => ({ client: null as unknown }))
vi.mock('../../src/lib/supabase.ts', () => ({
  supabase: new Proxy(
    {},
    { get: (_target, property) => (supa.client as Record<PropertyKey, unknown>)[property] },
  ),
}))
const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(9))
let originalUrl = ''

beforeEach(() => {
  originalUrl = location.href
  const optedIn = new URL(originalUrl)
  optedIn.searchParams.set('sharingDiagnostics', '1')
  history.replaceState(null, '', optedIn)
  vi.useFakeTimers()
  clearSharingDiagnostics()
})

afterEach(async () => {
  cleanup()
  history.replaceState(null, '', originalUrl)
  vi.useRealTimers()
  clearSharingDiagnostics()
  supa.client = null
  await page.viewport(1280, 720)
})

it.each([390, 1024])(
  'offers a copyable receive-gap report at %i px without exposing the private link',
  async (width) => {
    await page.viewport(width, 844)
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    render(createElement(PlayerView, { code: 'private-link-name', capability }))
    await act(async () => {
      await liveViewTopics(capability, null)
      await Promise.resolve()
    })
    const board = playerBoard(
      {
        encounterId: 'private-encounter-id',
        ownerId: null,
        round: 3,
        activeIndex: 0,
        combatants: [],
        log: [],
      },
      DEFAULT_PLAYER_VIEW,
    )
    const initial = sendGameMasterMessage(
      INITIAL_PLAYER_PROTOCOL_STATE,
      'private-sender-id',
      { type: 'board', board },
      Date.now(),
    )
    act(() => {
      channels[0].ready()
      channels[0].emit('player-view-protocol', initial.envelope)
      vi.advanceTimersByTime(40_000)
    })
    expect(screen.getByText('Connection lost')).not.toBeNull()
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        sendGameMasterMessage(
          initial.state,
          'private-sender-id',
          { type: 'board', board },
          Date.now(),
        ).envelope,
      ),
    )
    expect(screen.getByText('Live')).not.toBeNull()
    await userEvent.click(screen.getByText('Sharing diagnostics (staging)'))
    await userEvent.click(screen.getByRole('button', { name: 'Copy diagnostics' }))
    const serialized = (
      screen.getByRole('textbox', { name: 'Sharing diagnostics report' }) as HTMLTextAreaElement
    ).value
    const report = JSON.parse(serialized)
    expect(report.events).toContainEqual(
      expect.objectContaining({ event: 'receive-accepted', gapMs: 40_000 }),
    )
    expect(report.events).toContainEqual(
      expect.objectContaining({ event: 'freshness-change', status: 'connection-lost' }),
    )
    expect(serialized).not.toContain(capability)
    expect(serialized).not.toContain('private-link-name')
    expect(serialized).not.toContain('private-encounter-id')
    expect(serialized).not.toContain('private-sender-id')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth)
  },
)
