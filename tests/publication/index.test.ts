// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PUBLICATION_INTERFACE_VERSION,
  PUBLISHED_SHARE_SCHEMA_VERSION,
  SOURCE_MANIFEST_VERSION,
  PUBLICATION_SOURCE_MANIFEST,
  normalizePublication,
  publicationSources,
  resolvePublicationPreview,
} from '../../src/publication/index.ts'

const encounter = {
  kind: 'encounter',
  data: {
    v: 1,
    name: 'Synthetic encounter',
    by: 'Fixture author',
    license: 'cc-by-4.0',
    note: 'MUST_NOT_PUBLISH',
    owner_id: 'MUST_NOT_PUBLISH',
    entries: [
      { ref: 'srd-5.2:goblin', count: 2, side: 'foe', secret: 'MUST_NOT_PUBLISH' },
      { quick: { name: 'Scout', maxHp: 8, ac: 12 }, count: 1, side: 'friend' },
    ],
  },
}

const publicationFixture = JSON.parse(
  readFileSync(new URL('../fixtures/hardening/publication.json', import.meta.url), 'utf8'),
) as {
  cases: { id: string; kind: string; input: unknown; expected: string }[]
}

const index = {
  'srd-5.2:goblin': {
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    alignment: 'chaotic neutral',
    cr: 0.25,
    xp: 50,
    actions: 'MUST_NOT_PUBLISH',
  },
}

describe('publication contract', () => {
  it('publishes independently versioned interface, schema, and source manifest contracts', () => {
    expect(PUBLICATION_INTERFACE_VERSION).toBe(1)
    expect(PUBLISHED_SHARE_SCHEMA_VERSION).toBe(1)
    expect(SOURCE_MANIFEST_VERSION).toBe(1)
    expect(PUBLICATION_SOURCE_MANIFEST).toMatchObject({ version: 1, sources: expect.any(Array) })
  })

  it('classifies every canonical publication fixture through the public interface', () => {
    for (const fixture of publicationFixture.cases) {
      const outcome = normalizePublication({ kind: fixture.kind, data: fixture.input })
      if (fixture.expected === 'unsupported') expect(outcome.status, fixture.id).toBe('unsupported')
      else expect(outcome.status, fixture.id).toBe('ok')
      if (outcome.status !== 'ok') continue
      const preview = resolvePublicationPreview(outcome.publication, {})
      if (fixture.expected === 'generic-fallback') {
        expect(preview.status, fixture.id).not.toBe('ok')
      }
      if (fixture.expected === 'allowlist-only') {
        expect(JSON.stringify(outcome), fixture.id).not.toContain('MUST_NOT_PUBLISH')
      }
    }
  })

  it('normalizes a canonical encounter into explicitly allowlisted preview facts', () => {
    const normalized = normalizePublication(encounter)
    expect(normalized.status).toBe('ok')
    if (normalized.status !== 'ok') return

    expect(publicationSources(normalized.publication)).toEqual([
      { id: 'srd-5.2', indexPath: 'srd-creatures.index.json' },
    ])
    const preview = resolvePublicationPreview(normalized.publication, {
      'srd-5.2': index,
    })
    expect(preview).toEqual({
      status: 'ok',
      preview: {
        kind: 'encounter',
        name: 'Synthetic encounter',
        by: 'Fixture author',
        license: 'cc-by-4.0',
        creatures: 3,
        cast: [
          { name: 'Goblin', count: 2, side: 'foe' },
          { name: 'Scout', count: 1, side: 'friend' },
        ],
      },
    })
    expect(JSON.stringify(preview)).not.toContain('MUST_NOT_PUBLISH')
  })

  it('accepts legacy shares without a schema marker', () => {
    const legacy = structuredClone(encounter)
    delete (legacy.data as { v?: number }).v
    expect(normalizePublication(legacy).status).toBe('ok')
  })

  it.each([
    ['unknown kind', { kind: 'campaign', data: {} }, 'unsupported'],
    ['future schema', { kind: 'encounter', data: { ...encounter.data, v: 2 } }, 'unsupported'],
    [
      'malformed child',
      { kind: 'encounter', data: { ...encounter.data, entries: [null] } },
      'invalid',
    ],
    [
      'oversized input',
      { kind: 'encounter', data: { ...encounter.data, note: 'x'.repeat(70_000) } },
      'invalid',
    ],
    [
      'oversized excluded prose',
      { kind: 'encounter', data: { ...encounter.data, note: 'x'.repeat(2001) } },
      'invalid',
    ],
    [
      'hostile prototype key',
      JSON.parse(
        '{"kind":"encounter","data":{"v":1,"name":"Bad","entries":[],"__proto__":{"polluted":true}}}',
      ),
      'invalid',
    ],
  ])('returns a bounded outcome for %s', (_label, input, status) => {
    const outcome = normalizePublication(input)
    expect(outcome.status).toBe(status)
    expect(Object.keys(outcome).sort()).toEqual(
      status === 'ok' ? ['publication', 'status'] : ['reason', 'status'],
    )
    expect(JSON.stringify(outcome)).not.toContain('polluted')
  })

  it('falls back when a referenced compendium entry is missing', () => {
    const normalized = normalizePublication(encounter)
    expect(normalized.status).toBe('ok')
    if (normalized.status !== 'ok') return
    expect(resolvePublicationPreview(normalized.publication, { 'srd-5.2': {} })).toEqual({
      status: 'invalid',
      reason: 'missing-compendium',
    })
  })

  it('derives carried and referenced creature licenses from allowlisted facts', () => {
    const carried = normalizePublication({
      kind: 'creature',
      data: {
        v: 1,
        name: 'Fixture sentinel',
        creature: {
          id: 'custom:fixture',
          source: 'custom',
          name: 'Fixture sentinel',
          size: 'Medium',
          type: 'construct',
          ac: 14,
          maxHp: 20,
          speed: { walk: 30 },
          abilities: { str: 12, dex: 10, con: 12, int: 6, wis: 10, cha: 6 },
          senses: { passivePerception: 10 },
          license: 'cc-by-sa-4.0',
          description: 'MUST_NOT_PUBLISH',
        },
      },
    })
    expect(carried.status).toBe('ok')
    if (carried.status !== 'ok') return
    expect(resolvePublicationPreview(carried.publication, {})).toEqual({
      status: 'ok',
      preview: {
        kind: 'creature',
        name: 'Fixture sentinel',
        size: 'Medium',
        type: 'construct',
        license: 'cc-by-sa-4.0',
      },
    })
  })
})
