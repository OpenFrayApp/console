// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

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

const fetchList = <T>(file: string): Promise<T[]> =>
  fetch(`${COMPENDIUM}/${file}`).then((r) => r.json() as Promise<T[]>).catch(() => [])

export function loadSrdCreatures(): Promise<Creature[]> {
  creatures ??= Promise.all(LIBRARIES.map((l) => fetchList<Creature>(l.creaturesFile))).then(
    (lists) => lists.flat(),
  )
  return creatures
}

export function loadSrdSpells(): Promise<Spell[]> {
  const withSpells = LIBRARIES.filter((l) => l.spellsFile)
  spells ??= Promise.all(withSpells.map((l) => fetchList<Spell>(l.spellsFile!))).then((lists) =>
    lists.flat(),
  )
  return spells
}
