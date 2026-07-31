// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { Fragment, useState } from 'react'
import type { Action, SaveOutcome } from '../schema/action.ts'
import type { Combatant, MonsterCombatant } from '../schema/combatant.ts'
import type { ConditionName, EffectDuration } from '../schema/effect.ts'
import type { Ability, DamageType } from '../schema/primitives.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import type { CritRule, DieGroup, RollResult } from '../dice/roll.ts'
import { d20Group, keptFlags, roll } from '../dice/roll.ts'
import { useCampaignRules } from '../state/campaignRules.ts'
import { describeApplied, rollWithEffects, type AppliedEffect } from '../combat/effectroll.ts'
import { meleeHitAutoCrits } from '../combat/conditionrules.ts'
import {
  applyDamage,
  legendaryResistanceLeft,
  spendLegendaryResistance,
} from '../combat/resources.ts'
import { adjustForDefense, damageRelation, relationLabel } from '../combat/damage.ts'
import { acOf, nameOf } from '../combat/combatant.ts'
import { signed, titleCase } from '../compendium/format.ts'
import { parseNonNegativeInt as toNum } from '../lib/form.ts'
import {
  evasionApplies,
  hasMagicResistance,
  rollSave,
  saveDamageFor,
  type SaveResult,
} from '../combat/masssave.ts'
import { DAMAGE_TYPES } from './customMonster.ts'
import { condition } from '../combat/effects.ts'
import { spellEffectFor } from '../combat/spellEffects.ts'
import {
  applyConcentrationResult,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../combat/concentration.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { Modal } from './Modal.tsx'
import { TargetChips } from './TargetChips.tsx'
import { Button, Chip, Field, Select } from './ui.tsx'
import type { OnRoll } from './GameLog.tsx'
import { track, EVENTS } from '../lib/analytics.ts'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** A rolled damage component before defenses are applied. */
interface RolledDamage {
  type: DamageType
  amount: number
  result: RollResult
}

/** Roll each of the action's damage formulas (crit-aware); a negative total clamps to 0. */
function rollDamageComponents(action: Action, crit: boolean | CritRule): RolledDamage[] {
  return (action.damage ?? []).map((d) => {
    const result = roll(d.formula, { kind: 'damage', crit })
    return { type: d.type, amount: Math.max(0, result.total), result }
  })
}

/** Logs one roll-log entry per damage type; the actor prefix is dropped for a casterless cast. */
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
   *  where the GM supplies the spell attack bonus / save DC instead. */
  attacker?: MonsterCombatant
  action: Action
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Called when the action is actually rolled — spends a recharge ability. */
  onUse?: () => void
  /** Pre-check the "Magical Effect" toggle (a spell is always a magical effect). */
  defaultMagical?: boolean
  /** The spell being cast, when this resolver is driving a spell — lets a save spell
   *  with a modelled board effect (Bane, Faerie Fire) offer to apply it on a failure. */
  spell?: Spell
  onClose: () => void
}

/**
 * Resolve a creature's action against the board. Attacks pick one target, roll
 * to-hit, then editable damage to apply. Save / area actions pick any
 * number of targets, resolve each save (monsters auto-roll; the GM records a PC's
 * own roll), and apply per-target damage. Monster resistances/immunities are
 * applied automatically; a PC's are the GM's to enter. Damage is never applied
 * without a press, and conditions can be applied to the affected targets.
 */
export function ActionResolver(props: ResolverProps) {
  return props.action.toHit != null ? <AttackResolver {...props} /> : <SaveResolver {...props} />
}

/**
 * The standalone "Group save" — the same save modal with no preset action: the GM
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

/** The modal's subtitle: to-hit or save DC, reach/range in feet, and the damage dice. */
function metaLine(action: Action): string {
  const bits: string[] = []
  if (action.toHit != null) bits.push(`${signed(action.toHit)} to hit`)
  if (action.save) {
    bits.push(
      `${action.save.ability.toUpperCase()} save DC ${action.save.dc} (${action.save.onSave})`,
    )
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
function DamagePill({
  type,
  amount,
  label,
}: {
  type: DamageType
  amount: number
  label?: string | null
}) {
  const tone =
    DAMAGE_TONE[type] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {amount} {type}
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
 */
export function ConditionChips({
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
        {QUICK_CONDITIONS.map((c) => (
          <Chip key={c} onClick={() => onApply(c, toDuration(choice))}>
            {c}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/** All combatants the attacker can target: everyone except itself and the dead. */
function targetsFor(attacker: MonsterCombatant, combatants: Combatant[]): Combatant[] {
  return combatants.filter((c) => c.combatantId !== attacker.combatantId && c.status !== 'dead')
}

/** The attack branch: pick one target, roll to-hit with effects, then apply editable damage. */
function AttackResolver({
  attacker,
  action,
  combatants,
  dispatch,
  onRoll,
  onUse,
  onClose,
}: ResolverProps) {
  const { crit: critRule } = useCampaignRules()
  const targets = attacker
    ? targetsFor(attacker, combatants)
    : combatants.filter((c) => c.status !== 'dead')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(targets.length === 1 ? [targets[0].combatantId] : []),
  )
  // Casterless cast: the GM supplies the spell attack bonus (the spell doesn't own
  // it, the caster does). With an attacker, the action already carries its to-hit.
  const [bonus, setBonus] = useState(String(action.toHit ?? 0))
  const [attack, setAttack] = useState<{
    result: RollResult
    applied: AppliedEffect[]
    target: Combatant
    d20: DieGroup | undefined
    damage: { type: DamageType; amount: number; label: string | null }[]
    /** Effective crit — a natural 20, or a melee hit on a Paralyzed/Unconscious target. */
    crit: boolean
    /** True when the crit came from the helpless-target rule, not a natural 20. */
    autoCrit: boolean
  } | null>(null)
  const [damage, setDamage] = useState('')
  const [adv, setAdv] = useState<'normal' | 'advantage' | 'disadvantage'>('normal')
  const [conc, setConc] = useState<{ dc: number; damage: number } | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const target = targets.find((t) => selected.has(t.combatantId)) ?? null
  const title = attacker ? `${nameOf(attacker)} · ${action.name}` : `Cast ${action.name}`

  /** Roll the effect-aware attack, decide hit/crit, pre-roll damage, and log one merged entry. */
  const doRoll = () => {
    if (!target) return
    track(EVENTS.attackRolled)
    const range = action.kind === 'ranged' ? 'ranged' : 'melee'
    const toHit = attacker ? (action.toHit ?? 0) : toNum(bonus)
    const rolled = rollWithEffects(`1d20${signed(toHit)}`, {
      roller: attacker,
      target,
      kind: 'attack',
      range,
      advantage: adv,
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
    const d20 = d20Group(result)
    const hits = result.crit || (!result.fumble && result.total >= acOf(target))
    // A melee hit on a Paralyzed/Unconscious creature is an automatic critical hit.
    const autoCrit = hits && action.kind === 'melee' && meleeHitAutoCrits(target)
    const crit = result.crit || autoCrit
    const components = rollDamageComponents(action, crit ? critRule : false)
    const dmg = damageAgainst(target, components)
    setAttack({ result, applied, target, d20, damage: dmg, crit, autoCrit })
    setDamage(String(dmg.reduce((s, d) => s + d.amount, 0)))
    setConc(null)
    setNote(null)
    // One merged entry per attack: the to-hit roll, the outcome, and the rolled
    // damage per type (omitted on a miss). The applied HP change is logged
    // separately by the reducer when the GM presses Apply.
    dispatch({
      type: 'log',
      entry: {
        category: 'roll',
        message: `${attacker ? `${nameOf(attacker)}: ` : ''}${action.name} → ${nameOf(target)}`,
        result,
        applied,
        sourceId: attacker?.combatantId,
        outcome: crit ? 'crit' : hits ? 'hit' : 'miss',
        damage: hits ? dmg.map((d) => ({ type: d.type, amount: d.amount })) : undefined,
      },
    })
    onUse?.()
  }

  const hit = attack
    ? attack.result.crit || (!attack.result.fumble && attack.result.total >= acOf(attack.target))
    : false

  /** Apply the edited damage to the target, then prompt a concentration check or close. */
  const apply = () => {
    if (!attack) return
    const amount = toNum(damage)
    const tgt = attack.target
    // A crit deals two death-save failures to a downed PC (applyDamage reads this).
    const opts = { crit: attack.crit }
    const dc = concentrationPromptDC(tgt, applyDamage(tgt, amount, opts), amount)
    dispatch({ type: 'update', id: tgt.combatantId, update: (c) => applyDamage(c, amount, opts) })
    if (attacker) dispatch({ type: 'recordDamage', sourceId: attacker.combatantId, amount })
    if (dc != null) setConc({ dc, damage: amount })
    else onClose()
  }

  /** Add the chosen condition to the attack's target, keyed to the attacker as source. */
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
            dispatch({ type: 'endConcentration', id: tgt.combatantId })
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
          <Field
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            inputMode="numeric"
            aria-label="Spell attack bonus"
            className="w-20"
          />
        </label>
      )}

      <fieldset className="mb-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Roll
        </legend>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm dark:border-slate-700">
          {(['normal', 'advantage', 'disadvantage'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAdv(mode)}
              className={`px-3 py-1 capitalize ${
                adv === mode
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Advantage' : 'Disadvantage'}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Combines with any advantage/disadvantage from effects (one of each cancels).
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        {attack ? (
          <Chip size="sm" onClick={doRoll}>
            Reroll
          </Chip>
        ) : (
          <Button variant="primary" onClick={doRoll} disabled={!target}>
            Roll attack
          </Button>
        )}
        {attack?.d20 && (
          <NaturalRoll
            group={attack.d20}
            total={attack.result.total}
            tone={attack.crit ? 'crit' : attack.result.fumble ? 'fumble' : 'normal'}
          />
        )}
        {attack && (
          <span className="text-sm">
            vs AC {acOf(attack.target)} ·{' '}
            <span
              className={
                hit
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-rose-600 dark:text-rose-400'
              }
            >
              {attack.crit
                ? 'Critical hit!'
                : attack.result.fumble
                  ? 'Critical miss!'
                  : hit
                    ? 'Hit'
                    : 'Miss'}
            </span>
            {attack.autoCrit && (
              <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                (auto-crit — {attack.target.status === 'unconscious' ? 'Unconscious' : 'Paralyzed'}{' '}
                target)
              </span>
            )}
          </span>
        )}
      </div>

      {attack && attack.applied.length > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {attack.applied.map(describeApplied).join(' · ')}
        </p>
      )}

      {attack && (action.damage?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attack.damage.map((d, i) => (
              <DamagePill key={i} type={d.type} amount={d.amount} label={d.label} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">
              Damage
              <Field
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                inputMode="numeric"
                aria-label="Damage to apply"
                className="ml-2 w-20"
              />
            </label>
            <Button
              variant="danger"
              onClick={apply}
              className={hit ? undefined : 'opacity-40 transition-opacity hover:opacity-100'}
            >
              Apply to {nameOf(attack.target)}
            </Button>
          </div>
          {!hit && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Missed — adjust or apply only if you intend to.
            </p>
          )}
        </div>
      )}

      {attack && (
        <>
          <ConditionChips
            onApply={applyCondition}
            sourceName={attacker ? nameOf(attacker) : undefined}
          />
          {note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{note}</p>}
        </>
      )}
    </Modal>
  )
}

interface SaveRow {
  result?: SaveResult
  total?: number
  /** The d20 group of an auto-rolled save, so both dice show under advantage. */
  d20?: DieGroup
  /** GM-edited damage; falls back to the computed default. */
  edited?: string
}

/** Multi-target save / area-damage resolution; with no action it is the standalone Group save. */
export function SaveResolver({
  attacker,
  action,
  combatants,
  dispatch,
  onRoll,
  onUse,
  defaultMagical,
  spell,
  onClose,
}: {
  attacker?: MonsterCombatant
  action?: Action
  combatants: Combatant[]
  dispatch: (a: EncounterAction) => void
  onRoll: OnRoll
  onUse?: () => void
  defaultMagical?: boolean
  spell?: Spell
  onClose: () => void
}) {
  const save = action?.save ?? null
  // An action with damage but no save deals automatic area damage — no save roll.
  const noSave = !!action && !save && (action.damage?.length ?? 0) > 0
  // A standalone group save (no action) targets everyone and lets the GM type
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
  // (a formula like "2d6" is rolled; a bare number is taken flat), under the type
  // the GM picked so the targets' defenses can apply to it.
  const [genericBase, setGenericBase] = useState(0)
  const [damageType, setDamageType] = useState<DamageType | ''>('')
  const [magical, setMagical] = useState(defaultMagical ?? false)
  const [rows, setRows] = useState<Record<string, SaveRow>>({})
  const [area, setArea] = useState<RolledDamage[]>([])
  const [resolved, setResolved] = useState(false)
  const [pending, setPending] = useState<{ combatant: Combatant; dc: number; damage: number }[]>([])
  const [note, setNote] = useState<string | null>(null)

  const title = action
    ? attacker
      ? `${nameOf(attacker)} · ${action.name}`
      : action.name
    : 'Group save'
  const selectedTargets = targets.filter((t) => selected.has(t.combatantId))

  /** Toggle a target in the selection. */
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Per-target damage after the save rule and the target's own defenses. With an
  // action, damage is the rolled (typed) components; for a standalone group save
  // it's the single number the GM typed, under the type they picked.
  const defaultDamage = (target: Combatant, result?: SaveResult): number => {
    if (!result) return 0
    // Evasion (Dex, half-on-success): nothing on a success, half on a failure.
    const evasion = evasionApplies(target, ability, onSave)
    if (area.length > 0) {
      return area.reduce(
        (sum, comp) => sum + saveDamageFor(target, comp.amount, result, onSave, evasion, comp.type),
        0,
      )
    }
    return saveDamageFor(target, genericBase, result, onSave, evasion, damageType || undefined)
  }

  /** Resist/immune/vuln tags for a row — one per typed damage component in play. */
  const defenseLabels = (target: Combatant): string[] => {
    const components = area.length > 0 ? area : damageType ? [{ type: damageType }] : []
    return components
      .map((c) => relationLabel(damageRelation(target, c.type)))
      .filter((label): label is string => label != null)
  }

  /** The damage input's value: the GM's edit, else the computed default for the row's result. */
  const damageValue = (target: Combatant): string => {
    const row = rows[target.combatantId]
    return row?.edited ?? String(defaultDamage(target, row?.result))
  }

  /** Roll one creature's save against the current DC and log it. Never called for a PC. */
  const rollOne = (c: Combatant): SaveRow => {
    const saveRoll = rollSave(
      c,
      { ability, dc: toNum(dc) || 10, onSave },
      { magicResistance: magical && hasMagicResistance(c) },
    )
    onRoll(`${nameOf(c)}: ${ability.toUpperCase()} save`, saveRoll.roll, saveRoll.applied)
    return {
      result: saveRoll.result,
      total: saveRoll.total,
      d20: d20Group(saveRoll.roll),
    }
  }

  /**
   * Reroll one creature's save. Per creature rather than for the group: the damage
   * is one roll the whole area shares, and rerolling everyone would undo results the
   * GM has already settled.
   */
  const reroll = (c: Combatant) => {
    const row = rollOne(c)
    setRows((prev) => ({ ...prev, [c.combatantId]: row }))
  }

  /** Roll damage once and each monster's save; PC rows wait on the GM; no-save rows auto-fail. */
  const rollSaves = () => {
    track(action ? EVENTS.saveRolled : EVENTS.groupSaveRolled)
    if (action) {
      const components = rollDamageComponents(action, false)
      setArea(components)
      if (attacker) logDamage(components, attacker, action, onRoll)
    } else {
      // Standalone group save: roll the damage formula (or take a bare number flat).
      const entry = baseDamage.trim()
      if (/d/i.test(entry)) {
        const r = roll(entry, { kind: 'damage' })
        onRoll(`Group save: ${damageType ? `${damageType} ` : ''}damage`, r)
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
        next[c.combatantId] = rollOne(c)
      }
    }
    setRows(next)
    setResolved(true)
    onUse?.()
  }

  /** Record a row's save/fail and drop the GM's damage edit so the default recomputes. */
  const setResult = (id: string, result: SaveResult) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result, edited: undefined } }))

  /** Store the GM's damage override for the row. */
  const setEdited = (id: string, edited: string) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], edited } }))

  /** Apply each resolved row's damage, then queue concentration prompts or close. */
  const apply = () => {
    const prompts: { combatant: Combatant; dc: number; damage: number }[] = []
    for (const c of selectedTargets) {
      const row = rows[c.combatantId]
      if (!row?.result) continue
      const amount = toNum(damageValue(c))
      const promptDc = concentrationPromptDC(c, applyDamage(c, amount), amount)
      if (promptDc != null) prompts.push({ combatant: c, dc: promptDc, damage: amount })
      dispatch({ type: 'update', id: c.combatantId, update: (cc) => applyDamage(cc, amount) })
      if (attacker) dispatch({ type: 'recordDamage', sourceId: attacker.combatantId, amount })
    }
    if (prompts.length > 0) setPending(prompts)
    else onClose()
  }

  // Targets the effect lands on: those that failed (post-roll) or all selected (pre-roll).
  const affectedTargets = (): Combatant[] =>
    resolved
      ? selectedTargets.filter((c) => rows[c.combatantId]?.result === 'fail')
      : selectedTargets

  /** Add the chosen condition to every affected target. */
  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    const affected = affectedTargets()
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

  // A save spell with a modelled non-condition effect (Bane's −1d4, Faerie Fire's
  // advantage-against) offers to apply it to the failed targets — the resolver's
  // condition chips can't express these.
  const spellEffect = spell ? spellEffectFor(spell) : null
  /** Apply the spell's modelled effect to each affected target, with this save as its escape. */
  const applySpellEffect = () => {
    if (!spellEffect || !spell) return
    const affected = affectedTargets()
    if (affected.length === 0) return
    // Hand the resolver's save to the builder so a save-ends debuff carries the
    // escape save the GM just rolled against.
    const escape = { ability, dc: toNum(dc) || 10 }
    for (const c of affected) {
      const effects = spellEffect.build({
        source: attacker?.combatantId,
        spell,
        target: c,
        save: escape,
      })
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => ({ ...cc, effects: [...cc.effects, ...effects] }),
      })
    }
    setNote(`${spell.name} → ${affected.map(nameOf).join(', ')}`)
  }

  /** Clear one pending concentration prompt (optionally breaking it); close when none remain. */
  const resolveConc = (combatantId: string, broke = false) => {
    if (broke) dispatch({ type: 'endConcentration', id: combatantId })
    setPending((prev) => {
      const next = prev.filter((p) => p.combatant.combatantId !== combatantId)
      if (next.length === 0) onClose()
      return next
    })
  }

  if (pending.length > 0) {
    return (
      <Modal title={title} subtitle="Concentration checks" onClose={onClose}>
        <ul className="space-y-2">
          {pending.map((p) => (
            <li
              key={p.combatant.combatantId}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-sm font-medium">{nameOf(p.combatant)}</span>
              <ConcentrationPrompt
                dc={p.dc}
                canRoll={!p.combatant.isPC}
                onMaintain={() => resolveConc(p.combatant.combatantId)}
                onBreak={() => resolveConc(p.combatant.combatantId, true)}
                onRoll={
                  p.combatant.isPC
                    ? undefined
                    : () => {
                        const check = rollConcentrationCheck(p.combatant, p.damage)
                        onRoll(`${nameOf(p.combatant)}: concentration`, check.roll, check.applied)
                        resolveConc(p.combatant.combatantId, !check.maintained)
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
    <Modal title={title} subtitle={action ? metaLine(action) : undefined} onClose={onClose}>
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
              <Select
                value={ability}
                onChange={(e) => setAbility(e.target.value as Ability)}
                aria-label="Save ability"
                className="uppercase"
              >
                {ABILITIES.map((a) => (
                  <option key={a} value={a}>
                    {a.toUpperCase()}
                  </option>
                ))}
              </Select>
            )}
            <label className="flex items-center gap-1">
              DC
              <Field
                value={dc}
                onChange={(e) => setDc(e.target.value)}
                aria-label="Save DC"
                inputMode="numeric"
                className="w-14"
              />
            </label>
            <Select
              value={onSave}
              onChange={(e) => setOnSave(e.target.value as SaveOutcome)}
              aria-label="On save"
            >
              <option value="half">save → half damage</option>
              <option value="none">save → no damage</option>
              <option value="negates">save → negates effect</option>
            </Select>
            {!action && (
              <>
                <label className="flex items-center gap-1">
                  Damage
                  <Field
                    value={baseDamage}
                    onChange={(e) => setBaseDamage(e.target.value)}
                    aria-label="Damage"
                    placeholder="2d6 or 3"
                    className="w-24"
                  />
                </label>
                <DamageTypeSelect value={damageType} onChange={setDamageType} />
              </>
            )}
            {targets.some(hasMagicResistance) && (
              <label
                className="flex items-center gap-1"
                title="Magic Resistance grants advantage on saves against spells and other magical effects"
              >
                <input
                  type="checkbox"
                  checked={magical}
                  onChange={(e) => setMagical(e.target.checked)}
                />
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
        <Button variant="primary" onClick={rollSaves} disabled={selectedTargets.length === 0}>
          {noSave ? 'Roll damage' : 'Roll saves'}
        </Button>
      ) : (
        <>
          <ul className="space-y-1.5">
            {selectedTargets.map((c) => {
              const row = rows[c.combatantId]
              const defenses = defenseLabels(c)
              return (
                <li
                  key={c.combatantId}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{nameOf(c)}</span>
                    {row?.d20 && <NaturalRoll group={row.d20} total={row.total} />}
                    {!noSave && (
                      <>
                        <Chip
                          size="sm"
                          tone="good"
                          active={row?.result === 'save'}
                          onClick={() => setResult(c.combatantId, 'save')}
                        >
                          Save
                        </Chip>
                        <Chip
                          size="sm"
                          tone="bad"
                          active={row?.result === 'fail'}
                          onClick={() => setResult(c.combatantId, 'fail')}
                        >
                          Fail
                        </Chip>
                        {!c.isPC && row?.result === 'fail' && legendaryResistanceLeft(c) > 0 && (
                          <Chip
                            size="sm"
                            tone="warn"
                            active
                            title="Legendary Resistance: turn this failed save into a success"
                            onClick={() => {
                              setResult(c.combatantId, 'save')
                              dispatch({
                                type: 'update',
                                id: c.combatantId,
                                update: (cc) => (cc.isPC ? cc : spendLegendaryResistance(cc)),
                              })
                            }}
                          >
                            Use LR ({legendaryResistanceLeft(c)})
                          </Chip>
                        )}
                        {!c.isPC && (
                          <Chip size="sm" onClick={() => reroll(c)}>
                            Reroll
                          </Chip>
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
                    {defenses.map((label, i) => (
                      <span key={i} className="text-[11px] text-slate-400 dark:text-slate-500">
                        {label}
                      </span>
                    ))}
                    <Field
                      value={damageValue(c)}
                      onChange={(e) => setEdited(c.combatantId, e.target.value)}
                      inputMode="numeric"
                      aria-label={`Damage to ${nameOf(c)}`}
                      disabled={!row?.result}
                      className="w-16 disabled:opacity-50"
                    />
                  </span>
                </li>
              )
            })}
          </ul>

          <Button variant="danger" onClick={apply} className="mt-3">
            Apply damage
          </Button>

          {spellEffect && (
            <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50/50 p-2 dark:border-indigo-900/60 dark:bg-indigo-900/10">
              <Button variant="primary" onClick={applySpellEffect}>
                Apply {spell!.name}
                {resolved ? ' to failed' : ''}
              </Button>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                {spellEffect.summary}
              </span>
            </div>
          )}

          <ConditionChips
            onApply={applyCondition}
            sourceName={attacker ? nameOf(attacker) : undefined}
          />
          {note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{note}</p>}
        </>
      )}
    </Modal>
  )
}
