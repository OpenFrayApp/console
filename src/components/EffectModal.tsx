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
import { condition, counter, modifierEffect, reminder } from '../combat/effects.ts'
import { FIELD, FIELD_W, LABEL } from './ActionEditor.tsx'
import { track as recordEvent, EVENTS } from '../lib/analytics.ts'

// Ordered roughly by table frequency.
const CONDITIONS: ConditionName[] = [
  'Prone',
  'Grappled',
  'Frightened',
  'Restrained',
  'Poisoned',
  'Stunned',
  'Blinded',
  'Charmed',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Deafened',
  'Unconscious',
  'Exhaustion',
]

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

type DurChoice =
  'manual' | 'consume' | 'save' | 'counter' | '1r' | '1m' | '10m' | '1h' | '8h' | '24h'

// Timed durations in combat rounds (6s each), phrased the way spells are.
const TIMED_ROUNDS: Partial<Record<DurChoice, number>> = {
  '1r': 1,
  '1m': 10,
  '10m': 100,
  '1h': 600,
  '8h': 4800,
  '24h': 14400,
}

const DURATION_OPTIONS: { value: DurChoice; label: string }[] = [
  { value: 'manual', label: 'Until removed' },
  { value: 'consume', label: 'This turn / next attack' },
  { value: '1r', label: '1 round' },
  { value: '1m', label: '1 minute' },
  { value: '10m', label: '10 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '8h', label: '8 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'save', label: 'Save ends' },
  { value: 'counter', label: 'Counter' },
]

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
 * The "Apply effect" modal: stage a duration, any conditions, an optional modifier
 * (advantage / disadvantage / flat bonus), and a reminder, then commit them all at once
 * with **Apply**. Nothing lands on the creature until Apply; ✕ / Escape / backdrop cancels.
 */
export function EffectModal({
  name,
  effects,
  onApply,
  onRemove,
}: {
  name: string
  effects: Effect[]
  onApply: (effect: Effect) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  const [dur, setDur] = useState<DurChoice>('manual')
  const [saveAbility, setSaveAbility] = useState<Ability>('dex')
  const [saveDc, setSaveDc] = useState('')
  const [saveWhen, setSaveWhen] = useState<'endOfTurn' | 'startOfTurn'>('endOfTurn')

  const [mode, setMode] = useState<EffectMode>('advantage')
  const [applies, setApplies] = useState<EffectApplies>('attackRolls')
  const [direction, setDirection] = useState<EffectDirection>('incoming')
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')

  const [note, setNote] = useState('')
  // The modifier builder is collapsed by default — a condition or a reminder is the common case.
  const [showModifier, setShowModifier] = useState(false)
  // Conditions are staged here and committed on Apply, not toggled live.
  const [staged, setStaged] = useState<Set<ConditionName>>(new Set())

  /** The creature's active conditions, read from its condition effects. */
  const conditionNames = (): ConditionName[] =>
    effects.filter((e) => e.icon === 'condition').map((e) => e.name as ConditionName)

  // Open with the creature's current conditions pre-selected, and everything else reset.
  const openModal = () => {
    setStaged(new Set(conditionNames()))
    setDur('manual')
    setSaveAbility('dex')
    setSaveDc('')
    setSaveWhen('endOfTurn')
    setMode('advantage')
    setApplies('attackRolls')
    setDirection('incoming')
    setAmount('')
    setLabel('')
    setNote('')
    setShowModifier(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    /** Close the modal on Escape. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Switching the modifier type picks sensible defaults: advantage → against it;
  // disadvantage → on its rolls; bonus → all rolls it makes.
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

  /** Build the EffectDuration from the staged choices (save-ends carries its escape save). */
  const makeDuration = (): EffectDuration => {
    if (dur === 'consume') return { type: 'consumeOnRoll' }
    if (dur === 'save')
      return {
        type: 'saveEnds',
        save: { ability: saveAbility, dc: Number(saveDc) || 10 },
        when: saveWhen,
      }
    const rounds = TIMED_ROUNDS[dur]
    if (rounds != null) return { type: 'rounds', rounds }
    // Counter falls through on purpose: the tally is its own effect, and anything
    // else staged alongside it has no timer to inherit, so it lasts until removed.
    return { type: 'manual' }
  }

  /** Toggle a condition in the staged set. */
  const toggleCondition = (c: ConditionName) => {
    setStaged((s) => {
      const next = new Set(s)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const dirText = direction === 'outgoing' ? 'it makes' : 'made against it'
  const summary =
    mode === 'flatBonus'
      ? `${label.trim() || 'Effect'}: ${amount.trim() || '±N'} to ${APPLIES_TEXT[applies]} ${dirText}`
      : `${label.trim() || 'Effect'}: ${mode === 'advantage' ? 'Advantage' : 'Disadvantage'} on ${APPLIES_TEXT[applies]} ${dirText}`

  const modifierReady = label.trim() !== '' && (mode !== 'flatBonus' || amount.trim() !== '')

  // The only apply path. Commits everything staged at once, with the chosen duration:
  // conditions (newly-checked added, unchecked removed), the modifier if one was built,
  // and the reminder if one was typed — which the Counter duration turns into a tally
  // instead, since a counter is a reminder that happens to hold a number.
  const apply = () => {
    const duration = makeDuration()
    const current = new Set(conditionNames())
    for (const c of staged) {
      if (!current.has(c)) {
        recordEvent(EVENTS.effectApplied)
        onApply(condition(c, { duration }))
      }
    }
    for (const c of current) {
      if (!staged.has(c)) {
        const existing = effects.find((e) => e.icon === 'condition' && e.name === c)
        if (existing) onRemove(existing.id)
      }
    }
    if (modifierReady) {
      recordEvent(EVENTS.effectApplied)
      onApply(
        modifierEffect(
          {
            name: label.trim(),
            mode,
            direction,
            applies,
            value: mode === 'flatBonus' ? parseAmount(amount) : null,
          },
          { duration },
        ),
      )
    }
    const text = note.trim()
    if (text) {
      recordEvent(EVENTS.effectApplied)
      onApply(dur === 'counter' ? counter(text) : reminder(text, text, { duration }))
    }
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
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
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className={LABEL}>Duration</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={dur}
                      onChange={(e) => setDur(e.target.value as DurChoice)}
                      aria-label="Duration"
                      className={`${FIELD_W} w-full`}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {dur === 'save' && (
                      <span className="flex flex-wrap items-center gap-1 text-sm">
                        <select
                          value={saveAbility}
                          onChange={(e) => setSaveAbility(e.target.value as Ability)}
                          aria-label="Save ability"
                          className={`${FIELD_W} w-20`}
                        >
                          {ABILITIES.map((a) => (
                            <option key={a} value={a}>
                              {a.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        DC
                        <input
                          value={saveDc}
                          onChange={(e) => setSaveDc(e.target.value)}
                          placeholder="#"
                          aria-label="Save DC"
                          inputMode="numeric"
                          className={`${FIELD_W} w-14`}
                        />
                        <select
                          value={saveWhen}
                          onChange={(e) => setSaveWhen(e.target.value as typeof saveWhen)}
                          aria-label="Save timing"
                          className={`${FIELD_W} w-32`}
                        >
                          <option value="endOfTurn">end of turn</option>
                          <option value="startOfTurn">start of turn</option>
                        </select>
                      </span>
                    )}
                  </div>
                  {dur === 'save' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      OpenFray rolls this for a creature at the chosen moment. A player rolls their
                      own, and you record it.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className={LABEL}>Reminder</p>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      dur === 'counter' ? 'e.g. Depth, Corruption' : 'e.g. Hex: +1d6 necrotic'
                    }
                    aria-label="Custom reminder"
                    className={`${FIELD_W} w-full`}
                  />
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={LABEL}>Condition</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => {
                    const active = staged.has(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCondition(c)}
                        className={
                          active
                            ? 'rounded border border-indigo-500 bg-indigo-600 px-2 py-1 text-sm font-medium text-white'
                            : CHIP
                        }
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                {!showModifier ? (
                  <button
                    type="button"
                    onClick={() => setShowModifier(true)}
                    className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    + Add a bonus or penalty
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className={LABEL}>Modifier</p>
                      <button
                        type="button"
                        onClick={() => setShowModifier(false)}
                        className="text-xs text-slate-500 hover:underline dark:text-slate-400"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Effect</span>
                        <select
                          value={mode}
                          onChange={(e) => chooseMode(e.target.value as EffectMode)}
                          aria-label="Modifier effect"
                          className={FIELD}
                        >
                          <option value="advantage">Advantage</option>
                          <option value="disadvantage">Disadvantage</option>
                          <option value="flatBonus">Bonus / penalty</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Applies to
                        </span>
                        <select
                          value={applies}
                          onChange={(e) => setApplies(e.target.value as EffectApplies)}
                          aria-label="Applies to"
                          className={FIELD}
                        >
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
                        <input
                          type="radio"
                          name="effect-direction"
                          checked={direction === 'outgoing'}
                          onChange={() => setDirection('outgoing')}
                        />
                        Rolls it makes
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="effect-direction"
                          checked={direction === 'incoming'}
                          onChange={() => setDirection('incoming')}
                        />
                        Rolls made against it
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mode === 'flatBonus' && (
                        <input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="+1d4 or -2"
                          aria-label="Amount"
                          className={`${FIELD_W} w-28`}
                        />
                      )}
                      <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Label (Bless, Bane…)"
                        aria-label="Modifier label"
                        className={`${FIELD_W} min-w-0 flex-1`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
