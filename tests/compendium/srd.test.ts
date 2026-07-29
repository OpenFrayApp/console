// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import { LIBRARIES } from '../../src/compendium/libraries.ts'

// The module builds every URL under the app base, so the assets resolve at /console/.
const BASE = `${import.meta.env.BASE_URL}compendium`

const SPELL_LIBRARIES = LIBRARIES.filter((l) => l.spellsFile)

/** Import a fresh copy of the module, so each test starts with an empty cache. */
async function freshSrd() {
  vi.resetModules()
  return import('../../src/compendium/srd.ts')
}

/** Stub global fetch to serve each compendium file a one-entry list naming it. */
function stubFetch(failFile?: string) {
  const fetchMock = vi.fn(async (url: string) => {
    const file = url.split('/').pop()
    if (file === failFile) throw new Error('network down')
    return { json: async () => [{ id: `from:${file}` }] }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The URLs the stubbed fetch was asked for, in call order. */
function requestedUrls(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map(([url]) => url)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadSrdCreatures', () => {
  it('fetches every shipped library file under the base URL and merges them in order', async () => {
    const fetchMock = stubFetch()
    const srd = await freshSrd()
    const creatures = await srd.loadSrdCreatures()
    expect(requestedUrls(fetchMock)).toEqual(LIBRARIES.map((l) => `${BASE}/${l.creaturesFile}`))
    expect(requestedUrls(fetchMock)[0]).toBe('/console/compendium/srd-creatures.json')
    expect(creatures).toEqual(LIBRARIES.map((l) => ({ id: `from:${l.creaturesFile}` })))
  })

  it('serves the cached list on a second call without fetching again', async () => {
    const fetchMock = stubFetch()
    const srd = await freshSrd()
    const first = await srd.loadSrdCreatures()
    const second = await srd.loadSrdCreatures()
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(LIBRARIES.length)
  })

  it('degrades a failed file to an empty list without breaking the merge', async () => {
    stubFetch('srd-creatures.json')
    const srd = await freshSrd()
    const creatures = await srd.loadSrdCreatures()
    const others = LIBRARIES.filter((l) => l.creaturesFile !== 'srd-creatures.json')
    expect(others.length).toBe(LIBRARIES.length - 1)
    expect(creatures).toEqual(others.map((l) => ({ id: `from:${l.creaturesFile}` })))
  })
})

describe('loadSrdSpells', () => {
  it('fetches spells only from the libraries that ship them, merged in order', async () => {
    const fetchMock = stubFetch()
    const srd = await freshSrd()
    const spells = await srd.loadSrdSpells()
    expect(SPELL_LIBRARIES.length).toBeGreaterThan(0)
    expect(SPELL_LIBRARIES.length).toBeLessThan(LIBRARIES.length)
    expect(requestedUrls(fetchMock)).toEqual(SPELL_LIBRARIES.map((l) => `${BASE}/${l.spellsFile}`))
    expect(spells).toEqual(SPELL_LIBRARIES.map((l) => ({ id: `from:${l.spellsFile}` })))
  })

  it('serves the cached list on a second call without fetching again', async () => {
    const fetchMock = stubFetch()
    const srd = await freshSrd()
    const first = await srd.loadSrdSpells()
    const second = await srd.loadSrdSpells()
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(SPELL_LIBRARIES.length)
  })

  it('degrades a response whose body fails to parse to an empty list', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const file = url.split('/').pop()
      if (file === 'srd-spells.json') {
        return {
          json: async () => {
            throw new Error('bad json')
          },
        }
      }
      return { json: async () => [{ id: `from:${file}` }] }
    })
    vi.stubGlobal('fetch', fetchMock)
    const srd = await freshSrd()
    const spells = await srd.loadSrdSpells()
    const others = SPELL_LIBRARIES.filter((l) => l.spellsFile !== 'srd-spells.json')
    expect(spells).toEqual(others.map((l) => ({ id: `from:${l.spellsFile}` })))
  })

  it('keeps the creature and spell caches independent', async () => {
    const fetchMock = stubFetch()
    const srd = await freshSrd()
    await srd.loadSrdCreatures()
    await srd.loadSrdSpells()
    await srd.loadSrdCreatures()
    await srd.loadSrdSpells()
    expect(fetchMock).toHaveBeenCalledTimes(LIBRARIES.length + SPELL_LIBRARIES.length)
  })
})
