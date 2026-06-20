// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import type { Ability, Senses, SkillBonuses, Speeds } from '../schema/primitives.ts'
import type { Action, Recharge } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import type { HitPoints } from '../schema/combatant.ts'
import { hpTierOf } from '../combat/resources.ts'
import { formatCr } from '../compendium/format.ts'
import { hpToneFor } from './hpTone.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'

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

function titleCase(skill: string): string {
  return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
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

// --- AC / HP / speed icons --------------------------------------------------

const STAT_LABEL = 'text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500'

/** A shield filled with the AC number and a small "AC" label. */
function ShieldStat({ value }: { value: number }) {
  return (
    <div
      className="relative inline-flex h-20 w-[4.5rem] shrink-0 flex-col items-center justify-center"
      title={`Armor Class ${value}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 h-full w-full text-slate-200 dark:text-slate-800"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2 4 4.7v6.6c0 4.7 3.4 8.1 8 9.3 4.6-1.2 8-4.6 8-9.3V4.7L12 2z" />
      </svg>
      <span className={`relative -mb-0.5 ${STAT_LABEL}`}>AC</span>
      <span className="relative text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  )
}

/** A labelled badge for a single value (e.g. Initiative). */
function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex h-20 min-w-[4rem] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800/40">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className={STAT_LABEL}>{label}</span>
    </div>
  )
}

/** The hit-points panel: Current / Max / Temp, current tinted by wound tier. */
function HpPanel({
  current,
  max,
  temp,
  live,
}: {
  current: number
  max: number
  temp: number
  live: boolean
}) {
  const currentTone = live ? hpToneFor(hpTierOf(current, max)) : 'text-slate-900 dark:text-slate-100'
  const Col = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
    <div className="text-center">
      <div className={`text-2xl font-bold leading-none tabular-nums ${tone}`}>{value}</div>
      <div className={`mt-1 ${STAT_LABEL}`}>{label}</div>
    </div>
  )
  return (
    <div
      className="inline-flex h-20 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800/40"
      title={`${current} / ${max} HP`}
    >
      <Col label="Current" value={String(current)} tone={currentTone} />
      <div className="text-xl text-slate-300 dark:text-slate-600">/</div>
      <Col label="Max" value={String(max)} tone="text-slate-900 dark:text-slate-100" />
      <Col
        label="Temp"
        value={temp > 0 ? String(temp) : '—'}
        tone={temp > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}
      />
    </div>
  )
}

const SpeedGlyph: Record<string, ReactNode> = {
  // walk — a footprint (sole + toes)
  walk: (
    <g fill="currentColor">
      <ellipse cx="11" cy="14.5" rx="3.6" ry="5.6" />
      <circle cx="6.3" cy="6" r="1.3" />
      <circle cx="9.2" cy="4.3" r="1.3" />
      <circle cx="12.7" cy="4.3" r="1.3" />
      <circle cx="15.6" cy="6" r="1.3" />
    </g>
  ),
  // fly — a swept wing
  fly: (
    <path
      fill="currentColor"
      d="M21 5c-6.5.2-11.5 3.2-15.5 9 2-.7 3.8-.9 5.4-.6-2.1 1.3-3.8 3-5 5.4 5.2-1.5 9.6-5.4 15.1-13.8z"
    />
  ),
  // swim — two water lines
  swim: (
    <g fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </g>
  ),
  // climb — a spider (oval body + 8 legs)
  climb: (
    <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <ellipse cx="12" cy="12" rx="2.4" ry="2.9" fill="currentColor" stroke="none" />
      <path d="M9.6 11 4 8M9.6 12.6 4 13.6M14.4 11 20 8M14.4 12.6 20 13.6M10.6 9.6 7.6 5M13.4 9.6 16.4 5M10.6 14.2 7.6 18.6M13.4 14.2 16.4 18.6" />
    </g>
  ),
  // burrow — an arrow going down under the surface
  burrow: (
    <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M12 9v9M8 14l4 4 4-4" />
    </g>
  ),
}

const SPEED_ORDER: { key: keyof Speeds; label: string }[] = [
  { key: 'walk', label: 'Walk' },
  { key: 'fly', label: 'Fly' },
  { key: 'swim', label: 'Swim' },
  { key: 'climb', label: 'Climb' },
  { key: 'burrow', label: 'Burrow' },
]

function SpeedIcons({ speed }: { speed: Speeds }) {
  const items = SPEED_ORDER.filter((m) => typeof speed[m.key] === 'number')
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {items.map((m) => (
        <span
          key={m.key}
          className="inline-flex items-center gap-1.5"
          title={`${m.label} ${speed[m.key] as number} ft.`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden="true">
            {SpeedGlyph[m.key]}
          </svg>
          <span className="tabular-nums">{speed[m.key] as number} ft.</span>
        </span>
      ))}
    </div>
  )
}

// --- ability / skill tables -------------------------------------------------

const ABILITY_GROUPS: Ability[][] = [
  ['str', 'dex', 'con'],
  ['int', 'wis', 'cha'],
]

/** The ability block as two MOD/SAVE tables, like a printed stat block. */
function AbilityScores({ creature }: { creature: Creature }) {
  const saveFor = (a: Ability): number =>
    creature.saves?.[a] ?? abilityMod(creature.abilities[a])
  return (
    <div className="flex gap-3 text-sm">
      {ABILITY_GROUPS.map((group, i) => (
        <table key={i}>
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="w-7" />
              <th />
              <th className="px-1 text-right font-medium">Mod</th>
              <th className="px-1 text-right font-medium">Save</th>
            </tr>
          </thead>
          <tbody>
            {group.map((a) => (
              <tr key={a} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
                <td className="rounded-l px-1.5 py-1 font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {ABILITY_LABEL[a]}
                </td>
                <td className="px-1 py-1 text-right tabular-nums">{creature.abilities[a]}</td>
                <td className="px-1 py-1 text-right tabular-nums">
                  {signed(abilityMod(creature.abilities[a]))}
                </td>
                <td className="rounded-r px-1.5 py-1 text-right tabular-nums">{signed(saveFor(a))}</td>
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
    <div>
      <h4 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Skills</h4>
      <table className="text-sm">
        <tbody>
          {entries.map(([skill, bonus]) => (
            <tr key={skill} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
              <td className="px-2 py-0.5">{titleCase(skill)}</td>
              <td className="px-2 py-0.5 text-right tabular-nums">{signed(bonus as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
}: {
  creature: Creature
  /** Live hit points when shown in combat; absent in the reference compendium. */
  hp?: HitPoints
}) {
  const legendaryTitle = creature.legendaryActions
    ? `Legendary Actions (${creature.legendaryActions.perRound}/round)`
    : 'Legendary Actions'

  return (
    <div className="flex flex-1 flex-col space-y-4">
      {/* Sticky header: name + type on the left, speeds on the right. */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white pb-2 pt-1 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <div>
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
          <div className="pt-0.5">
            <SpeedIcons speed={creature.speed} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
        <AbilityScores creature={creature} />
        <div className="flex flex-col gap-3">
          <HpPanel
            current={hp ? hp.current : creature.maxHp}
            max={hp ? hp.max : creature.maxHp}
            temp={hp ? hp.temp : 0}
            live={hp != null}
          />
          <div className="flex gap-3">
            <ShieldStat value={creature.ac} />
            {creature.initiative != null && (
              <StatBadge label="Init" value={signed(creature.initiative)} />
            )}
          </div>
        </div>
      </div>

      {creature.skills && <SkillsTable skills={creature.skills} />}

      <div className="space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <MetaRow label="Resistances" value={creature.resistances?.join(', ')} />
        <MetaRow label="Damage Immunities" value={creature.immunities?.join(', ')} />
        <MetaRow label="Vulnerabilities" value={creature.vulnerabilities?.join(', ')} />
        <MetaRow label="Condition Immunities" value={creature.conditionImmunities?.join(', ')} />
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
