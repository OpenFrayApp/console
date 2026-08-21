// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, SaveOutcome } from '../../schema/action.ts'
import type { Combatant, MonsterCombatant } from '../../schema/combatant.ts'
import type { ConditionName, EffectDuration } from '../../schema/effect.ts'
import { ABILITIES, type Ability, type DamageType } from '../../schema/primitives.ts'
import type { Spell } from '../../schema/spell.ts'
import { spendEffects, type EncounterAction } from '../../state/encounter.ts'
import type { DieGroup, RollResult } from '../../dice/roll.ts'
import { d20Group, roll } from '../../dice/roll.ts'
import { useCampaignEdition } from '../../state/campaignRules.ts'
import {
  applyDamage,
  legendaryResistanceLeft,
  spendLegendaryResistance,
} from '../../combat/resources.ts'
import {
  damageRelation,
  relationLabel,
  rollDamageComponents,
  type RolledDamage,
} from '../../combat/damage.ts'
import { nameOf, targetsFor } from '../../combat/combatant.ts'
import { parseNonNegativeInt as toNum } from '../../lib/form.ts'
import {
  evasionApplies,
  hasMagicResistance,
  rollSave,
  saveDamageFor,
  type SaveResult,
} from '../../combat/masssave.ts'
import { condition } from '../../combat/effects.ts'
import { exhaustionLevel } from '../../combat/exhaustion.ts'
import { delayedDamageEffect, spellEffectFor } from '../../combat/spellEffects.ts'
import { concentrationPromptDC, rollConcentrationCheck } from '../../combat/concentration.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { Modal } from '../ui/Modal.tsx'
import { TargetChips } from './TargetChips.tsx'
import { ConditionChips, DamagePill, DamageTypeSelect, NaturalRoll } from './rollPieces.tsx'
import {
  conditionsOn,
  damageEntries,
  isCondition,
  metaLine,
  usePendingLog,
} from './resolverShared.ts'
import { Button, Chip, Field, Select } from '../ui/primitives.tsx'
import type { OnRoll } from '../log/GameLog.tsx'
import { track, EVENTS } from '../../lib/analytics.ts'
import { useEnterCommit } from '../../hooks/useEnterCommit.ts'

/** The conditions every one of these combatants carries — what a chip can show as its state. */
const conditionsOnAll = (targets: Combatant[]): ConditionName[] =>
  targets.length === 0
    ? []
    : conditionsOn(targets[0]).filter((name) =>
        targets.every((t) => conditionsOn(t).includes(name)),
      )

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
  casterId,
  onResolved,
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
  casterId?: string
  onResolved?: (anyFailed: boolean) => void
  onClose: () => void
}) {
  const edition = useCampaignEdition()
  const save = action?.save ?? null
  // An action with damage but no save deals automatic area damage — no save roll.
  const noSave = !!action && !save && (action.damage?.length ?? 0) > 0
  // A standalone group save (no action) targets everyone and lets the GM type
  // the damage; an action's save excludes the attacker and rolls its damage.
  const targets = attacker
    ? targetsFor(attacker, combatants)
    : combatants.filter((c) => c.status !== 'dead')
  const { pending: held, flush } = usePendingLog(dispatch)
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

  // Reporting how the save went, once and once only. Read through refs so the caller
  // can pass a plain arrow without its identity re-firing the unmount path.
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const reportedRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved
  const reportResolved = useCallback(() => {
    if (reportedRef.current) return
    const settled = Object.values(rowsRef.current)
    if (settled.length === 0) return
    reportedRef.current = true
    onResolvedRef.current?.(settled.some((r) => r.result === 'fail'))
  }, [])
  useEffect(() => () => reportResolved(), [reportResolved])
  const [area, setArea] = useState<RolledDamage[]>([])
  const [resolved, setResolved] = useState(false)
  const [pending, setPending] = useState<{ combatant: Combatant; dc: number; damage: number }[]>([])
  const [note, setNote] = useState<string | null>(null)

  // Named for whoever acted, which for a spell a player cast is the caster rather than
  // the attacker — they roll nothing, so the resolver never sees them as one.
  const caster = attacker ?? combatants.find((c) => c.combatantId === casterId)
  const title = action
    ? caster
      ? `${nameOf(caster)} · ${action.name}`
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

  // What was rolled, by type, before any target's defenses — the same pills the attack
  // modal shows. Each row's own number carries its defenses; this is the shared roll
  // those numbers came from.
  const rolled: { type: DamageType; amount: number; result?: RollResult }[] =
    area.length > 0
      ? area.map((c) => ({ type: c.type, amount: c.amount, result: c.result }))
      : damageType && genericBase > 0
        ? [{ type: damageType, amount: genericBase }]
        : []

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
    spendEffects(dispatch, c, saveRoll.roller)
    // Held under this creature's id, so a reroll replaces its line. The outcome is
    // stamped by `setResult` and recorded when the modal closes — which is what keeps
    // Legendary Resistance from ever showing the table a "Failed" it then walks back.
    held.current.set(c.combatantId, {
      category: 'roll',
      message: `${nameOf(c)}: ${ability.toUpperCase()} save`,
      result: saveRoll.roll,
      applied: saveRoll.applied,
      sourceId: c.combatantId,
      saved: saveRoll.result === 'save',
    })
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
      if (attacker) {
        for (const entry of damageEntries(components, attacker, action)) {
          held.current.set(`damage:${entry.message}`, entry)
        }
      }
    } else {
      // Standalone group save: roll the damage formula (or take a bare number flat). Typed
      // here and now, so half-finished input ("2d") reaches the dice engine on the click.
      // Same as the manual roll box: a formula that won't parse simply rolls nothing.
      const entry = baseDamage.trim()
      let rolled: RollResult | null = null
      if (/d/i.test(entry)) {
        try {
          rolled = roll(entry, { kind: 'damage' })
        } catch {
          rolled = null
        }
      }
      if (rolled) {
        held.current.set('damage:group', {
          category: 'roll',
          message: `Group save: ${damageType ? `${damageType} ` : ''}damage`,
          result: rolled,
        })
        setGenericBase(Math.max(0, rolled.total))
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
  const setResult = (id: string, result: SaveResult) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result, edited: undefined } }))
    // Legendary Resistance and a manual override both land here, and the line is still
    // being held, so the log ends up with the outcome that stood and only that.
    const line = held.current.get(id)
    if (line) line.saved = result === 'save'
  }

  /** Store the GM's damage override for the row. */
  const setEdited = (id: string, edited: string) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], edited } }))

  // A spell whose damage isn't all immediate (Vitriolic Sphere) leaves the rest as a
  // reminder on each creature that failed, due at the end of its next turn.
  const delayed = spell ? delayedDamageEffect(spell, attacker?.combatantId) : null

  /** Apply each resolved row's damage, then queue concentration prompts or close. */
  const apply = () => {
    flush()
    reportResolved()
    const prompts: { combatant: Combatant; dc: number; damage: number }[] = []
    for (const c of selectedTargets) {
      const row = rows[c.combatantId]
      if (!row?.result) continue
      if (delayed && row.result === 'fail') {
        dispatch({
          type: 'update',
          id: c.combatantId,
          update: (cc) => ({
            ...cc,
            effects: [...cc.effects, { ...delayed, id: `${delayed.id}-${cc.combatantId}` }],
          }),
        })
      }
      const amount = toNum(damageValue(c))
      const promptDc = concentrationPromptDC(c, applyDamage(c, amount), amount)
      if (promptDc != null) prompts.push({ combatant: c, dc: promptDc, damage: amount })
      dispatch({ type: 'update', id: c.combatantId, update: (cc) => applyDamage(cc, amount) })
      if (attacker) dispatch({ type: 'recordDamage', sourceId: attacker.combatantId, amount })
    }
    if (prompts.length > 0) setPending(prompts)
    else onClose()
  }

  // Enter is the dialog's Save/Apply key; buttons and textareas keep their own.
  useEnterCommit(true, apply)

  // Targets the effect lands on: those that failed (post-roll) or all selected (pre-roll).
  const affectedTargets = (): Combatant[] =>
    resolved
      ? selectedTargets.filter((c) => rows[c.combatantId]?.result === 'fail')
      : selectedTargets

  /** Add the chosen condition to every affected target. */
  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    const affected = affectedTargets()
    if (affected.length === 0) return
    flush()
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

  /** Clear a condition off every affected target — the other half of a lit chip. */
  const clearCondition = (name: ConditionName) => {
    const affected = affectedTargets()
    if (affected.length === 0) return
    flush()
    for (const c of affected) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => ({ ...cc, effects: cc.effects.filter((e) => !isCondition(e, name)) }),
      })
    }
    setNote(`${name} cleared → ${affected.map(nameOf).join(', ')}`)
  }

  /** Raise every affected target's Exhaustion by one — each from its own level. */
  const applyExhaustion = () => {
    const affected = affectedTargets()
    if (affected.length === 0) return
    flush()
    for (const c of affected) {
      dispatch({
        type: 'setExhaustion',
        id: c.combatantId,
        level: exhaustionLevel(c.effects) + 1,
        edition,
      })
    }
    setNote(`+1 Exhaustion → ${affected.map(nameOf).join(', ')}`)
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
    flush()
    reportResolved()
    // Hand the resolver's save to the builder so a save-ends debuff carries the
    // escape save the GM just rolled against.
    const escape = { ability, dc: toNum(dc) || 10 }
    for (const c of affected) {
      const effects = spellEffect.build({
        source: casterId ?? attacker?.combatantId,
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
                        spendEffects(dispatch, p.combatant, check.combatant)
                        onRoll(`${nameOf(p.combatant)}: concentration`, check.roll, {
                          applied: check.applied,
                          sourceId: p.combatant.combatantId,
                        })
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
          {rolled.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {rolled.map((d, i) => (
                <DamagePill key={i} type={d.type} amount={d.amount} result={d.result} />
              ))}
            </div>
          )}
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

          {/* Nothing to apply to nobody: once the saves are in and every target made
            theirs, offering "apply to failed" is an invitation to do the wrong thing. */}
          {spellEffect && affectedTargets().length > 0 && (
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

          {/* Lit only where every affected target has it: with several targets a chip
          cannot be half on, and applying to the rest is the more useful default. */}
          <ConditionChips
            applied={conditionsOnAll(affectedTargets())}
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
