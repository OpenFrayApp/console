// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { Fragment, useState } from 'react'
import type { ConditionName, EffectDuration } from '../../schema/effect.ts'
import { DAMAGE_TYPES, type DamageType } from '../../schema/primitives.ts'
import type { DieGroup, RollResult } from '../../dice/roll.ts'
import { keptFlags } from '../../dice/roll.ts'
import { describeRoll } from '../../dice/describe.ts'
import { titleCase } from '../../compendium/format.ts'
import { Chip, Select } from '../ui/primitives.tsx'

const DAMAGE_TONE: Partial<Record<DamageType, string>> = {
  fire: 'bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200',
  cold: 'bg-sky-200 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200',
  lightning: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-200',
  acid: 'bg-lime-200 text-lime-900 dark:bg-lime-900/60 dark:text-lime-200',
  poison: 'bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-200',
  necrotic: 'bg-purple-200 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200',
  psychic: 'bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
  radiant: 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
}

/**
 * What a d20 roll came to: the dice in brackets, an arrow, then the total the
 * modifiers made of it — `[5, 9] → 11`. With advantage or disadvantage both dice
 * show, the one that counted standing out from the one it dropped. A lone die stays
 * muted, since the total is the number being read.
 */
export function NaturalRoll({
  group,
  total,
  tone = 'normal',
}: {
  group: DieGroup
  /** The roll's total. Omitted where the caller shows it itself. */
  total?: number
  tone?: 'normal' | 'crit' | 'fumble'
}) {
  const keptClass =
    tone === 'crit'
      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
      : tone === 'fumble'
        ? 'font-semibold text-rose-600 dark:text-rose-400'
        : group.results.length > 1
          ? 'font-semibold text-slate-900 dark:text-slate-100'
          : undefined
  const kept = keptFlags(group)
  return (
    <span className="text-sm tabular-nums text-slate-400 dark:text-slate-500">
      [
      {group.results.map((value, i) => (
        // The separator sits outside the die so it stays punctuation — inside, it took
        // the colour of whichever die followed it.
        <Fragment key={i}>
          {i > 0 ? ', ' : ''}
          <span className={kept[i] ? keptClass : undefined}>{value}</span>
        </Fragment>
      ))}
      ]
      {total != null && (
        <>
          {' → '}
          <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span>
        </>
      )}
    </span>
  )
}

/** Colored pill for one damage component: amount, type, and any resist/immune/vuln note. */
export function DamagePill({
  type,
  amount,
  label,
  result,
}: {
  type: DamageType
  amount: number
  label?: string | null
  result?: RollResult
}) {
  const tone =
    DAMAGE_TONE[type] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  // The dice that made it, in the pill's own faint tone: damage that arrives as a bare
  // total is the one number in a fight nobody can check.
  const working = result ? describeRoll(result) : ''
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {amount} {type}
      {working ? <span className="opacity-70"> · {working}</span> : null}
      {label ? <span className="opacity-70"> · {label}</span> : null}
    </span>
  )
}

/**
 * Damage type for a number the GM types. An action's damage carries its own types;
 * this is what lets the group save apply resistances and immunities too. Untyped is
 * the default — the app never guesses a type the GM didn't give it.
 */
export function DamageTypeSelect({
  value,
  onChange,
}: {
  value: DamageType | ''
  onChange: (type: DamageType | '') => void
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as DamageType | '')}
      aria-label="Damage type"
    >
      <option value="">Untyped</option>
      {DAMAGE_TYPES.map((t) => (
        <option key={t} value={t}>
          {titleCase(t)}
        </option>
      ))}
    </Select>
  )
}

const QUICK_CONDITIONS: ConditionName[] = [
  'Prone',
  'Grappled',
  'Restrained',
  'Poisoned',
  'Frightened',
  'Incapacitated',
  'Stunned',
  'Blinded',
  'Paralyzed',
]

type DurationChoice = 'manual' | 'untilSource' | 'r1' | 'r10'

/** Turn a duration choice into its structured EffectDuration. */
function toDuration(choice: DurationChoice): EffectDuration {
  switch (choice) {
    case 'untilSource':
      return { type: 'untilSourceTurn' }
    case 'r1':
      return { type: 'rounds', rounds: 1 }
    case 'r10':
      return { type: 'rounds', rounds: 10 }
    default:
      return { type: 'manual' }
  }
}

/**
 * Apply a condition to the targets the action affected (one tap), with a chosen
 * duration. "Until {source}'s turn" (e.g. the Assassin's Poisoned-until-its-next-
 * turn) is offered when there's a source to key it to.
 *
 * Exhaustion sits apart from the chips because it is a level rather than a state: a
 * great many creatures cost a failed save one level, from the Troll's missing limbs
 * to a salt devil's scimitar, and the chip raises whatever the target already carries
 * by one. It takes no duration — a level lasts until the Game Master lowers it.
 */
export function ConditionChips({
  applied = [],
  onRemove,
  onApply,
  onExhaustion,
  sourceName,
}: {
  /** The conditions every affected target already carries, so a chip reads as a state. */
  applied?: ConditionName[]
  /** Clear a condition the chips show as applied. Absent leaves the chips apply-only. */
  onRemove?: (name: ConditionName) => void
  onApply: (name: ConditionName, duration: EffectDuration) => void
  /** Raise the affected targets' Exhaustion by one. Absent where there is none to raise. */
  onExhaustion?: () => void
  sourceName?: string
}) {
  const [choice, setChoice] = useState<DurationChoice>('manual')
  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Apply condition
        </p>
        <Select
          value={choice}
          onChange={(e) => setChoice(e.target.value as DurationChoice)}
          aria-label="Condition duration"
        >
          <option value="manual">until removed</option>
          {sourceName && <option value="untilSource">until {sourceName}’s next turn</option>}
          <option value="r1">1 round</option>
          <option value="r10">10 rounds</option>
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CONDITIONS.map((c) => {
          // A creature is Frightened or it is not — a second identical badge says nothing
          // the first did not. So the chip is the state, not an action: lit when the
          // target has the condition, and tapping a lit one clears it.
          const has = applied.includes(c)
          return (
            <Chip
              key={c}
              active={has}
              aria-pressed={onRemove ? has : undefined}
              title={has ? `Clear ${c}` : undefined}
              onClick={() =>
                has && onRemove ? onRemove(c) : !has && onApply(c, toDuration(choice))
              }
            >
              {c}
            </Chip>
          )
        })}
        {onExhaustion && (
          <Chip onClick={onExhaustion} title="Raises the level it already has; no duration">
            +1 Exhaustion
          </Chip>
        )}
      </div>
    </div>
  )
}
