// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Action, SaveOutcome } from '../schema/action.ts'
import type { Combatant, MonsterCombatant } from '../schema/combatant.ts'
import type { ConditionName, EffectDuration } from '../schema/effect.ts'
import type { Ability, DamageType } from '../schema/primitives.ts'
import type { EncounterAction } from '../state/encounter.ts'
import type { CritRule, RollResult } from '../dice/roll.ts'
import { roll } from '../dice/roll.ts'
import { useCampaignRules } from '../state/campaignRules.ts'
import { describeApplied, rollWithEffects, type AppliedEffect } from '../combat/effectroll.ts'
import { applyDamage, legendaryResistanceLeft, spendLegendaryResistance } from '../combat/resources.ts'
import { adjustForDefense, damageRelation, relationLabel } from '../combat/damage.ts'
import {
  damageForResult,
  evasionApplies,
  hasMagicResistance,
  rollSave,
  type SaveResult,
} from '../combat/masssave.ts'
import { condition } from '../combat/effects.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../combat/concentration.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { DieRoll, SPIN_MS } from './DieRoll.tsx'
import type { OnRoll } from './RollLog.tsx'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)
const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)
const acOf = (c: Combatant): number => (c.isPC ? c.ac : c.creature.ac)
const toNum = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/** A rolled damage component before defenses are applied. */
interface RolledDamage {
  type: DamageType
  amount: number
  result: RollResult
}

function rollDamageComponents(action: Action, crit: boolean | CritRule): RolledDamage[] {
  return (action.damage ?? []).map((d) => {
    const result = roll(d.formula, { kind: 'damage', crit })
    return { type: d.type, amount: Math.max(0, result.total), result }
  })
}

/** Log each rolled damage component (one entry per type) to the roll log. The
 *  actor prefix is dropped for a casterless cast. */
function logDamage(
  components: RolledDamage[],
  attacker: Combatant | undefined,
  action: Action,
  onRoll: OnRoll,
): void {
  const prefix = attacker ? `${attacker.isPC ? attacker.name : attacker.label}: ` : ''
  for (const c of components) {
    onRoll(`${prefix}${action.name} ${c.type} damage`, c.result)
  }
}

/** Per-type damage a target takes after resistance/immunity/vulnerability. */
function damageAgainst(
  target: Combatant,
  components: RolledDamage[],
): { type: DamageType; amount: number; label: string | null }[] {
  return components.map((c) => {
    const rel = damageRelation(target, c.type)
    return { type: c.type, amount: adjustForDefense(c.amount, rel), label: relationLabel(rel) }
  })
}

interface ResolverProps {
  /** The acting creature. Absent for a casterless cast (the "Cast spell" panel),
   *  where the DM supplies the spell attack bonus / save DC instead. */
  attacker?: MonsterCombatant
  action: Action
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Called when the action is actually rolled — spends a recharge ability. */
  onUse?: () => void
  /** Pre-check the "Magical Effect" toggle (a spell is always a magical effect). */
  defaultMagical?: boolean
  onClose: () => void
}

/**
 * Resolve a creature's action against the board. Attacks pick one target, roll
 * to-hit (animated), then editable damage to apply. Save / area actions pick any
 * number of targets, resolve each save (monsters auto-roll; the DM records a PC's
 * own roll), and apply per-target damage. Monster resistances/immunities are
 * applied automatically; a PC's are the DM's to enter. Damage is never applied
 * without a press, and conditions can be applied to the affected targets.
 */
export function ActionResolver(props: ResolverProps) {
  return props.action.toHit != null ? (
    <AttackResolver {...props} />
  ) : (
    <SaveResolver {...props} />
  )
}

/** An action with no to-hit and no save deals automatic area damage (e.g. the
 *  Lich's Deathly Teleport): targets just take the damage, no save roll. */

/**
 * The standalone "Group save" — the same save modal with no preset action: the DM
 * picks the ability, DC, on-save rule, targets, and a damage number.
 */
export function GroupSaveModal({
  combatants,
  dispatch,
  onRoll,
  onClose,
}: {
  combatants: Combatant[]
  dispatch: (a: EncounterAction) => void
  onRoll: OnRoll
  onClose: () => void
}) {
  return (
    <SaveResolver combatants={combatants} dispatch={dispatch} onRoll={onRoll} onClose={onClose} />
  )
}

// --- shared chrome ----------------------------------------------------------

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Wider modal for the multi-target group save, so each row fits on one line. */
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, true, onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-full w-full overflow-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Close
          </button>
        </div>
        {subtitle && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

function metaLine(action: Action): string {
  const bits: string[] = []
  if (action.toHit != null) bits.push(`${signed(action.toHit)} to hit`)
  if (action.save) {
    bits.push(`${action.save.ability.toUpperCase()} save DC ${action.save.dc} (${action.save.onSave})`)
  }
  if (action.reach) bits.push(`reach ${action.reach} ft.`)
  if (action.range) {
    bits.push(`range ${action.range.normal}${action.range.long ? `/${action.range.long}` : ''} ft.`)
  }
  const dmg = (action.damage ?? []).map((d) => `${d.formula} ${d.type}`).join(' + ')
  return [bits.join(' · '), dmg].filter(Boolean).join(' · ')
}

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

function DamagePill({
  type,
  amount,
  label,
}: {
  type: DamageType
  amount: number
  label?: string | null
}) {
  const tone = DAMAGE_TONE[type] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {amount} {type}
      {label ? <span className="opacity-70"> · {label}</span> : null}
    </span>
  )
}

// Applying damage is the irreversible step, so it's deliberately understated
// rather than a bright call-to-action.
const APPLY_BTN =
  'rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/50'

const chip =
  'rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
const chipActive =
  'rounded border border-indigo-500 bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'

function TargetChips({
  targets,
  selected,
  onToggle,
}: {
  targets: Combatant[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  if (targets.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No other combatants to target.</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {targets.map((t) => (
        <button
          key={t.combatantId}
          type="button"
          onClick={() => onToggle(t.combatantId)}
          className={selected.has(t.combatantId) ? chipActive : chip}
        >
          {nameOf(t)} <span className="opacity-60">AC {acOf(t)}</span>
        </button>
      ))}
    </div>
  )
}

const QUICK_CONDITIONS: ConditionName[] = [
  'Prone',
  'Grappled',
  'Restrained',
  'Poisoned',
  'Frightened',
  'Stunned',
  'Blinded',
  'Paralyzed',
]

type DurationChoice = 'manual' | 'untilSource' | 'r1' | 'r10'

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
 */
function ConditionChips({
  onApply,
  sourceName,
}: {
  onApply: (name: ConditionName, duration: EffectDuration) => void
  sourceName?: string
}) {
  const [choice, setChoice] = useState<DurationChoice>('manual')
  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Apply condition
        </p>
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value as DurationChoice)}
          aria-label="Condition duration"
          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="manual">until removed</option>
          {sourceName && <option value="untilSource">until {sourceName}’s next turn</option>}
          <option value="r1">1 round</option>
          <option value="r10">10 rounds</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CONDITIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onApply(c, toDuration(choice))}
            className="rounded border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

function targetsFor(attacker: MonsterCombatant, combatants: Combatant[]): Combatant[] {
  return combatants.filter((c) => c.combatantId !== attacker.combatantId && c.status !== 'dead')
}

// --- attacks: single target, animated to-hit -------------------------------

function AttackResolver({ attacker, action, combatants, dispatch, onRoll, onUse, onClose }: ResolverProps) {
  // On a crit, the campaign's crit rule governs how the damage dice are rolled.
  const { crit: critRule } = useCampaignRules()
  const targets = attacker
    ? targetsFor(attacker, combatants)
    : combatants.filter((c) => c.status !== 'dead')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(targets.length === 1 ? [targets[0].combatantId] : []),
  )
  // Casterless cast: the DM supplies the spell attack bonus (the spell doesn't own
  // it, the caster does). With an attacker, the action already carries its to-hit.
  const [bonus, setBonus] = useState(String(action.toHit ?? 0))
  const [spinKey, setSpinKey] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [attack, setAttack] = useState<{
    result: RollResult
    applied: AppliedEffect[]
    target: Combatant
    d20: number
    damage: { type: DamageType; amount: number; label: string | null }[]
  } | null>(null)
  const [damage, setDamage] = useState('')
  const [conc, setConc] = useState<{ dc: number; damage: number } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const target = targets.find((t) => selected.has(t.combatantId)) ?? null
  const title = attacker ? `${nameOf(attacker)} · ${action.name}` : `Cast ${action.name}`

  const doRoll = () => {
    if (!target) return
    const range = action.kind === 'ranged' ? 'ranged' : 'melee'
    const toHit = attacker ? (action.toHit ?? 0) : toNum(bonus)
    const rolled = rollWithEffects(`1d20${signed(toHit)}`, {
      roller: attacker,
      target,
      kind: 'attack',
      range,
    })
    const { result, applied } = rolled
    // Persist any consumeOnRoll effects that fired (e.g. "disadvantage on its
    // next attack") — rollWithEffects returns the combatant with them stripped.
    if (attacker && rolled.roller && rolled.roller !== attacker) {
      const effects = rolled.roller.effects
      dispatch({ type: 'update', id: attacker.combatantId, update: (c) => ({ ...c, effects }) })
    }
    if (rolled.target && rolled.target !== target) {
      const effects = rolled.target.effects
      dispatch({ type: 'update', id: target.combatantId, update: (c) => ({ ...c, effects }) })
    }
    const d20 = result.dice.find((g) => g.sides === 20)?.kept[0] ?? result.total
    const components = rollDamageComponents(action, result.crit ? critRule : false)
    const dmg = damageAgainst(target, components)
    setAttack({ result, applied, target, d20, damage: dmg })
    setDamage(String(dmg.reduce((s, d) => s + d.amount, 0)))
    setSpinKey((k) => k + 1)
    setRevealed(false)
    setConc(null)
    setNote(null)
    onRoll(
      `${attacker ? `${nameOf(attacker)}: ` : ''}${action.name} → ${nameOf(target)}`,
      result,
      applied,
    )
    logDamage(components, attacker, action, onRoll)
    onUse?.()
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => setRevealed(true),
      prefersReducedMotion() ? 0 : SPIN_MS + 60,
    )
  }

  const hit = attack
    ? attack.result.crit || (!attack.result.fumble && attack.result.total >= acOf(attack.target))
    : false

  const apply = () => {
    if (!attack) return
    const amount = toNum(damage)
    const tgt = attack.target
    const dc = concentrationPromptDC(tgt, applyDamage(tgt, amount), amount)
    dispatch({ type: 'update', id: tgt.combatantId, update: (c) => applyDamage(c, amount) })
    if (dc != null) setConc({ dc, damage: amount })
    else onClose()
  }

  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    if (!attack) return
    dispatch({
      type: 'update',
      id: attack.target.combatantId,
      update: (c) => ({
        ...c,
        effects: [...c.effects, condition(name, { source: attacker?.combatantId, duration })],
      }),
    })
    setNote(`${name} → ${nameOf(attack.target)}`)
  }

  if (conc && attack) {
    const tgt = attack.target
    return (
      <Modal title={title} onClose={onClose}>
        <p className="mb-2 text-sm">
          <span className="font-medium">{nameOf(tgt)}</span> took {conc.damage} damage while
          concentrating.
        </p>
        <ConcentrationPrompt
          dc={conc.dc}
          canRoll={!tgt.isPC}
          onMaintain={onClose}
          onBreak={() => {
            dispatch({ type: 'update', id: tgt.combatantId, update: breakConcentration })
            onClose()
          }}
          onRoll={
            tgt.isPC
              ? undefined
              : () => {
                  const check = rollConcentrationCheck(tgt, conc.damage)
                  onRoll(`${nameOf(tgt)}: concentration`, check.roll, check.applied)
                  dispatch({
                    type: 'update',
                    id: tgt.combatantId,
                    update: (c) => applyConcentrationResult(c, check.maintained),
                  })
                  onClose()
                }
          }
        />
      </Modal>
    )
  }

  return (
    <Modal title={title} subtitle={metaLine(action)} onClose={onClose}>
      <fieldset className="mb-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Target
        </legend>
        <TargetChips
          targets={targets}
          selected={selected}
          onToggle={(id) => setSelected(new Set([id]))}
        />
      </fieldset>

      {!attacker && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          Spell attack bonus
          <input
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            inputMode="numeric"
            aria-label="Spell attack bonus"
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={doRoll}
          disabled={!target}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {attack ? 'Reroll' : 'Roll attack'}
        </button>
        {attack && (
          <DieRoll
            value={attack.d20}
            spinKey={spinKey}
            tone={attack.result.crit ? 'crit' : attack.result.fumble ? 'fumble' : 'normal'}
          />
        )}
        {revealed && attack && (
          <span className="text-sm">
            <span className="font-bold tabular-nums">{attack.result.total}</span> vs AC{' '}
            {acOf(attack.target)} ·{' '}
            <span
              className={
                hit
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-rose-600 dark:text-rose-400'
              }
            >
              {attack.result.crit
                ? 'Critical hit!'
                : attack.result.fumble
                  ? 'Miss (nat 1)'
                  : hit
                    ? 'Hit'
                    : 'Miss'}
            </span>
          </span>
        )}
      </div>

      {revealed && attack && attack.applied.length > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {attack.applied.map(describeApplied).join(' · ')}
        </p>
      )}

      {revealed && attack && (action.damage?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attack.damage.map((d, i) => (
              <DamagePill key={i} type={d.type} amount={d.amount} label={d.label} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">
              Damage
              <input
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                inputMode="numeric"
                aria-label="Damage to apply"
                className="ml-2 w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={apply}
              className={`${APPLY_BTN}${hit ? '' : ' opacity-40 transition-opacity hover:opacity-100'}`}
            >
              Apply to {nameOf(attack.target)}
            </button>
          </div>
          {!hit && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Missed — adjust or apply only if you intend to.
            </p>
          )}
        </div>
      )}

      {revealed && attack && (
        <>
          <ConditionChips onApply={applyCondition} sourceName={attacker ? nameOf(attacker) : undefined} />
          {note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{note}</p>}
        </>
      )}
    </Modal>
  )
}

// --- save / area actions: any number of targets ----------------------------

interface SaveRow {
  result?: SaveResult
  total?: number
  /** The natural d20 of an auto-rolled save, for the die animation. */
  d20?: number
  /** DM-edited damage; falls back to the computed default. */
  edited?: string
}

export function SaveResolver({
  attacker,
  action,
  combatants,
  dispatch,
  onRoll,
  onUse,
  defaultMagical,
  onClose,
}: {
  attacker?: MonsterCombatant
  action?: Action
  combatants: Combatant[]
  dispatch: (a: EncounterAction) => void
  onRoll: OnRoll
  onUse?: () => void
  defaultMagical?: boolean
  onClose: () => void
}) {
  const save = action?.save ?? null
  // An action with damage but no save deals automatic area damage — no save roll.
  const noSave = !!action && !save && (action.damage?.length ?? 0) > 0
  // A standalone group save (no action) targets everyone and lets the DM type
  // the damage; an action's save excludes the attacker and rolls its damage.
  const targets = attacker
    ? targetsFor(attacker, combatants)
    : combatants.filter((c) => c.status !== 'dead')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ability, setAbility] = useState<Ability>(save?.ability ?? 'dex')
  const [onSave, setOnSave] = useState<SaveOutcome>(save?.onSave ?? 'half')
  const [dc, setDc] = useState(String(save?.dc ?? 15))
  const [baseDamage, setBaseDamage] = useState('')
  // The base damage for a standalone group save, rolled once when saves are rolled
  // (a formula like "2d6" is rolled; a bare number is taken flat).
  const [genericBase, setGenericBase] = useState(0)
  const [magical, setMagical] = useState(defaultMagical ?? false)
  const [rows, setRows] = useState<Record<string, SaveRow>>({})
  const [area, setArea] = useState<RolledDamage[]>([])
  const [resolved, setResolved] = useState(false)
  const [spinKey, setSpinKey] = useState(0)
  const [pending, setPending] = useState<{ combatant: Combatant; dc: number; damage: number }[]>([])
  const [note, setNote] = useState<string | null>(null)

  const title = action ? (attacker ? `${nameOf(attacker)} · ${action.name}` : action.name) : 'Group save'
  const selectedTargets = targets.filter((t) => selected.has(t.combatantId))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Per-target damage after the save rule and the target's own defenses. With an
  // action, damage is the rolled (typed) components; for a standalone group save
  // it's the single number the DM typed (no type, so no resistance applies).
  const defaultDamage = (target: Combatant, result?: SaveResult): number => {
    if (!result) return 0
    // Evasion (Dex, half-on-success): nothing on a success, half on a failure.
    const evasion = evasionApplies(target, ability, onSave)
    if (area.length > 0) {
      return area.reduce((sum, comp) => {
        const afterSave = damageForResult(comp.amount, result, onSave, evasion)
        return sum + adjustForDefense(afterSave, damageRelation(target, comp.type))
      }, 0)
    }
    return damageForResult(genericBase, result, onSave, evasion)
  }

  const damageValue = (target: Combatant): string => {
    const row = rows[target.combatantId]
    return row?.edited ?? String(defaultDamage(target, row?.result))
  }

  const rollSaves = () => {
    const request = { ability, dc: toNum(dc) || 10, onSave }
    if (action) {
      const components = rollDamageComponents(action, false)
      setArea(components)
      if (attacker) logDamage(components, attacker, action, onRoll)
    } else {
      // Standalone group save: roll the damage formula (or take a bare number flat).
      const entry = baseDamage.trim()
      if (/d/i.test(entry)) {
        const r = roll(entry, { kind: 'damage' })
        onRoll('Group save: damage', r)
        setGenericBase(Math.max(0, r.total))
      } else {
        setGenericBase(toNum(baseDamage))
      }
    }
    const next: Record<string, SaveRow> = {}
    for (const c of selectedTargets) {
      if (noSave) {
        next[c.combatantId] = { result: 'fail' } // no save — full damage to everyone
      } else if (c.isPC) {
        next[c.combatantId] = {} // the player rolls; recorded below
      } else {
        const saveRoll = rollSave(c, request, {
          magicResistance: magical && hasMagicResistance(c),
        })
        const d20 = saveRoll.roll.dice.find((g) => g.sides === 20)?.kept[0]
        next[c.combatantId] = { result: saveRoll.result, total: saveRoll.total, d20 }
        onRoll(`${nameOf(c)}: ${ability.toUpperCase()} save`, saveRoll.roll, saveRoll.applied)
      }
    }
    setRows(next)
    setSpinKey((k) => k + 1)
    setResolved(true)
    onUse?.()
  }

  const setResult = (id: string, result: SaveResult) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result, edited: undefined } }))

  const setEdited = (id: string, edited: string) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], edited } }))

  const apply = () => {
    const prompts: { combatant: Combatant; dc: number; damage: number }[] = []
    for (const c of selectedTargets) {
      const row = rows[c.combatantId]
      if (!row?.result) continue
      const amount = toNum(damageValue(c))
      const promptDc = concentrationPromptDC(c, applyDamage(c, amount), amount)
      if (promptDc != null) prompts.push({ combatant: c, dc: promptDc, damage: amount })
      dispatch({ type: 'update', id: c.combatantId, update: (cc) => applyDamage(cc, amount) })
    }
    if (prompts.length > 0) setPending(prompts)
    else onClose()
  }

  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    // Conditions land on the targets that failed (or all selected pre-roll).
    const affected = resolved
      ? selectedTargets.filter((c) => rows[c.combatantId]?.result === 'fail')
      : selectedTargets
    if (affected.length === 0) return
    for (const c of affected) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => ({
          ...cc,
          effects: [...cc.effects, condition(name, { source: attacker?.combatantId, duration })],
        }),
      })
    }
    setNote(`${name} → ${affected.map(nameOf).join(', ')}`)
  }

  const resolveConc = (combatantId: string, update?: (c: Combatant) => Combatant) => {
    if (update) dispatch({ type: 'update', id: combatantId, update })
    setPending((prev) => {
      const next = prev.filter((p) => p.combatant.combatantId !== combatantId)
      if (next.length === 0) onClose()
      return next
    })
  }

  if (pending.length > 0) {
    return (
      <Modal title={title} subtitle="Concentration checks" onClose={onClose} wide>
        <ul className="space-y-2">
          {pending.map((p) => (
            <li key={p.combatant.combatantId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{nameOf(p.combatant)}</span>
              <ConcentrationPrompt
                dc={p.dc}
                canRoll={!p.combatant.isPC}
                onMaintain={() => resolveConc(p.combatant.combatantId)}
                onBreak={() => resolveConc(p.combatant.combatantId, breakConcentration)}
                onRoll={
                  p.combatant.isPC
                    ? undefined
                    : () => {
                        const check = rollConcentrationCheck(p.combatant, p.damage)
                        onRoll(`${nameOf(p.combatant)}: concentration`, check.roll, check.applied)
                        resolveConc(p.combatant.combatantId, (c) =>
                          applyConcentrationResult(c, check.maintained),
                        )
                      }
                }
              />
            </li>
          ))}
        </ul>
      </Modal>
    )
  }

  return (
    <Modal title={title} subtitle={action ? metaLine(action) : undefined} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {noSave ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Automatic area damage — no save
          </span>
        ) : (
          <>
            {action ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {ability.toUpperCase()} save
              </span>
            ) : (
              <select
                value={ability}
                onChange={(e) => setAbility(e.target.value as Ability)}
                aria-label="Save ability"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm uppercase dark:border-slate-700 dark:bg-slate-900"
              >
                {ABILITIES.map((a) => (
                  <option key={a} value={a}>
                    {a.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1">
              DC
              <input
                value={dc}
                onChange={(e) => setDc(e.target.value)}
                aria-label="Save DC"
                inputMode="numeric"
                className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <select
              value={onSave}
              onChange={(e) => setOnSave(e.target.value as SaveOutcome)}
              aria-label="On save"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="half">save → half damage</option>
              <option value="none">save → no damage</option>
              <option value="negates">save → negates effect</option>
            </select>
            {!action && (
              <label className="flex items-center gap-1">
                Damage
                <input
                  value={baseDamage}
                  onChange={(e) => setBaseDamage(e.target.value)}
                  aria-label="Damage"
                  placeholder="2d6 or 3"
                  className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            )}
            {targets.some(hasMagicResistance) && (
              <label
                className="flex items-center gap-1"
                title="Magic Resistance grants advantage on saves against spells and other magical effects"
              >
                <input type="checkbox" checked={magical} onChange={(e) => setMagical(e.target.checked)} />
                Magical Effect
              </label>
            )}
          </>
        )}
      </div>

      <fieldset className="mb-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Targets
        </legend>
        <TargetChips targets={targets} selected={selected} onToggle={toggle} />
      </fieldset>

      {!resolved ? (
        <button
          type="button"
          onClick={rollSaves}
          disabled={selectedTargets.length === 0}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {noSave ? 'Roll damage' : 'Roll saves'}
        </button>
      ) : (
        <>
          <ul className="space-y-1.5">
            {selectedTargets.map((c) => {
              const row = rows[c.combatantId]
              const defenses = area.length
                ? damageAgainst(c, area).filter((d) => d.label)
                : []
              return (
                <li key={c.combatantId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{nameOf(c)}</span>
                    {row?.d20 != null && <DieRoll value={row.d20} spinKey={spinKey} />}
                    {row?.total != null && (
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">{row.total}</span>
                    )}
                    {!noSave && (
                      <>
                        <button
                          type="button"
                          onClick={() => setResult(c.combatantId, 'save')}
                          className={
                            row?.result === 'save'
                              ? 'rounded border border-emerald-400 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300'
                              : 'rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400'
                          }
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setResult(c.combatantId, 'fail')}
                          className={
                            row?.result === 'fail'
                              ? 'rounded border border-rose-400 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300'
                              : 'rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400'
                          }
                        >
                          Fail
                        </button>
                        {!c.isPC && row?.result === 'fail' && legendaryResistanceLeft(c) > 0 && (
                          <button
                            type="button"
                            title="Legendary Resistance: turn this failed save into a success"
                            onClick={() => {
                              setResult(c.combatantId, 'save')
                              dispatch({
                                type: 'update',
                                id: c.combatantId,
                                update: (cc) => (cc.isPC ? cc : spendLegendaryResistance(cc)),
                              })
                            }}
                            className="rounded border border-amber-400 px-1.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
                          >
                            Use LR ({legendaryResistanceLeft(c)})
                          </button>
                        )}
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {evasionApplies(c, ability, onSave) && (
                      <span
                        className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                        title="Evasion: no damage on a success, half on a failure"
                      >
                        Evasion
                      </span>
                    )}
                    {defenses.map((d, i) => (
                      <span key={i} className="text-[11px] text-slate-400 dark:text-slate-500">
                        {d.label}
                      </span>
                    ))}
                    <input
                      value={damageValue(c)}
                      onChange={(e) => setEdited(c.combatantId, e.target.value)}
                      inputMode="numeric"
                      aria-label={`Damage to ${nameOf(c)}`}
                      disabled={!row?.result}
                      className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </span>
                </li>
              )
            })}
          </ul>

          <button type="button" onClick={apply} className={`mt-3 ${APPLY_BTN}`}>
            Apply damage
          </button>

          <ConditionChips onApply={applyCondition} sourceName={attacker ? nameOf(attacker) : undefined} />
          {note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{note}</p>}
        </>
      )}
    </Modal>
  )
}
