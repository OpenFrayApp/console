// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Spell } from '../schema/spell.ts'
import type { SpellRef } from '../schema/creature.ts'
import { FIELD } from './ActionEditor.tsx'

/**
 * A tag-style picker for spells, restricted to real compendium entries (so a
 * spellcaster's list resolves to actual cards, never free-typed names). Type to
 * search, click a suggestion to add a chip; chips store `{ name, ref }` where the
 * ref is the spell's compendium id.
 */
export function SpellTagInput({
  value,
  onChange,
  spells,
}: {
  value: SpellRef[]
  onChange: (next: SpellRef[]) => void
  spells: Spell[]
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const keyOf = (s: { ref?: string; name: string }) => s.ref ?? s.name.toLowerCase()
  const chosen = new Set(value.map(keyOf))
  const suggestions = query
    ? spells.filter((s) => s.name.toLowerCase().includes(query) && !chosen.has(s.id)).slice(0, 8)
    : []

  const add = (s: Spell) => {
    onChange([...value, { name: s.name, ref: s.id }])
    setQ('')
  }
  const remove = (key: string) => onChange(value.filter((v) => keyOf(v) !== key))

  return (
    <div className="space-y-1">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => {
            const key = keyOf(v)
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
              >
                {v.name}
                <button
                  type="button"
                  onClick={() => remove(key)}
                  aria-label={`Remove ${v.name}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-100"
                >
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={spells.length ? 'Add a spell…' : 'Loading spells…'}
          aria-label="Add spell"
          className={FIELD}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => add(s)}
                  className="flex w-full justify-between gap-2 px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
