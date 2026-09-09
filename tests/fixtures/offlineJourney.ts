// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../../src/lib/supabase.ts'
import { IndexedDbRecovery } from '../../src/state/indexedDbRecovery.ts'
import { recoverySnapshot } from './sessionSnapshot.ts'

/** Seed synthetic signed-in recovery through the production IndexedDB adapter. */
export async function seedRecovery(): Promise<void> {
  const snapshot = recoverySnapshot('offline-journey')
  snapshot.encounter.name = 'Offline recovery journey'
  snapshot.encounter.round = 4
  snapshot.encounter.log = [
    { id: 'offline-note', round: 4, category: 'note', message: 'Offline recovery journey' },
  ]
  const result = await new IndexedDbRecovery().save(
    'synthetic-owner',
    snapshot,
    '2026-09-02T10:00:00Z',
  )
  if (result.status !== 'saved') throw new Error('Synthetic recovery could not be saved')
  if (!supabase) throw new Error('Synthetic authentication adapter is not configured')
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '')
  const payload = btoa(JSON.stringify({ sub: 'synthetic-owner', exp: 4102444800 })).replace(
    /=+$/,
    '',
  )
  const session = await supabase.auth.setSession({
    access_token: `${header}.${payload}.c3ludGhldGlj`,
    refresh_token: 'synthetic-refresh-token',
  })
  if (session.error) throw new Error('Synthetic identity could not be cached')
}

/** Sign out through the production authentication adapter while retaining owner recovery. */
export async function signOutFixture(): Promise<void> {
  if (!supabase) throw new Error('Synthetic authentication adapter is not configured')
  const result = await supabase.auth.signOut({ scope: 'local' })
  if (result.error) throw new Error('Synthetic sign-out failed')
}

/** Check that anonymous actions did not overwrite the retained signed-in encounter. */
export async function ownerRecoveryHasOnlyFixture(): Promise<boolean> {
  const recovery = await new IndexedDbRecovery().loadLatest()
  return (
    recovery?.snapshot.encounter.log.length === 1 &&
    recovery.snapshot.encounter.log[0].id === 'offline-note'
  )
}
