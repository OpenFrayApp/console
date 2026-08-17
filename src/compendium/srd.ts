// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import { LIBRARIES } from './libraries.ts'

/**
 * Loads the bundled SRD compendium (CC-BY-4.0; see CREDITS.md). The data is served
 * as static assets and fetched once on demand — not part of the JS bundle.
 * Regenerate with `npm run ingest:srd` (5.2) and `npm run ingest:srd-2014` (5.1).
 *
 * All shipped libraries are loaded and merged; which ones the user *sees* is a
 * display filter (src/compendium/libraries.ts). Loading everything keeps spell refs
 * resolvable no matter what's enabled. A missing file degrades to an empty list.
 */

let creatures: Promise<Creature[]> | undefined
let spells: Promise<Spell[]> | undefined

// Base-relative so the fetch resolves under the app's path (e.g. /console/).
const COMPENDIUM = `${import.meta.env.BASE_URL}compendium`

/** Each file fetched at most once, however many callers ask for it. */
const files = new Map<string, Promise<unknown[]>>()

/** Fetch one compendium JSON file; any failure yields an empty list, never a throw. */
const fetchList = <T>(file: string): Promise<T[]> => {
  const cached = files.get(file)
  if (cached) return cached as Promise<T[]>
  const pending = fetch(`${COMPENDIUM}/${file}`)
    .then((r) => r.json() as Promise<unknown[]>)
    .catch(() => [])
  files.set(file, pending)
  return pending as Promise<T[]>
}

/** Fetch and merge creatures from every library that ships them; cached after the first call. */
export function loadSrdCreatures(): Promise<Creature[]> {
  const withCreatures = LIBRARIES.filter((l) => l.creaturesFile)
  creatures ??= Promise.all(withCreatures.map((l) => fetchList<Creature>(l.creaturesFile!))).then(
    (lists) => lists.flat(),
  )
  return creatures
}

/** Fetch and merge spells from every library that ships them; cached after the first call. */
export function loadSrdSpells(): Promise<Spell[]> {
  const withSpells = LIBRARIES.filter((l) => l.spellsFile)
  spells ??= Promise.all(withSpells.map((l) => fetchList<Spell>(l.spellsFile!))).then((lists) =>
    lists.flat(),
  )
  return spells
}

/**
 * Creatures and spells from named libraries only — the sources a shared encounter actually
 * names, rather than every book the app ships.
 *
 * The whole compendium is about five megabytes of JSON, which is nothing inside the console
 * (it is fetched once, in the background, by someone who came to run a fight) and far too
 * much on a public page that may be a stranger's first contact with OpenFray. A goblin
 * ambush needs one file.
 *
 * The per-file cache is shared with the full loaders above, so a page that later opens the
 * console re-uses whatever this already fetched.
 */
export function loadLibraries(sources: readonly string[]): Promise<{
  creatures: Creature[]
  spells: Spell[]
}> {
  const wanted = new Set(sources)
  const libraries = LIBRARIES.filter((l) => wanted.has(l.id))
  return Promise.all([
    Promise.all(
      libraries.filter((l) => l.creaturesFile).map((l) => fetchList<Creature>(l.creaturesFile!)),
    ),
    Promise.all(libraries.filter((l) => l.spellsFile).map((l) => fetchList<Spell>(l.spellsFile!))),
  ]).then(([creatureLists, spellLists]) => ({
    creatures: creatureLists.flat(),
    spells: spellLists.flat(),
  }))
}

/** The library a compendium id belongs to: everything before the colon. */
export function sourceOfId(id: string): string {
  const colon = id.indexOf(':')
  return colon > 0 ? id.slice(0, colon) : id
}
