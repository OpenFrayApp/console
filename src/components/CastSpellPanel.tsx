// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { spellAction } from '../combat/casting.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { SpellResolution } from './SpellResolution.tsx'
import type { OnRoll } from './RollLog.tsx'

/** Spells the DM can roll/resolve here — those carrying structured mechanics. */
const isCastable = (s: Spell): boolean => s.mechanics != null

const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Level ${level}`)

/**
 * Cast a spell from the compendium: roll its damage (scaled by the chosen level)
 * and, for a save spell, resolve the group save pre-seeded from the spell. The
 * spell owns the dice, damage type, and save ability; the DM supplies the DC (from
 * the caster) and the cast level. PCs' own rolls are never made for them.
 */
export function CastSpellPanel({
  combatants,
  dispatch,
  onRoll,
  customSpells = [],
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** The signed-in user's custom spells, castable alongside the SRD. */
  customSpells?: Spell[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [spell, setSpell] = useState<Spell | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])
  useDismiss(ref, open, close)

  useEffect(() => {
    if (open && spells === null) {
      loadSrdSpells().then(setSpells, () => setSpells([]))
    }
  }, [open, spells])

  const reset = () => {
    setSpell(null)
  }

  const pick = (s: Spell) => {
    reset()
    setSpell(s)
    setOpen(false)
    setQuery('')
  }

  // --- Picker (no spell selected) -----------------------------------------
  if (!spell) {
    const q = query.trim().toLowerCase()
    const matches = [...customSpells, ...(spells ?? [])]
      .filter(isCastable)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice(0, 50)

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={combatants.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cast spell
        </button>
        {open && (
          <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search castable spells…"
              aria-label="Search castable spells"
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {spells === null ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading…</p>
            ) : (
              <ul className="mt-1 max-h-64 overflow-auto">
                {matches.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="flex w-full justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {levelText(s.level)}
                      </span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                    No matches
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- Cast (spell selected) ----------------------------------------------
  // An attack or save spell opens the same modal as a monster's action: a save
  // spell → the mass-save modal, an attack spell → the attack modal. There's no
  // caster here, so the DM supplies the spell attack bonus / save DC; magical
  // effect is pre-checked for saves.
  const action = spellAction(spell, {})
  if (action) {
    return (
      <ActionResolver
        action={action}
        combatants={combatants}
        dispatch={dispatch}
        onRoll={onRoll}
        defaultMagical
        onClose={reset}
      />
    )
  }

  // Damage-only / utility spells have nothing to roll to-hit or save, so keep the
  // inline reference card (damage roll + any note).
  return (
    <div className="w-full space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Cast {spell.name}{' '}
          <span className="font-normal text-slate-500 dark:text-slate-400">
            · {levelText(spell.level)} {spell.school}
          </span>
        </h3>
        <button type="button" onClick={reset} className="text-xs text-slate-500 hover:underline">
          Cancel
        </button>
      </div>

      <SpellResolution
        spell={spell}
        combatants={combatants}
        dispatch={dispatch}
        onRoll={onRoll}
        onClose={reset}
      />
    </div>
  )
}
