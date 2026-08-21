// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Combatant } from '../../schema/combatant.ts'
import type { ConditionName, EffectDuration } from '../../schema/effect.ts'
import type { DamageType } from '../../schema/primitives.ts'
import { spendEffects } from '../../state/encounter.ts'
import type { DieGroup, RollResult } from '../../dice/roll.ts'
import { d20Group } from '../../dice/roll.ts'
import { useCampaignEdition, useCampaignRules } from '../../state/campaignRules.ts'
import { describeApplied, rollWithEffects, type AppliedEffect } from '../../combat/effectroll.ts'
import { meleeHitAutoCrits } from '../../combat/conditionrules.ts'
import { applyDamage } from '../../combat/resources.ts'
import { attackHits, damageAgainst, rollDamageComponents } from '../../combat/damage.ts'
import { acOf, nameOf, targetsFor } from '../../combat/combatant.ts'
import { signed } from '../../compendium/format.ts'
import { parseNonNegativeInt as toNum } from '../../lib/form.ts'
import { condition } from '../../combat/effects.ts'
import { EXHAUSTION_MAX, exhaustionLevel } from '../../combat/exhaustion.ts'
import { delayedDamageEffect, spellEffectFor } from '../../combat/spellEffects.ts'
import {
  applyConcentrationResult,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../../combat/concentration.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { Modal } from '../ui/Modal.tsx'
import { TargetChips } from './TargetChips.tsx'
import { ConditionChips, DamagePill, NaturalRoll } from './rollPieces.tsx'
import {
  conditionsOn,
  isCondition,
  metaLine,
  usePendingLog,
  type ResolverProps,
} from './resolverShared.ts'
import { Button, Chip, Field } from '../ui/primitives.tsx'
import { track, EVENTS } from '../../lib/analytics.ts'

/** The attack branch: pick one target, roll to-hit with effects, then apply editable damage. */
export function AttackResolver({
  attacker,
  action,
  combatants,
  dispatch,
  onRoll,
  onUse,
  spell,
  casterId,
  onResolved,
  onClose,
}: ResolverProps) {
  const { crit: critRule } = useCampaignRules()
  const edition = useCampaignEdition()
  const targets = attacker
    ? targetsFor(attacker, combatants)
    : combatants.filter((c) => c.status !== 'dead')
  const { pending, flush } = usePendingLog(dispatch)
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
    damage: { type: DamageType; amount: number; label: string | null; result: RollResult }[]
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
  // Who is behind this: the attacker when a creature rolls its own action, and the named
  // caster when a player casts and rolls their own dice — a player is never the
  // `attacker` here, but the fight still has them cast it, and what they leave behind
  // has to be sourced to them or ending their concentration would strand it.
  const caster = attacker ?? combatants.find((c) => c.combatantId === casterId)
  const sourceId = caster?.combatantId
  const title = caster ? `${nameOf(caster)} · ${action.name}` : `Cast ${action.name}`

  // Reporting whether the attack landed, once and once only — the same deferral the
  // save branch makes, so a reroll decides the answer rather than the first swing.
  // Read through refs so a caller's inline arrow can't re-fire the unmount path.
  const attackRef = useRef(attack)
  attackRef.current = attack
  const reportedRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved
  const reportResolved = useCallback(() => {
    const settled = attackRef.current
    if (reportedRef.current || !settled) return
    reportedRef.current = true
    onResolvedRef.current?.(attackHits(settled.result, settled.target))
  }, [])
  useEffect(() => () => reportResolved(), [reportResolved])

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
    // Persist any effect this roll spent (e.g. "disadvantage on its next attack"),
    // from either side of it.
    spendEffects(dispatch, attacker, rolled.roller)
    spendEffects(dispatch, target, rolled.target)
    const d20 = d20Group(result)
    const hits = attackHits(result, target)
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
    // damage per type (omitted on a miss). Held under a fixed key so a reroll
    // overwrites it, and recorded when the modal closes. The applied HP change is
    // logged separately by the reducer when the GM presses Apply.
    pending.current.set('attack', {
      category: 'roll',
      message: `${attacker ? `${nameOf(attacker)}: ` : ''}${action.name} → ${nameOf(target)}`,
      result,
      applied,
      sourceId: attacker?.combatantId,
      outcome: crit ? 'crit' : hits ? 'hit' : 'miss',
      damage: hits
        ? dmg.map((d) => ({ type: d.type, amount: d.amount, result: d.result }))
        : undefined,
    })
    onUse?.()
  }

  const hit = attack ? attackHits(attack.result, attack.target) : false

  // A spell whose damage isn't all immediate (Acid Arrow) leaves the rest as a
  // reminder on what it hit, due at the end of that creature's next turn.
  const delayed = spell ? delayedDamageEffect(spell, attacker?.combatantId) : null

  /** Apply the edited damage to the target, then prompt a concentration check or close. */
  const apply = () => {
    if (!attack) return
    flush()
    reportResolved()
    const amount = toNum(damage)
    const tgt = attack.target
    if (delayed && hit) {
      dispatch({
        type: 'update',
        id: tgt.combatantId,
        update: (c) => ({
          ...c,
          effects: [...c.effects, { ...delayed, id: `${delayed.id}-${c.combatantId}` }],
        }),
      })
    }
    // A crit deals two death-save failures to a downed PC (applyDamage reads this).
    const opts = { crit: attack.crit }
    const dc = concentrationPromptDC(tgt, applyDamage(tgt, amount, opts), amount)
    dispatch({ type: 'update', id: tgt.combatantId, update: (c) => applyDamage(c, amount, opts) })
    if (attacker) dispatch({ type: 'recordDamage', sourceId: attacker.combatantId, amount })
    if (dc != null) setConc({ dc, damage: amount })
    else onClose()
  }

  /** Add the chosen condition to the attack's target, keyed to whoever acted as source. */
  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    if (!attack) return
    flush()
    dispatch({
      type: 'update',
      id: attack.target.combatantId,
      update: (c) => ({
        ...c,
        effects: [...c.effects, condition(name, { source: sourceId, duration })],
      }),
    })
    setNote(`${name} → ${nameOf(attack.target)}`)
  }

  // A spell resolved by an attack roll leaves its modelled effect too — Guiding Bolt's
  // advantage on the target, Flame Blade's reminder on the caster. Which of the two it
  // lands on is the entry's own `targeting`, so a self-spell never marks the creature
  // that was hit.
  const spellEffect = spell ? spellEffectFor(spell) : null
  const effectTarget =
    spellEffect?.targeting === 'enemy' ? (attack?.target ?? null) : (caster ?? null)

  /** Apply the spell's modelled effect to whoever it belongs on. */
  const applySpellEffect = () => {
    if (!spellEffect || !spell || !effectTarget) return
    flush()
    const effects = spellEffect.build({ source: sourceId, spell, target: effectTarget })
    dispatch({
      type: 'update',
      id: effectTarget.combatantId,
      update: (c) => ({ ...c, effects: [...c.effects, ...effects] }),
    })
    setNote(`${spell.name} → ${nameOf(effectTarget)}`)
  }

  /** Clear a condition off the target, so a lit chip is a toggle rather than a second copy. */
  const clearCondition = (name: ConditionName) => {
    if (!attack) return
    flush()
    dispatch({
      type: 'update',
      id: attack.target.combatantId,
      update: (c) => ({ ...c, effects: c.effects.filter((e) => !isCondition(e, name)) }),
    })
    setNote(`${name} cleared → ${nameOf(attack.target)}`)
  }

  /** Raise the target's Exhaustion by one — the rider a great many attacks carry. */
  const applyExhaustion = () => {
    if (!attack) return
    flush()
    const level = exhaustionLevel(attack.target.effects) + 1
    dispatch({ type: 'setExhaustion', id: attack.target.combatantId, level, edition })
    setNote(`Exhaustion ${Math.min(level, EXHAUSTION_MAX)} → ${nameOf(attack.target)}`)
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
                  spendEffects(dispatch, tgt, check.combatant)
                  onRoll(`${nameOf(tgt)}: concentration`, check.roll, {
                    applied: check.applied,
                    sourceId: tgt.combatantId,
                  })
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
              <DamagePill
                key={i}
                type={d.type}
                amount={d.amount}
                label={d.label}
                result={d.result}
              />
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

      {attack && spellEffect && effectTarget && (
        <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50/50 p-2 dark:border-indigo-900/60 dark:bg-indigo-900/10">
          <Button
            variant="primary"
            onClick={applySpellEffect}
            // A miss leaves nothing behind, but the GM decides that, exactly as they do
            // for the damage beside it.
            className={hit ? undefined : 'opacity-40 transition-opacity hover:opacity-100'}
          >
            Apply {spell!.name} to {nameOf(effectTarget)}
          </Button>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {spellEffect.summary}
          </span>
        </div>
      )}

      {attack && (
        <>
          <ConditionChips
            applied={conditionsOn(attack.target)}
            onRemove={clearCondition}
            onApply={applyCondition}
            onExhaustion={applyExhaustion}
            sourceName={caster ? nameOf(caster) : undefined}
          />
          {note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{note}</p>}
        </>
      )}
    </Modal>
  )
}
