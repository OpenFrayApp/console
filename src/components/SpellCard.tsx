// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Spell } from '../schema/spell.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

function levelLine(spell: Spell): string {
  if (spell.level === 0) return `${spell.school} cantrip`
  return `${ORDINALS[spell.level - 1] ?? `${spell.level}th`}-level ${spell.school}`
}

function componentLine(spell: Spell): string {
  const parts: string[] = []
  if (spell.components.verbal) parts.push('V')
  if (spell.components.somatic) parts.push('S')
  if (spell.components.material) parts.push('M')
  let line = parts.join(', ')
  if (spell.components.materials) line += ` (${spell.components.materials})`
  return line || '—'
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

export function SpellCard({ spell }: { spell: Spell }) {
  return (
    <div className="flex flex-1 flex-col space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{spell.name}</h3>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          {levelLine(spell)}
          {spell.ritual ? ' (ritual)' : ''}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <Row label="Casting Time" value={spell.castingTime} />
        <Row label="Range" value={spell.range} />
        <Row label="Components" value={componentLine(spell)} />
        <Row
          label="Duration"
          value={`${spell.concentration ? 'Concentration, ' : ''}${spell.duration}`}
        />
      </dl>

      <div className="text-sm text-slate-700 dark:text-slate-300">
        <Markdown>{spell.text}</Markdown>
      </div>

      {spell.classes && spell.classes.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Classes: {spell.classes.join(', ')}
        </p>
      )}

      <SourceLink source={spell.source} />
    </div>
  )
}
