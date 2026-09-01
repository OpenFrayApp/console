// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** The only console interface deployment code may use for published shares. */

export const PUBLICATION_INTERFACE_VERSION = 1
export const PUBLISHED_SHARE_SCHEMA_VERSION = 1
export const SOURCE_MANIFEST_VERSION = 1

export const PUBLICATION_SOURCE_MANIFEST = {
  version: SOURCE_MANIFEST_VERSION,
  sources: [
    {
      id: 'srd-5.2',
      indexPath: 'srd-creatures.index.json',
      license: 'cc-by-4.0',
    },
    {
      id: 'srd-5.1',
      indexPath: 'srd-2014-creatures.index.json',
      license: 'cc-by-4.0',
    },
    {
      id: 'kobold-press-tob',
      indexPath: 'tob1-creatures.index.json',
      license: 'ogl-1.0a',
    },
    {
      id: 'kobold-press-tob2',
      indexPath: 'tob2-creatures.index.json',
      license: 'ogl-1.0a',
    },
    {
      id: 'kobold-press-tob3',
      indexPath: 'tob3-creatures.index.json',
      license: 'ogl-1.0a',
    },
    {
      id: 'kobold-press-ccdx',
      indexPath: 'creature-codex-creatures.index.json',
      license: 'ogl-1.0a',
    },
    {
      id: 'openfray-brood-and-bloom',
      indexPath: 'brood-and-bloom-creatures.index.json',
      license: 'cc-by-4.0',
    },
    {
      id: 'openfray-waking-garden',
      indexPath: 'waking-garden-creatures.index.json',
      license: 'cc-by-4.0',
    },
  ],
} as const

export type PublicationLicense =
  | 'cc0-1.0'
  | 'cc-by-4.0'
  | 'cc-by-sa-4.0'
  | 'cc-by-nc-4.0'
  | 'cc-by-nc-sa-4.0'
  | 'ogl-1.0a'
  | 'reserved'
  | 'unstated'

export interface PublicationCastFact {
  name: string
  count: number
  side: 'friend' | 'foe'
}

export type PublicationPreview =
  | {
      kind: 'encounter'
      name: string
      cast: PublicationCastFact[]
      creatures: number
      by?: string
      license?: PublicationLicense
    }
  | {
      kind: 'creature'
      name: string
      size?: string
      type?: string
      alignment?: string
      cr?: number
      xp?: number
      by?: string
      license?: PublicationLicense
    }

interface ReferenceFact {
  kind: 'reference'
  ref: string
  sourceId: string
  count: number
  side: 'friend' | 'foe'
}

interface NamedFact {
  kind: 'named'
  name: string
  count: number
  side: 'friend' | 'foe'
}

interface CreatureFact {
  kind: 'creature'
  name: string
  size?: string
  type?: string
  alignment?: string
  cr?: number
  xp?: number
  by?: string
  license?: PublicationLicense
  ref?: { id: string; sourceId: string }
}

export type NormalizedPublication =
  | {
      kind: 'encounter'
      name: string
      entries: (ReferenceFact | NamedFact)[]
      by?: string
      license?: PublicationLicense
    }
  | CreatureFact

export type PublicationOutcome =
  | { status: 'ok'; publication: NormalizedPublication }
  | { status: 'unsupported'; reason: 'kind' | 'schema-version' | 'source' }
  | { status: 'invalid'; reason: 'shape' | 'bounds' }

export type PublicationPreviewOutcome =
  | { status: 'ok'; preview: PublicationPreview }
  | { status: 'unsupported'; reason: 'source' }
  | { status: 'invalid'; reason: 'source-index' | 'missing-compendium' }

const LICENSES = new Set<PublicationLicense>([
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'ogl-1.0a',
  'reserved',
  'unstated',
])
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SOURCE_BY_ID = new Map<string, (typeof PUBLICATION_SOURCE_MANIFEST.sources)[number]>(
  PUBLICATION_SOURCE_MANIFEST.sources.map((source) => [source.id, source]),
)
const MAX_BYTES = 64 * 1024
const MAX_ENTRIES = 40
const MAX_COMBATANTS = 100

/** Return a plain record without trusting inherited properties. */
function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Detect cyclic input and keys that can mutate object prototypes. */
function isHostile(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value !== 'object' || value === null) return false
  if (seen.has(value)) return true
  seen.add(value)
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key) || isHostile((value as Record<string, unknown>)[key], seen)) {
      return true
    }
  }
  seen.delete(value)
  return false
}

/** Measure serializable input without allowing a cyclic value to throw. */
function withinBounds(value: unknown): boolean {
  try {
    const json = JSON.stringify(value)
    return typeof json === 'string' && json.length <= MAX_BYTES
  } catch {
    return false
  }
}

/** Normalize one untrusted display line and reject control characters. */
function line(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return null
  const clean = value.trim().replace(/\s+/g, ' ')
  return clean.length > 0 && clean.length <= max ? clean : null
}

/** Accept bounded prose while keeping it out of every preview projection. */
function validProse(value: unknown, max: number): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= max)
}

/** Read a finite number in a closed range. */
function numberIn(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined
}

/** Read a whole number in a closed range. */
function integerIn(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null
}

/** Read one declared content license without inferring from unknown text. */
function license(value: unknown): PublicationLicense | undefined {
  return typeof value === 'string' && LICENSES.has(value as PublicationLicense)
    ? (value as PublicationLicense)
    : undefined
}

/** Split a compendium reference against an exact declared source id. */
function reference(value: unknown): { id: string; sourceId: string } | null | 'unsupported' {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 120 ||
    !/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(value)
  ) {
    return null
  }
  const sourceId = value.slice(0, value.lastIndexOf(':'))
  return SOURCE_BY_ID.has(sourceId) ? { id: value, sourceId } : 'unsupported'
}

/** Project only the carried creature facts permitted in previews. */
function carriedCreature(value: unknown): Omit<CreatureFact, 'kind'> | null {
  const raw = record(value)
  if (!raw) return null
  const name = line(raw.name, 160)
  const size = line(raw.size, 160)
  const type = line(raw.type, 160)
  if (!name || !size || !type) return null
  if (
    !line(raw.id, 160) ||
    !line(raw.source, 160) ||
    integerIn(raw.ac, 0, 99) === null ||
    integerIn(raw.maxHp, 1, 9999) === null ||
    !record(raw.speed) ||
    !record(raw.abilities) ||
    !record(raw.senses)
  ) {
    return null
  }
  const alignment = raw.alignment === undefined ? undefined : line(raw.alignment, 160)
  if (raw.alignment !== undefined && !alignment) return null
  const cr = raw.cr === undefined ? undefined : numberIn(raw.cr, 0, 1000)
  const xp = raw.xp === undefined ? undefined : numberIn(raw.xp, 0, 10_000_000)
  if ((raw.cr !== undefined && cr === undefined) || (raw.xp !== undefined && xp === undefined)) {
    return null
  }
  return {
    name,
    size,
    type,
    ...(alignment ? { alignment } : {}),
    ...(cr !== undefined ? { cr } : {}),
    ...(xp !== undefined ? { xp } : {}),
    ...(license(raw.license) ? { license: license(raw.license) } : {}),
  }
}

/** Validate the unlisted code shape used by every published route. */
export function isPublicationShareCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 6 &&
    value.length <= 32 &&
    /^[abcdefghjkmnpqrstuvwxyz23456789]+$/.test(value)
  )
}

/** Normalize an unknown published-share row into bounded publication facts. */
export function normalizePublication(input: unknown): PublicationOutcome {
  if (isHostile(input) || !withinBounds(input)) return { status: 'invalid', reason: 'bounds' }
  const row = record(input)
  if (!row || typeof row.kind !== 'string') return { status: 'invalid', reason: 'shape' }
  if (row.kind !== 'encounter' && row.kind !== 'creature') {
    return { status: 'unsupported', reason: 'kind' }
  }
  const data = record(row.data)
  if (!data) return { status: 'invalid', reason: 'shape' }
  if (data.v !== undefined && data.v !== PUBLISHED_SHARE_SCHEMA_VERSION) {
    return typeof data.v === 'number' && Number.isInteger(data.v) && data.v > 1
      ? { status: 'unsupported', reason: 'schema-version' }
      : { status: 'invalid', reason: 'shape' }
  }

  const name = line(data.name, 60)
  const by = data.by === undefined ? undefined : (line(data.by, 30) ?? undefined)
  if (!validProse(data.note, 2000)) return { status: 'invalid', reason: 'bounds' }

  if (row.kind === 'encounter') {
    if (!name || !Array.isArray(data.entries) || data.entries.length === 0) {
      return { status: 'invalid', reason: 'shape' }
    }
    if (data.entries.length > MAX_ENTRIES) return { status: 'invalid', reason: 'bounds' }
    const entries: (ReferenceFact | NamedFact)[] = []
    let creatures = 0
    for (const value of data.entries) {
      const entry = record(value)
      if (!entry || (entry.side !== 'friend' && entry.side !== 'foe')) {
        return { status: 'invalid', reason: 'shape' }
      }
      const count = integerIn(entry.count, 1, 30)
      if (count === null) return { status: 'invalid', reason: 'shape' }
      creatures += count
      if (creatures > MAX_COMBATANTS) return { status: 'invalid', reason: 'bounds' }
      if (entry.labels !== undefined) {
        if (!Array.isArray(entry.labels) || entry.labels.length > 30) {
          return { status: 'invalid', reason: 'shape' }
        }
        for (const label of entry.labels) {
          if (!line(label, 40)) return { status: 'invalid', reason: 'shape' }
        }
      }
      const ways = [entry.ref, entry.creature, entry.quick].filter((item) => item != null).length
      if (ways !== 1) return { status: 'invalid', reason: 'shape' }
      if (entry.ref !== undefined) {
        const ref = reference(entry.ref)
        if (ref === 'unsupported') return { status: 'unsupported', reason: 'source' }
        if (!ref) return { status: 'invalid', reason: 'shape' }
        entries.push({
          kind: 'reference',
          ref: ref.id,
          sourceId: ref.sourceId,
          count,
          side: entry.side,
        })
      } else if (entry.quick !== undefined) {
        const quick = record(entry.quick)
        const quickName = quick && line(quick.name, 40)
        if (
          !quickName ||
          integerIn(quick.maxHp, 1, 9999) === null ||
          integerIn(quick.ac, 0, 99) === null
        ) {
          return { status: 'invalid', reason: 'shape' }
        }
        entries.push({ kind: 'named', name: quickName, count, side: entry.side })
      } else {
        const creature = carriedCreature(entry.creature)
        if (!creature) return { status: 'invalid', reason: 'shape' }
        entries.push({ kind: 'named', name: creature.name, count, side: entry.side })
      }
    }
    return {
      status: 'ok',
      publication: {
        kind: 'encounter',
        name,
        entries,
        ...(by ? { by } : {}),
        ...(license(data.license) && data.license !== 'unstated'
          ? { license: license(data.license) }
          : {}),
      },
    }
  }

  const ways = [data.ref, data.creature].filter((item) => item != null).length
  if (ways !== 1) return { status: 'invalid', reason: 'shape' }
  if (data.ref !== undefined) {
    const ref = reference(data.ref)
    if (ref === 'unsupported') return { status: 'unsupported', reason: 'source' }
    if (!ref) return { status: 'invalid', reason: 'shape' }
    return {
      status: 'ok',
      publication: {
        kind: 'creature',
        name: name ?? 'Shared creature',
        ref,
        ...(by ? { by } : {}),
      },
    }
  }
  const creature = carriedCreature(data.creature)
  if (!creature) return { status: 'invalid', reason: 'shape' }
  return {
    status: 'ok',
    publication: {
      kind: 'creature',
      ...creature,
      name: name ?? creature.name,
      ...(by ? { by } : {}),
    },
  }
}

/** Describe the exact source indexes a normalized publication needs. */
export function publicationSources(
  publication: NormalizedPublication,
): { id: string; indexPath: string }[] {
  const ids = new Set<string>()
  if (publication.kind === 'encounter') {
    for (const entry of publication.entries) {
      if (entry.kind === 'reference') ids.add(entry.sourceId)
    }
  } else if (publication.ref) {
    ids.add(publication.ref.sourceId)
  }
  return [...ids].flatMap((id) => {
    const source = SOURCE_BY_ID.get(id)
    return source ? [{ id: source.id, indexPath: source.indexPath }] : []
  })
}

/** Resolve references through untrusted sidecar indexes and emit preview-only facts. */
export function resolvePublicationPreview(
  publication: NormalizedPublication,
  sourceIndexes: unknown,
): PublicationPreviewOutcome {
  const indexes = record(sourceIndexes)
  if (!indexes) return { status: 'invalid', reason: 'source-index' }
  if (publication.kind === 'encounter') {
    const cast: PublicationCastFact[] = []
    let creatures = 0
    for (const entry of publication.entries) {
      creatures += entry.count
      if (entry.kind === 'named') {
        cast.push({ name: entry.name, count: entry.count, side: entry.side })
        continue
      }
      const index = record(indexes[entry.sourceId])
      const indexed = index && record(index[entry.ref])
      const name = indexed && line(indexed.name, 160)
      if (!name) return { status: 'invalid', reason: 'missing-compendium' }
      cast.push({ name, count: entry.count, side: entry.side })
    }
    return {
      status: 'ok',
      preview: {
        kind: 'encounter',
        name: publication.name,
        cast,
        creatures,
        ...(publication.by ? { by: publication.by } : {}),
        ...(publication.license ? { license: publication.license } : {}),
      },
    }
  }

  if (publication.ref) {
    const source = SOURCE_BY_ID.get(publication.ref.sourceId)
    if (!source) return { status: 'unsupported', reason: 'source' }
    const index = record(indexes[publication.ref.sourceId])
    const indexed = index && record(index[publication.ref.id])
    if (!indexed) return { status: 'invalid', reason: 'missing-compendium' }
    const indexedName = line(indexed.name, 160)
    const size = line(indexed.size, 160)
    const type = line(indexed.type, 160)
    if (!indexedName || !size || !type) return { status: 'invalid', reason: 'source-index' }
    const alignment = indexed.alignment === undefined ? undefined : line(indexed.alignment, 160)
    const cr = indexed.cr === undefined ? undefined : numberIn(indexed.cr, 0, 1000)
    const xp = indexed.xp === undefined ? undefined : numberIn(indexed.xp, 0, 10_000_000)
    if (
      (indexed.alignment !== undefined && !alignment) ||
      (indexed.cr !== undefined && cr === undefined) ||
      (indexed.xp !== undefined && xp === undefined)
    ) {
      return { status: 'invalid', reason: 'source-index' }
    }
    return {
      status: 'ok',
      preview: {
        kind: 'creature',
        name: publication.name || indexedName,
        size,
        type,
        ...(alignment ? { alignment } : {}),
        ...(cr !== undefined ? { cr } : {}),
        ...(xp !== undefined ? { xp } : {}),
        ...(publication.by ? { by: publication.by } : {}),
        license: source.license,
      },
    }
  }

  return {
    status: 'ok',
    preview: {
      kind: 'creature',
      name: publication.name,
      ...(publication.size ? { size: publication.size } : {}),
      ...(publication.type ? { type: publication.type } : {}),
      ...(publication.alignment ? { alignment: publication.alignment } : {}),
      ...(publication.cr !== undefined ? { cr: publication.cr } : {}),
      ...(publication.xp !== undefined ? { xp: publication.xp } : {}),
      ...(publication.by ? { by: publication.by } : {}),
      ...(publication.license ? { license: publication.license } : {}),
    },
  }
}
