// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * Ingest SRD 5.1 (D&D 2014) from the 5e-bits API (dnd5eapi.co) once, transform into
 * our schema, and write static JSON to public/compendium/. Run: `npm run ingest:srd-2014`.
 *
 * A separate, occasional pipeline from the Open5e 2024 ingest — chosen because
 * dnd5eapi.co exposes structured monster spellcasting (slots + spells-by-level), which
 * the slot-casting model needs. SRD 5.1 is dual-licensed; we use it under CC-BY-4.0 and
 * never the OGL (see docs/content-licensing.md). The app never calls the API live.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  mapDndApiMonster,
  mapDndApiSpell,
  type DndApiMonster,
  type DndApiSpell,
} from '../src/compendium/dnd5eapi.ts'

const BASE = 'https://www.dnd5eapi.co/api/2014'

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url.startsWith('http') ? url : `https://www.dnd5eapi.co${url}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

/** Fetch every item in a collection: pull the index list, then each detail in
 *  bounded-concurrency batches (the API is one request per resource). */
async function fetchAll(endpoint: string): Promise<any[]> {
  const list = await fetchJson(`${BASE}/${endpoint}`)
  const urls: string[] = list.results.map((r: { url: string }) => r.url)
  const out: any[] = []
  const BATCH = 12
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = await Promise.all(urls.slice(i, i + BATCH).map((u) => fetchJson(u)))
    out.push(...batch)
    process.stdout.write(`\r  ${endpoint}: ${out.length}/${urls.length}`)
  }
  process.stdout.write('\n')
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
      if (errors <= 5) console.warn(`  ! ${label}:`, (item as any)?.name, String(e).slice(0, 90))
    }
  }
  console.log(`  ${label}: mapped ${ok.length}/${items.length} (${errors} errors)`)
  return ok
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/compendium')
mkdirSync(outDir, { recursive: true })

console.log('Fetching SRD 5.1 spells…')
const spells = mapAll((await fetchAll('spells')) as DndApiSpell[], mapDndApiSpell, 'spells')

console.log('Fetching SRD 5.1 monsters…')
const creatures = mapAll((await fetchAll('monsters')) as DndApiMonster[], mapDndApiMonster, 'monsters')

writeFileSync(resolve(outDir, 'srd-2014-creatures.json'), JSON.stringify(creatures))
writeFileSync(resolve(outDir, 'srd-2014-spells.json'), JSON.stringify(spells))

console.log(`\nDone: ${creatures.length} creatures, ${spells.length} spells → public/compendium/`)
console.log('Source: dnd5eapi.co (SRD 5.1, used under CC-BY-4.0). Fill CREDITS.md 5.1 attribution.')
