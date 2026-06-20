// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability, SaveBonuses, Senses, SkillBonuses, Speeds } from '../schema/primitives.ts'
import type { Action, Recharge } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import { formatCr } from '../compendium/format.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABEL: Record<Ability, string> = {
  str: 'Str',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  wis: 'Wis',
  cha: 'Cha',
}
const abilityMod = (score: number): number => Math.floor((score - 10) / 2)
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

function formatSpeed(speed: Speeds): string {
  const parts: string[] = []
  if (speed.walk != null) parts.push(`${speed.walk} ft.`)
  for (const mode of ['fly', 'swim', 'climb', 'burrow'] as const) {
    const value = speed[mode]
    if (value != null) parts.push(`${mode} ${value} ft.`)
  }
  return parts.join(', ') || '—'
}

function formatSaves(saves: SaveBonuses): string {
  return ABILITIES.filter((a) => saves[a] != null)
    .map((a) => `${ABILITY_LABEL[a]} ${signed(saves[a] as number)}`)
    .join(', ')
}

function titleCase(skill: string): string {
  return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

function formatSkills(skills: SkillBonuses): string {
  // Source order — stat-block order matters; do not sort.
  return Object.entries(skills)
    .map(([skill, bonus]) => `${titleCase(skill)} ${signed(bonus as number)}`)
    .join(', ')
}

function rechargeLabel(recharge: Recharge | undefined): string | undefined {
  if (!recharge) return undefined
  if (recharge.type === 'dice') {
    return recharge.value >= 6 ? 'Recharge 6' : `Recharge ${recharge.value}–6`
  }
  if (recharge.type === 'perDay') return `${recharge.value}/Day`
  return `${recharge.value}/Round`
}

function formatSenses(senses: Senses): string {
  const parts: string[] = []
  if (senses.darkvision) parts.push(`Darkvision ${senses.darkvision} ft.`)
  if (senses.blindsight) parts.push(`Blindsight ${senses.blindsight} ft.`)
  if (senses.tremorsense) parts.push(`Tremorsense ${senses.tremorsense} ft.`)
  if (senses.truesight) parts.push(`Truesight ${senses.truesight} ft.`)
  parts.push(`Passive Perception ${senses.passivePerception}`)
  return parts.join(', ')
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <p>
      <span className="font-semibold">{label}</span> {value}
    </p>
  )
}

interface Entry {
  name: string
  text?: string
  /** Suffix after the name, e.g. "Recharge 5–6". */
  note?: string
}

/** Map actions to entries, preserving order and surfacing recharge. */
function actionEntries(actions: Action[] | undefined): Entry[] | undefined {
  return actions?.map((a) => ({
    name: a.name,
    text: a.text,
    note: rechargeLabel(a.recharge),
  }))
}

function Section({ title, items }: { title: string; items?: Entry[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h4 className="mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
        {title}
      </h4>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {items.map((entry) => (
          <Markdown key={entry.name}>
            {`**${entry.name}${entry.note ? ` (${entry.note})` : ''}.** ${entry.text ?? ''}`}
          </Markdown>
        ))}
      </div>
    </div>
  )
}

const ABILITY_GROUPS: Ability[][] = [
  ['str', 'dex', 'con'],
  ['int', 'wis', 'cha'],
]

/** The ability block as two MOD/SAVE tables, like a printed stat block. */
function AbilityScores({ creature }: { creature: Creature }) {
  const saveFor = (a: Ability): number =>
    creature.saves?.[a] ?? abilityMod(creature.abilities[a])
  return (
    <div className="grid grid-cols-2 gap-x-4 text-sm">
      {ABILITY_GROUPS.map((group, i) => (
        <table key={i} className="w-full">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="w-9" />
              <th />
              <th className="px-1 text-right font-medium">Mod</th>
              <th className="px-1 text-right font-medium">Save</th>
            </tr>
          </thead>
          <tbody>
            {group.map((a) => (
              <tr key={a} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
                <td className="rounded-l px-2 py-1 font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {ABILITY_LABEL[a]}
                </td>
                <td className="px-1 py-1 text-right tabular-nums">{creature.abilities[a]}</td>
                <td className="px-1 py-1 text-right tabular-nums">
                  {signed(abilityMod(creature.abilities[a]))}
                </td>
                <td className="rounded-r px-2 py-1 text-right tabular-nums">{signed(saveFor(a))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  )
}

export function CreatureStatBlock({ creature }: { creature: Creature }) {
  const legendaryTitle = creature.legendaryActions
    ? `Legendary Actions (${creature.legendaryActions.perRound}/round)`
    : 'Legendary Actions'

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-bold tracking-tight">{creature.name}</h3>
          {creature.legendaryActions && (
            <span className="rounded bg-amber-200 px-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Legendary
            </span>
          )}
        </div>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          {creature.size} {creature.type} · CR {formatCr(creature.cr)}
          {creature.xp != null ? ` (${creature.xp.toLocaleString('en-US')} XP)` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="font-semibold">AC</span> {creature.ac}
        </span>
        {creature.initiative != null && (
          <span>
            <span className="font-semibold">Initiative</span> {signed(creature.initiative)}
          </span>
        )}
        <span>
          <span className="font-semibold">HP</span> {creature.maxHp}
          {creature.hpFormula ? ` (${creature.hpFormula})` : ''}
        </span>
        <span>
          <span className="font-semibold">Speed</span> {formatSpeed(creature.speed)}
        </span>
      </div>

      <AbilityScores creature={creature} />

      <div className="space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <MetaRow label="Saving Throws" value={creature.saves && formatSaves(creature.saves)} />
        <MetaRow label="Skills" value={creature.skills && formatSkills(creature.skills)} />
        <MetaRow label="Resistances" value={creature.resistances?.join(', ')} />
        <MetaRow label="Damage Immunities" value={creature.immunities?.join(', ')} />
        <MetaRow label="Vulnerabilities" value={creature.vulnerabilities?.join(', ')} />
        <MetaRow
          label="Condition Immunities"
          value={creature.conditionImmunities?.join(', ')}
        />
        <MetaRow label="Senses" value={formatSenses(creature.senses)} />
        <MetaRow label="Languages" value={creature.languages?.join(', ')} />
      </div>

      <Section title="Traits" items={creature.traits} />
      <Section title="Actions" items={actionEntries(creature.actions)} />
      <Section title="Bonus Actions" items={actionEntries(creature.bonusActions)} />
      <Section title="Reactions" items={actionEntries(creature.reactions)} />
      <Section title={legendaryTitle} items={actionEntries(creature.legendaryActions?.actions)} />
      <Section title="Lair Actions" items={actionEntries(creature.lairActions)} />

      <SourceLink source={creature.source} />
    </div>
  )
}
