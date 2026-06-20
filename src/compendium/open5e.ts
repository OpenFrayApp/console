// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ContentSource, Edition } from '../schema/primitives.ts'
import type { Spell } from '../schema/spell.ts'

/**
 * Transforms for ingesting Open5e v2 content into OpenFray's schema. We pull
 * once, clean, and seed — never call the API live (see docs/PROJECT-PLAN.md). The
 * mappers read only the fields we need and tolerate the rest of the payload.
 */

/** Map an Open5e document key to our source + edition. */
export function mapSource(documentKey: string): {
  source: ContentSource
  edition?: Edition
} {
  switch (documentKey) {
    case 'srd-2024':
      return { source: 'srd-5.2', edition: '5.5' }
    case 'srd-2014':
      return { source: 'srd-5.1', edition: '5.0' }
    default:
      return { source: documentKey }
  }
}

/** The intra-source identity key — Open5e keys are `<document>_<slug>`. */
export function slugFromKey(key: string, documentKey: string): string {
  const prefix = `${documentKey}_`
  return key.startsWith(prefix) ? key.slice(prefix.length) : key
}

export interface Open5eSpell {
  key: string
  document: { key: string }
  name: string
  desc: string
  higher_level?: string | null
  level: number
  school: { name: string }
  classes?: { name: string }[]
  casting_time: string
  range_text: string
  duration: string
  concentration: boolean
  ritual: boolean
  verbal: boolean
  somatic: boolean
  material: boolean
  material_specified?: string | null
}

export function mapOpen5eSpell(raw: Open5eSpell): Spell {
  const documentKey = raw.document.key
  const { source, edition } = mapSource(documentKey)
  const slug = slugFromKey(raw.key, documentKey)
  const text = raw.higher_level
    ? `${raw.desc}\n\nAt Higher Levels: ${raw.higher_level}`
    : raw.desc

  return {
    id: `${source}:${slug}`,
    source,
    edition,
    name: raw.name,
    level: raw.level,
    school: raw.school.name,
    castingTime: raw.casting_time,
    range: raw.range_text,
    components: {
      verbal: raw.verbal,
      somatic: raw.somatic,
      material: raw.material,
      materials: raw.material_specified ?? undefined,
    },
    duration: raw.duration,
    concentration: raw.concentration,
    ritual: raw.ritual,
    classes: raw.classes?.map((c) => c.name),
    text,
  }
}
