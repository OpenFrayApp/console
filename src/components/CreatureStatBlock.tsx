// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability, Senses, SkillBonuses, Speeds } from '../schema/primitives.ts'
import type { Action, Recharge } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import type { Concentration, HitPoints } from '../schema/combatant.ts'
import { hpTierOf } from '../combat/resources.ts'
import { formatCr } from '../compendium/format.ts'
import { hpToneFor } from './hpTone.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'
import { HeaderStat, StatHeader } from './StatHeader.tsx'

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

// The ability/skill table headings and row labels use swapped styles: the heading
// is the heavier one, the row label the lighter.
const TABLE_HEADING = 'font-semibold uppercase text-slate-500 dark:text-slate-400'
const TABLE_ROW_LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

function titleCase(skill: string): string {
  return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

const SPEED_LABEL: Record<keyof Speeds, string> = {
  walk: 'Walk',
  fly: 'Fly',
  swim: 'Swim',
  climb: 'Climb',
  burrow: 'Burrow',
  hover: 'Hover',
}

function speedLines(speed: Speeds): string[] {
  return (['walk', 'fly', 'swim', 'climb', 'burrow'] as (keyof Speeds)[])
    .filter((k) => typeof speed[k] === 'number')
    .map((k) => `${SPEED_LABEL[k]} ${speed[k] as number} ft.`)
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

/** A two-column "label / value" table that always renders, showing "—" if empty. */
function MetaTable({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
            <td className="w-px whitespace-nowrap rounded-l px-2 py-1 align-top text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {label}
            </td>
            <td className="rounded-r px-2 py-1 align-top text-xs text-slate-600 dark:text-slate-300">
              {value && value.length ? value : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --- ability / skill tables -------------------------------------------------

const ABILITY_GROUPS: Ability[][] = [
  ['str', 'dex', 'con'],
  ['int', 'wis', 'cha'],
]

/** The ability block as two MOD/SAVE tables that fill the available width. */
function AbilityScores({ creature }: { creature: Creature }) {
  const saveFor = (a: Ability): number =>
    creature.saves?.[a] ?? abilityMod(creature.abilities[a])
  return (
    <div className="flex gap-3 text-sm">
      {ABILITY_GROUPS.map((group, i) => (
        <table key={i} className="flex-1">
          <thead>
            <tr className={TABLE_HEADING}>
              <th />
              <th />
              <th className="px-1 text-right">Mod</th>
              <th className="px-1 text-right">Save</th>
            </tr>
          </thead>
          <tbody>
            {group.map((a) => (
              <tr key={a} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
                <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{ABILITY_LABEL[a]}</td>
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

function SkillsTable({ skills }: { skills: SkillBonuses }) {
  const entries = Object.entries(skills)
  if (entries.length === 0) return null
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={TABLE_HEADING}>
          <th className="px-2 text-left">Skills</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map(([skill, bonus]) => (
          <tr key={skill} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
            <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{titleCase(skill)}</td>
            <td className="rounded-r px-2 py-1 text-right tabular-nums">{signed(bonus as number)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --- sections ---------------------------------------------------------------

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

export function CreatureStatBlock({
  creature,
  hp,
  concentration,
  label,
  onRename,
  onHpInput,
  onTempInput,
}: {
  creature: Creature
  /** Live hit points when shown in combat; absent in the reference compendium. */
  hp?: HitPoints
  /** Live concentration, when in combat — drives the "C" badge. */
  concentration?: Concentration | null
  /** The combatant's display name (shown in the tracker); defaults to the creature name. */
  label?: string
  /** Rename the combatant's tracker label. */
  onRename?: (label: string) => void
  /** Edit current HP from a raw input ("12", "+5", "-3"). */
  onHpInput?: (raw: string) => void
  /** Edit temp HP from a raw input. */
  onTempInput?: (raw: string) => void
}) {
  const displayName = label ?? creature.name
  const legendaryTitle = creature.legendaryActions
    ? `Legendary Actions (${creature.legendaryActions.perRound}/round)`
    : 'Legendary Actions'

  const current = hp ? hp.current : creature.maxHp
  const max = hp ? hp.max : creature.maxHp
  const hpTone = hp ? hpToneFor(hpTierOf(hp.current, hp.max)) : 'text-slate-900 dark:text-slate-100'
  const hpValue = (
    <span>
      <span className={hpTone}>{current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{max}</span>
    </span>
  )
  const tmpValue =
    hp && hp.temp > 0 ? (
      <span className="text-sky-600 dark:text-sky-400">{hp.temp}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-500">—</span>
    )
  const speeds = speedLines(creature.speed)

  return (
    <div className="@container flex flex-1 flex-col space-y-4">
      <StatHeader
        name={displayName}
        onRename={onRename}
        originalName={label && label !== creature.name ? creature.name : undefined}
        subtitle={
          <>
            {creature.size} {creature.type} · CR {formatCr(creature.cr)}
            {creature.xp != null ? ` (${creature.xp.toLocaleString('en-US')} XP)` : ''}
          </>
        }
        legendary={creature.legendaryActions != null}
        concentration={concentration}
        speeds={speeds}
        stats={
          <>
            <HeaderStat label="AC" value={creature.ac} />
            <HeaderStat
              label="HP"
              value={hpValue}
              edit={onHpInput ? { initial: '', onCommit: onHpInput, title: 'Set HP, or +N / −N' } : undefined}
            />
            <HeaderStat
              label="TMP"
              value={tmpValue}
              edit={onTempInput ? { initial: '', onCommit: onTempInput, title: 'Set temp HP, or +N / −N' } : undefined}
            />
            {creature.initiative != null && (
              <HeaderStat label="Init" value={signed(creature.initiative)} />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="min-w-[20rem] flex-1">
          <AbilityScores creature={creature} />
        </div>
        {creature.skills && (
          <div className="min-w-[12rem] flex-1">
            <SkillsTable skills={creature.skills} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="min-w-[16rem] flex-1">
          <MetaTable
            rows={[
              ['Resistances', creature.resistances?.join(', ')],
              [
                'Immunities',
                [...(creature.immunities ?? []), ...(creature.conditionImmunities ?? [])].join(', '),
              ],
              ['Vulnerabilities', creature.vulnerabilities?.join(', ')],
            ]}
          />
        </div>
        <div className="min-w-[16rem] flex-1">
          <MetaTable
            rows={[
              ['Senses', formatSenses(creature.senses)],
              ['Languages', creature.languages?.join(', ')],
            ]}
          />
        </div>
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
