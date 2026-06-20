// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useReducer, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import { instantiate } from '../combat/combatant.ts'
import { roll } from '../dice/roll.ts'
import { emptyEncounter, encounterReducer } from '../state/encounter.ts'
import { AddCreaturePicker } from './AddCreaturePicker.tsx'
import { CombatantControls } from './CombatantControls.tsx'
import { CombatantRow } from './CombatantRow.tsx'
import { QuickRoll } from './QuickRoll.tsx'
import { RollLog, type OnRoll, type RollEntry } from './RollLog.tsx'

const dexMod = (creature: Creature): number => Math.floor((creature.abilities.dex - 10) / 2)

export function EncounterConsole() {
  const [encounter, dispatch] = useReducer(encounterReducer, undefined, emptyEncounter)
  const [rollLog, setRollLog] = useState<RollEntry[]>([])
  const started = encounter.round > 0

  const pushRoll: OnRoll = (label, result, applied) => {
    setRollLog((prev) =>
      [{ id: crypto.randomUUID(), label, result, applied }, ...prev].slice(0, 25),
    )
  }

  const handlePick = (creature: Creature) => {
    // Auto-label duplicates ("Goblin", "Goblin 2", …) and roll initiative.
    const sameKind = encounter.combatants.filter(
      (c) => !c.isPC && c.creatureId === creature.id,
    ).length
    const label = sameKind > 0 ? `${creature.name} ${sameKind + 1}` : creature.name
    const mod = dexMod(creature)
    const initiative = roll(`1d20${mod >= 0 ? `+${mod}` : `${mod}`}`).total
    dispatch({
      type: 'add',
      combatant: instantiate(creature, {
        combatantId: crypto.randomUUID(),
        initiative,
        label,
      }),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {started ? `Round ${encounter.round}` : 'Initiative'}
        </h2>
        <div className="flex items-center gap-2">
          <AddCreaturePicker onPick={handlePick} />
          {started ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'nextTurn' })}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next turn
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'begin' })}
              disabled={encounter.combatants.length === 0}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Begin
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div>
          {encounter.combatants.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add creatures to build the encounter.
            </p>
          ) : (
            <div className="space-y-2">
              {encounter.combatants.map((c, i) => (
                <div key={c.combatantId} className="space-y-1">
                  <CombatantRow combatant={c} active={started && i === encounter.activeIndex} />
                  <CombatantControls combatant={c} dispatch={dispatch} onRoll={pushRoll} />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Dice
            </h3>
            <QuickRoll onRoll={pushRoll} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Roll log
            </h3>
            <RollLog entries={rollLog} />
          </div>
        </aside>
      </div>
    </div>
  )
}
