// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useReducer, useState } from 'react'
import type { Creature } from './schema/creature.ts'
import type { Combatant, PlayerCharacter } from './schema/combatant.ts'
import { instantiate } from './combat/combatant.ts'
import { beginEncounter, nextTurn } from './combat/initiative.ts'
import { rechargeActions, rollRecharge } from './combat/recharge.ts'
import { rechargeLimited } from './combat/resources.ts'
import { roll } from './dice/roll.ts'
import type { Encounter } from './schema/encounter.ts'
import { emptyEncounter, encounterReducer } from './state/encounter.ts'
import { Compendium } from './components/Compendium.tsx'
import { EncounterConsole } from './components/EncounterConsole.tsx'
import { AddCreaturePicker } from './components/AddCreaturePicker.tsx'
import { AddPcForm } from './components/AddPcForm.tsx'
import { AddQuickForm } from './components/AddQuickForm.tsx'
import { InitiativePrompt } from './components/InitiativePrompt.tsx'
import { type OnNote, type OnRoll, type RollEntry } from './components/RollLog.tsx'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

/** A player rolls their own initiative; monsters and quick adds are auto-rolled. */
const isPlayer = (c: Combatant): boolean => c.isPC && c.kind !== 'quick'

type Theme = 'dark' | 'light'
type View = 'encounter' | 'compendium'

const dexMod = (creature: Creature): number => Math.floor((creature.abilities.dex - 10) / 2)

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [view, setView] = useState<View>('encounter')
  const [encounter, dispatch] = useReducer(encounterReducer, undefined, emptyEncounter)
  const [rollLog, setRollLog] = useState<RollEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Monster initiatives held while the DM enters the players' rolled numbers.
  const [pcInitPrompt, setPcInitPrompt] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const pushRoll: OnRoll = (label, result, applied) => {
    setRollLog((prev) =>
      [{ id: crypto.randomUUID(), label, result, applied }, ...prev].slice(0, 25),
    )
  }

  const pushNote: OnNote = (label) => {
    setRollLog((prev) => [{ id: crypto.randomUUID(), label }, ...prev].slice(0, 25))
  }

  const handlePick = (creature: Creature) => {
    // Auto-label duplicates ("Goblin", "Goblin 2", …). Initiative stays 0 until
    // combat begins, when it's rolled for everyone at once.
    const sameKind = encounter.combatants.filter(
      (c) => !c.isPC && c.creatureId === creature.id,
    ).length
    const label = sameKind > 0 ? `${creature.name} ${sameKind + 1}` : creature.name
    const combatant = instantiate(creature, {
      combatantId: crypto.randomUUID(),
      initiative: 0,
      label,
    })
    dispatch({ type: 'add', combatant })
    setSelectedId(combatant.combatantId)
  }

  // Advancing the turn moves the center panel to whoever's turn it now is.
  const selectActive = (next: Encounter) => {
    const active = next.combatants[next.activeIndex]
    if (active) setSelectedId(active.combatantId)
  }
  // At the start of a creature's turn, roll the recharge die for each of its spent
  // recharge abilities (each separately, each logged); a success makes it usable.
  const autoRecharge = (next: Encounter) => {
    const active = next.combatants[next.activeIndex]
    if (!active || active.isPC) return
    for (const action of rechargeActions(active.creature)) {
      if (active.limitedUseState[action.id]?.available === false) {
        const { recharged, roll: result } = rollRecharge(action)
        pushRoll(`${active.label}: ${action.name} recharge`, result)
        if (recharged) {
          dispatch({
            type: 'update',
            id: active.combatantId,
            update: (c) => (c.isPC ? c : rechargeLimited(c, action.id)),
          })
        }
      }
    }
  }
  const rollInit = (label: string, mod: number): number => {
    const result = roll(`1d20${mod >= 0 ? `+${mod}` : `${mod}`}`)
    pushRoll(`${label}: initiative`, result)
    return result.total
  }

  // Auto-roll initiative for everyone who isn't a player: monsters (1d20 + Dex)
  // and quick adds (flat 1d20). Players roll their own — see resolvePlayerInits.
  const rollAutoInitiatives = (): Record<string, number> => {
    const inits: Record<string, number> = {}
    for (const c of encounter.combatants) {
      if (isPlayer(c)) continue
      const label = c.isPC ? c.name : c.label
      inits[c.combatantId] = rollInit(label, c.isPC ? 0 : dexMod(c.creature))
    }
    return inits
  }

  // Resolve the players' initiative fields: a typed value is used flat; a blank
  // field rolls d20 + that player's modifier (logged).
  const resolvePlayerInits = (raw: Record<string, string>): Record<string, number> => {
    const inits: Record<string, number> = {}
    for (const c of encounter.combatants) {
      if (!isPlayer(c) || !c.isPC) continue
      const entered = (raw[c.combatantId] ?? '').trim()
      inits[c.combatantId] = entered
        ? Math.floor(Number(entered) || 0)
        : rollInit(c.name, c.initiativeMod ?? 0)
    }
    return inits
  }

  // Apply all rolled/entered initiatives, sort, and start combat.
  const startCombat = (initiatives: Record<string, number>) => {
    for (const [id, initiative] of Object.entries(initiatives)) {
      dispatch({ type: 'update', id, update: (c) => ({ ...c, initiative }) })
    }
    const combatants = encounter.combatants.map((c) => ({
      ...c,
      initiative: initiatives[c.combatantId] ?? c.initiative,
    }))
    const next = beginEncounter({ ...encounter, combatants })
    dispatch({ type: 'begin' })
    selectActive(next)
    autoRecharge(next)
    setPcInitPrompt(null)
  }

  // Begin: auto-roll monsters/quick-adds now; if there are players, collect their
  // numbers first, otherwise start immediately.
  const handleBegin = () => {
    const autoInits = rollAutoInitiatives()
    if (encounter.combatants.some(isPlayer)) {
      setPcInitPrompt(autoInits)
    } else {
      startCombat(autoInits)
    }
  }
  const handleNextTurn = () => {
    const next = nextTurn(encounter)
    selectActive(next)
    dispatch({ type: 'nextTurn' })
    autoRecharge(next)
  }

  const started = encounter.round > 0
  const paused = encounter.paused === true

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
                <AddQuickForm onAdd={(c) => dispatch({ type: 'add', combatant: c })} />
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
            onNote={pushNote}
            selectedId={selectedId}
            onSelect={setSelectedId}
            started={started}
            paused={paused}
            onBegin={handleBegin}
            onNextTurn={handleNextTurn}
            onClearLog={() => setRollLog([])}
          />
        )}
      </main>

      {pcInitPrompt && (
        <InitiativePrompt
          pcs={encounter.combatants.filter(
            (c): c is PlayerCharacter => c.isPC && c.kind !== 'quick',
          )}
          onStart={(raw) => startCombat({ ...pcInitPrompt, ...resolvePlayerInits(raw) })}
          onCancel={() => setPcInitPrompt(null)}
        />
      )}

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
