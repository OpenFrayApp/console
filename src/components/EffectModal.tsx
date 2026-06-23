// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Ability } from '../schema/primitives.ts'
import type {
  ConditionName,
  Effect,
  EffectApplies,
  EffectDirection,
  EffectDuration,
  EffectMode,
} from '../schema/effect.ts'
import { condition, modifierEffect, reminder } from '../combat/effects.ts'
import { FIELD, FIELD_W, LABEL } from './ActionEditor.tsx'

// Ordered roughly by table frequency.
const CONDITIONS: ConditionName[] = [
  'Prone', 'Grappled', 'Frightened', 'Restrained', 'Poisoned', 'Stunned', 'Blinded',
  'Charmed', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Deafened',
  'Unconscious', 'Exhaustion',
]

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

type DurChoice = 'manual' | 'r1' | 'r10' | 'consume' | 'save'

const APPLIES_TEXT: Record<EffectApplies, string> = {
  attackRolls: 'attack rolls',
  savingThrows: 'saving throws',
  abilityChecks: 'ability checks',
  ac: 'AC',
  all: 'all rolls',
}

/** Store a numeric amount as a number and a dice amount as a string; drop a `+`. */
function parseAmount(raw: string): number | string {
  const s = raw.trim().replace(/^\+/, '')
  return /^-?\d+$/.test(s) ? Number(s) : s
}

const CHIP =
  'rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

/**
 * The "Apply effect" modal: tap a condition, build a mechanical modifier
 * (advantage / disadvantage / a flat bonus, scoped and directional, in plain
 * language), or jot a free-text reminder — all with a chosen duration. Replaces the
 * cramped popover; one Effect is applied per use, then the modal closes.
 */
export function EffectModal({
  name,
  onApply,
}: {
  /** The combatant the effect is applied to, for the title. */
  name: string
  onApply: (effect: Effect) => void
}) {
  const [open, setOpen] = useState(false)

  // Shared duration for whatever gets applied.
  const [dur, setDur] = useState<DurChoice>('manual')
  const [saveAbility, setSaveAbility] = useState<Ability>('dex')
  const [saveDc, setSaveDc] = useState('')

  // Modifier builder.
  const [mode, setMode] = useState<EffectMode>('advantage')
  const [applies, setApplies] = useState<EffectApplies>('attackRolls')
  const [direction, setDirection] = useState<EffectDirection>('incoming')
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')

  const [note, setNote] = useState('')

  // Reset to defaults each time the modal opens.
  useEffect(() => {
    if (!open) return
    setDur('manual')
    setSaveAbility('dex')
    setSaveDc('')
    setMode('advantage')
    setApplies('attackRolls')
    setDirection('incoming')
    setAmount('')
    setLabel('')
    setNote('')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Switching the modifier type picks sensible defaults (matching the old chips):
  // advantage → against it; disadvantage → on its rolls; bonus → on its rolls / all.
  const chooseMode = (m: EffectMode) => {
    setMode(m)
    if (m === 'flatBonus') {
      setApplies('all')
      setDirection('outgoing')
    } else if (m === 'advantage') {
      setApplies('attackRolls')
      setDirection('incoming')
    } else {
      setApplies('attackRolls')
      setDirection('outgoing')
    }
  }

  const buildDuration = (): EffectDuration => {
    switch (dur) {
      case 'r1':
        return { type: 'rounds', rounds: 1 }
      case 'r10':
        return { type: 'rounds', rounds: 10 }
      case 'consume':
        return { type: 'consumeOnRoll' }
      case 'save':
        return { type: 'saveEnds', save: { ability: saveAbility, dc: Number(saveDc) || 10 } }
      default:
        return { type: 'manual' }
    }
  }

  const applyEffect = (effect: Effect) => {
    onApply(effect)
    setOpen(false)
  }

  const dirText = direction === 'outgoing' ? 'it makes' : 'made against it'
  const summary =
    mode === 'flatBonus'
      ? `${label.trim() || 'Effect'}: ${amount.trim() || '±N'} to ${APPLIES_TEXT[applies]} ${dirText}`
      : `${label.trim() || 'Effect'}: ${mode === 'advantage' ? 'Advantage' : 'Disadvantage'} on ${APPLIES_TEXT[applies]} ${dirText}`

  const canApplyModifier = label.trim() !== '' && (mode !== 'flatBonus' || amount.trim() !== '')

  const applyModifier = () => {
    if (!canApplyModifier) return
    applyEffect(
      modifierEffect(
        {
          name: label.trim(),
          mode,
          direction,
          applies,
          value: mode === 'flatBonus' ? parseAmount(amount) : null,
        },
        { duration: buildDuration() },
      ),
    )
  }

  const applyReminder = () => {
    const text = note.trim()
    if (text) applyEffect(reminder(text, text, { duration: buildDuration() }))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Apply effect
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label={`Apply effect to ${name}`}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-lg font-semibold">Apply effect to {name}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
              {/* Duration — applied to whatever you add below. */}
              <div className="space-y-1">
                <p className={LABEL}>Duration</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={dur} onChange={(e) => setDur(e.target.value as DurChoice)} aria-label="Duration" className={`${FIELD_W} w-48`}>
                    <option value="manual">Until removed</option>
                    <option value="r1">1 round</option>
                    <option value="r10">10 rounds</option>
                    <option value="consume">This turn / next attack</option>
                    <option value="save">Save ends</option>
                  </select>
                  {dur === 'save' && (
                    <span className="flex items-center gap-1 text-sm">
                      <select value={saveAbility} onChange={(e) => setSaveAbility(e.target.value as Ability)} aria-label="Save ability" className={`${FIELD_W} w-20`}>
                        {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
                      </select>
                      DC
                      <input value={saveDc} onChange={(e) => setSaveDc(e.target.value)} placeholder="#" aria-label="Save DC" inputMode="numeric" className={`${FIELD_W} w-14`} />
                    </span>
                  )}
                </div>
              </div>

              {/* Conditions — one tap applies. */}
              <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={LABEL}>Condition</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => (
                    <button key={c} type="button" className={CHIP} onClick={() => applyEffect(condition(c, { duration: buildDuration() }))}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modifier builder. */}
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={LABEL}>Modifier</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Effect</span>
                    <select value={mode} onChange={(e) => chooseMode(e.target.value as EffectMode)} aria-label="Modifier effect" className={FIELD}>
                      <option value="advantage">Advantage</option>
                      <option value="disadvantage">Disadvantage</option>
                      <option value="flatBonus">Bonus / penalty</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Applies to</span>
                    <select value={applies} onChange={(e) => setApplies(e.target.value as EffectApplies)} aria-label="Applies to" className={FIELD}>
                      <option value="attackRolls">Attack rolls</option>
                      <option value="savingThrows">Saving throws</option>
                      <option value="abilityChecks">Ability checks</option>
                      <option value="all">Everything</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className={LABEL}>On</span>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="effect-direction" checked={direction === 'outgoing'} onChange={() => setDirection('outgoing')} />
                    Rolls it makes
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="effect-direction" checked={direction === 'incoming'} onChange={() => setDirection('incoming')} />
                    Rolls made against it
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'flatBonus' && (
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+1d4 or -2" aria-label="Amount" className={`${FIELD_W} w-28`} />
                  )}
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (Bless, Bane…)" aria-label="Modifier label" className={`${FIELD_W} min-w-0 flex-1`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
                <button
                  type="button"
                  onClick={applyModifier}
                  disabled={!canApplyModifier}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  Apply modifier
                </button>
              </div>

              {/* Reminder — the long-tail escape hatch. */}
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={LABEL}>Reminder</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    applyReminder()
                  }}
                  className="flex gap-2"
                >
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Hex: +1d6 necrotic" aria-label="Custom reminder" className={`${FIELD_W} min-w-0 flex-1`} />
                  <button type="submit" disabled={!note.trim()} className={`${CHIP} disabled:opacity-40`}>
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
