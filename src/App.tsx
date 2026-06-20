// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Combatant, PlayerCharacter } from './schema/combatant.ts'
import type { Creature } from './schema/creature.ts'
import { instantiate } from './combat/combatant.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  rollDeathSave,
} from './combat/deathsaves.ts'
import { advantageAgainst, condition, flatBonus } from './combat/effects.ts'
import { sortByInitiative } from './combat/initiative.ts'
import { CombatantRow } from './components/CombatantRow.tsx'
import { Compendium } from './components/Compendium.tsx'
import { DeathSaveControls } from './components/DeathSaveControls.tsx'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

type Theme = 'dark' | 'light'
type View = 'encounter' | 'compendium'

// Temporary preview data so the initiative list is visible. Replaced when real
// encounter state lands.
const GOBLIN: Creature = {
  id: 'srd:goblin',
  source: 'srd-5.2',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 7,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
}

const thalia: Combatant = {
  isPC: true,
  combatantId: 'p1',
  name: 'Thalia',
  initiative: 21,
  ac: 16,
  passivePerception: 14,
  status: 'active',
  hp: { current: 24, max: 38, temp: 5 },
  concentration: { spell: 'Bless', saveDc: 13, round: 1 },
  effects: [flatBonus('Bless', '1d4')],
  languages: ['Common', 'Elvish'],
}

const goblinA = instantiate(GOBLIN, {
  combatantId: 'g1',
  initiative: 17,
  label: 'Goblin (A)',
})

const goblinB: Combatant = {
  ...instantiate(GOBLIN, { combatantId: 'g2', initiative: 12, label: 'Goblin (B)' }),
  hp: { current: 3, max: 7, temp: 0 },
  effects: [condition('Prone'), advantageAgainst('Reckless Attack', { source: 'p1' })],
}

const BORIN_START: PlayerCharacter = {
  isPC: true,
  combatantId: 'p2',
  name: 'Borin',
  initiative: 14,
  ac: 18,
  passivePerception: 12,
  status: 'unconscious',
  hp: { current: 0, max: 28, temp: 0 },
  concentration: null,
  effects: [],
  deathSaves: { successes: 0, failures: 0 },
}

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [view, setView] = useState<View>('encounter')
  // A downed PC wired to the death-save controls (interactive preview).
  const [borin, setBorin] = useState<PlayerCharacter>(BORIN_START)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const roster = sortByInitiative([thalia, goblinA, goblinB, borin])

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">OpenFray</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            D&amp;D 5e combat console
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      <main className="flex-1 px-6 py-6">
        {view === 'compendium' ? (
          <div className="mx-auto w-full max-w-5xl">
            <Compendium />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Initiative
            </h2>
          <div className="space-y-2">
            {roster.map((c, i) => (
              <div key={c.combatantId} className="space-y-1">
                <CombatantRow combatant={c} active={i === 0} />
                {c.combatantId === 'p2' && c.isPC && c.status === 'unconscious' && !isStable(c) && (
                  <div className="pl-10">
                    <DeathSaveControls
                      onSave={() => setBorin(markDeathSaveSuccess)}
                      onFail={() => setBorin((p) => markDeathSaveFailure(p))}
                      onRoll={() => setBorin((p) => rollDeathSave(p).pc)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Preview data — encounter state wiring comes later.
            </p>
          </div>
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
