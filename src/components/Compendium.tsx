// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useMemo, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import { formatCr } from '../compendium/format.ts'
import { loadSrdCreatures, loadSrdSpells } from '../compendium/srd.ts'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { CustomMonsterForm } from './CustomMonsterForm.tsx'
import { SpellCard } from './SpellCard.tsx'

type Tab = 'creatures' | 'spells'

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-md px-3 py-1 text-sm font-medium',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  )
}

export function Compendium({
  onCreateCreature,
  createGated = false,
  onGated,
}: {
  /** Add a freshly-created custom creature to the encounter. */
  onCreateCreature: (creature: Creature) => void
  /** When anonymous, the create button prompts sign-up instead. */
  createGated?: boolean
  onGated?: () => void
}) {
  const [tab, setTab] = useState<Tab>('creatures')
  const [query, setQuery] = useState('')
  const [creatures, setCreatures] = useState<Creature[] | null>(null)
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    loadSrdCreatures().then(setCreatures, () => setCreatures([]))
    loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [])

  const loading = tab === 'creatures' ? creatures === null : spells === null

  const entries = useMemo(() => {
    const list =
      tab === 'creatures'
        ? (creatures ?? []).map((c) => ({ id: c.id, name: c.name, meta: `CR ${formatCr(c.cr)}` }))
        : (spells ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            meta: s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`,
          }))
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [tab, creatures, spells, query])

  const selectedCreature =
    tab === 'creatures' ? (creatures ?? []).find((c) => c.id === selectedId) : undefined
  const selectedSpell =
    tab === 'spells' ? (spells ?? []).find((s) => s.id === selectedId) : undefined

  const switchTab = (next: Tab) => {
    setTab(next)
    setSelectedId(null)
    setQuery('')
  }

  return (
    <div className="grid h-full min-h-0 gap-4 md:grid-cols-[20rem_1fr]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="mb-2 flex gap-1">
          <TabButton active={tab === 'creatures'} onClick={() => switchTab('creatures')}>
            Creatures
          </TabButton>
          <TabButton active={tab === 'spells'} onClick={() => switchTab('spells')}>
            Spells
          </TabButton>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tab}…`}
          aria-label={`Search ${tab}`}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {entries.length} {tab}
            </p>
            <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                      e.id === selectedId
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                    )}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {e.meta}
                    </span>
                  </button>
                </li>
              ))}
              {entries.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  No matches
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-auto rounded-lg border border-slate-200 px-4 pb-4 dark:border-slate-800">
        {selectedCreature ? (
          // The stat block carries its own sticky header (with top padding inside
          // its solid background).
          <CreatureStatBlock creature={selectedCreature} />
        ) : selectedSpell ? (
          <div className="pt-4">
            <SpellCard spell={selectedSpell} />
          </div>
        ) : (
          // Nothing selected: a centered prompt. On the Creatures tab it doubles as
          // the entry point for building a custom creature.
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="rounded-full bg-slate-100 p-5 dark:bg-slate-800/70">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <path d="M12 7v14" />
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
              </svg>
            </div>
            <p className="max-w-sm text-slate-500 dark:text-slate-400">
              {tab === 'creatures'
                ? 'Select a creature to view it, or create a custom one.'
                : 'Select a spell to view it.'}
            </p>
            {tab === 'creatures' && (
              <CustomMonsterForm
                onCreate={onCreateCreature}
                gated={createGated}
                onGated={onGated}
                triggerLabel="Create custom creature"
                triggerClassName="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
