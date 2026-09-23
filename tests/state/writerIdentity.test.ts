// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it } from 'vitest'
import { claimWriterIdentity } from '../../src/state/writerIdentity.ts'

/** Model one origin's exclusive locks and independent tab session stores. */
function browser() {
  const held = new Set<string>()
  let next = 0
  const randomId = () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`
  const locks = {
    request: async (
      name: string,
      _options: LockOptions,
      callback: (lock: Lock | null) => unknown,
    ) => {
      if (held.has(name)) return callback(null)
      held.add(name)
      return callback({ name, mode: 'exclusive' } as Lock)
    },
  } as Pick<LockManager, 'request'>
  /** Create a tab store, optionally copied from an opener. */
  function tab(values = new Map<string, string>()) {
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
    }
  }
  return { held, locks, randomId, tab }
}

it('reuses a writer after a reload destroys the preceding document', async () => {
  const host = browser()
  const tab = host.tab()
  const original = await claimWriterIdentity(tab, host.locks, host.randomId)
  host.held.clear()
  expect(await claimWriterIdentity(tab, host.locks, host.randomId)).toBe(original)
})

it('gives a duplicated tab its own identity even when session storage was copied', async () => {
  const host = browser()
  const first = host.tab()
  const original = await claimWriterIdentity(first, host.locks, host.randomId)
  const duplicate = host.tab(new Map(first.values))
  const second = await claimWriterIdentity(duplicate, host.locks, host.randomId)
  expect(second).not.toBe(original)
  expect(duplicate.getItem('openfray:encounter-writer')).toBe(second)
  expect(first.getItem('openfray:encounter-writer')).toBe(original)
})

it('keeps independently opened tabs distinct', async () => {
  const host = browser()
  expect(await claimWriterIdentity(host.tab(), host.locks, host.randomId)).not.toBe(
    await claimWriterIdentity(host.tab(), host.locks, host.randomId),
  )
})

it('uses fresh identities without Web Locks rather than trusting copied session storage', async () => {
  const host = browser()
  const tab = host.tab()
  const original = await claimWriterIdentity(tab, host.locks, host.randomId)
  expect(await claimWriterIdentity(tab, undefined, host.randomId)).not.toBe(original)
})

it('keeps working when session storage is unavailable', async () => {
  const host = browser()
  const tab = host.tab()
  tab.getItem = () => {
    throw new Error('Storage denied')
  }
  await expect(claimWriterIdentity(tab, host.locks, host.randomId)).resolves.toMatch(/^[0-9a-f-]+$/)
  expect(host.held.size).toBe(0)
})

it('ignores invalid stored identities and tolerates rejected lock requests', async () => {
  const host = browser()
  const tab = host.tab(new Map([['openfray:encounter-writer', 'invalid']]))
  const id = await claimWriterIdentity(tab, host.locks, host.randomId)
  expect(id).not.toBe('invalid')
  const rejected = { request: () => Promise.reject(new Error('Locks denied')) } as unknown as Pick<
    LockManager,
    'request'
  >
  await expect(claimWriterIdentity(tab, rejected, host.randomId)).resolves.not.toBe(id)
})
