// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * Ingest the SRD from the Open5e v2 API once, transform into our schema, and
 * write static JSON to public/compendium/. Run: `npm run ingest:srd`.
 * Pull-once-and-clean — the app never calls Open5e live (see docs/PROJECT-PLAN.md).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  makeSpellLinker,
  mapOpen5eCreature,
  mapOpen5eSpell,
  type Open5eCreature,
  type Open5eSpell,
} from '../src/compendium/open5e.ts'

const BASE = 'https://api.open5e.com/v2'
const DOC = 'srd-2024'
const HEADERS = { 'User-Agent': 'openfray-ingest' }

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

async function fetchAll(endpoint: string): Promise<any[]> {
  const out: any[] = []
  let url: string | null = `${BASE}/${endpoint}/?document__key=${DOC}&limit=100`
  while (url) {
    const page = await fetchJson(url)
    out.push(...page.results)
    url = page.next
  }
  return out
}

function mapAll<R, T>(items: R[], fn: (r: R) => T, label: string): T[] {
  const ok: T[] = []
  let errors = 0
  for (const item of items) {
    try {
      ok.push(fn(item))
    } catch (e) {
      errors += 1
      if (errors <= 5) {
        console.warn(`  ! ${label}:`, (item as any)?.name, String(e).slice(0, 90))
      }
    }
  }
  console.log(`  ${label}: mapped ${ok.length}/${items.length} (${errors} errors)`)
  return ok
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/compendium')
mkdirSync(outDir, { recursive: true })

// Spells first: the creature mapper links spell names in cast-prose to them.
console.log('Fetching spells…')
const spells = mapAll(
  (await fetchAll('spells')) as Open5eSpell[],
  mapOpen5eSpell,
  'spells',
)
const linkSpells = makeSpellLinker(spells.map((s) => ({ name: s.name, ref: s.id })))

console.log('Fetching creatures…')
const creatures = mapAll(
  (await fetchAll('creatures')) as Open5eCreature[],
  (raw) => mapOpen5eCreature(raw, { linkSpells }),
  'creatures',
)

writeFileSync(resolve(outDir, 'srd-creatures.json'), JSON.stringify(creatures))
writeFileSync(resolve(outDir, 'srd-spells.json'), JSON.stringify(spells))

const doc = await fetchJson(`${BASE}/documents/${DOC}/`)
console.log('\n--- source document (for CREDITS.md) ---')
console.log('title:', doc.name)
console.log('publisher:', doc.publisher?.name ?? doc.publisher)
console.log('licenses:', JSON.stringify(doc.licenses ?? doc.license))
console.log('permalink:', doc.permalink ?? doc.url)

console.log(`\nDone: ${creatures.length} creatures, ${spells.length} spells → public/compendium/`)
