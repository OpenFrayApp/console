// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'

/**
 * Loads the bundled SRD compendium (CC-BY-4.0; see CREDITS.md). The data is
 * served as a static asset and fetched once on demand — it is not part of the JS
 * bundle. Regenerate with `npm run ingest:srd`.
 */

let creatures: Promise<Creature[]> | undefined
let spells: Promise<Spell[]> | undefined

// Base-relative so the fetch resolves under the app's path (e.g. /console/) — the
// data lives in public/compendium and is served alongside the app bundle.
const COMPENDIUM = `${import.meta.env.BASE_URL}compendium`

export function loadSrdCreatures(): Promise<Creature[]> {
  creatures ??= fetch(`${COMPENDIUM}/srd-creatures.json`).then(
    (r) => r.json() as Promise<Creature[]>,
  )
  return creatures
}

export function loadSrdSpells(): Promise<Spell[]> {
  spells ??= fetch(`${COMPENDIUM}/srd-spells.json`).then(
    (r) => r.json() as Promise<Spell[]>,
  )
  return spells
}
