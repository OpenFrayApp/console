// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useReducer, useState } from 'react'
import type { Creature } from './schema/creature.ts'
import { instantiate } from './combat/combatant.ts'
import { roll } from './dice/roll.ts'
import { emptyEncounter, encounterReducer } from './state/encounter.ts'
import { Compendium } from './components/Compendium.tsx'
import { EncounterConsole } from './components/EncounterConsole.tsx'
import { AddCreaturePicker } from './components/AddCreaturePicker.tsx'
import { AddPcForm } from './components/AddPcForm.tsx'
import { type OnRoll, type RollEntry } from './components/RollLog.tsx'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

type Theme = 'dark' | 'light'
type View = 'encounter' | 'compendium'

const dexMod = (creature: Creature): number => Math.floor((creature.abilities.dex - 10) / 2)

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [view, setView] = useState<View>('encounter')
  const [encounter, dispatch] = useReducer(encounterReducer, undefined, emptyEncounter)
  const [rollLog, setRollLog] = useState<RollEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

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
    const combatant = instantiate(creature, {
      combatantId: crypto.randomUUID(),
      initiative,
      label,
    })
    dispatch({ type: 'add', combatant })
    setSelectedId(combatant.combatantId)
  }

  const started = encounter.round > 0
  const paused = encounter.paused === true

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">OpenFray</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            D&amp;D 5e combat console
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'encounter' && (
            <>
              <div className="flex items-center gap-2">
                <AddPcForm onAdd={(pc) => dispatch({ type: 'add', combatant: pc })} />
                <AddCreaturePicker onPick={handlePick} />
              </div>
              <span className="h-6 w-px bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            </>
          )}
          <nav className="flex gap-1" aria-label="View">
            {(['encounter', 'compendium'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-current={view === v ? 'page' : undefined}
                className={
                  view === v
                    ? 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium capitalize text-white'
                    : 'rounded-md px-3 py-1.5 text-sm font-medium capitalize text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }
              >
                {v}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {view === 'compendium' ? (
          <div className="mx-auto h-full w-full max-w-5xl overflow-auto px-6 py-6">
            <Compendium />
          </div>
        ) : (
          <EncounterConsole
            encounter={encounter}
            dispatch={dispatch}
            rollLog={rollLog}
            onRoll={pushRoll}
            selectedId={selectedId}
            onSelect={setSelectedId}
            started={started}
            paused={paused}
          />
        )}
      </main>

      {/* AGPL §13: a network-deployed copy must offer its source. */}
      <footer className="border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200"
        >
          Source
        </a>
        <span className="mx-2">·</span>
        <span>AGPL-3.0</span>
      </footer>
    </div>
  )
}

export default App
