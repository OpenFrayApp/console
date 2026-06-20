// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { damageFormula, damageTypes, damageVariants } from '../combat/casting.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { roll } from '../dice/roll.ts'
import { GroupSaveForm } from './GroupSaveForm.tsx'
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
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [spell, setSpell] = useState<Spell | null>(null)
  const [variantKey, setVariantKey] = useState('base')
  const [rolled, setRolled] = useState<{ total: number; detail: string } | null>(null)

  useEffect(() => {
    if (open && spells === null) {
      loadSrdSpells().then(setSpells, () => setSpells([]))
    }
  }, [open, spells])

  const reset = () => {
    setSpell(null)
    setVariantKey('base')
    setRolled(null)
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
    const matches = (spells ?? [])
      .filter(isCastable)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice(0, 50)

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={combatants.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cast spell
        </button>
        {open && (
          <div className="absolute left-0 z-10 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
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

  // --- Cast card (spell selected) -----------------------------------------
  const mechanics = spell.mechanics!
  const variants = damageVariants(spell)
  const variant = variants.find((v) => v.key === variantKey) ?? variants[0]
  const hasDamage = variant != null
  const save = mechanics.save

  const rollDamage = () => {
    if (!variant) return
    const formula = damageFormula(variant.damage)
    const types = damageTypes(variant.damage).join('/')
    const result = roll(formula, { kind: 'damage' })
    onRoll(`${spell.name} · ${variant.label}`, result)
    setRolled({ total: result.total, detail: `${formula}${types ? ` ${types}` : ''}` })
  }

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

      {hasDamage && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {variants.length > 1 && (
            <select
              value={variant.key}
              onChange={(e) => {
                setVariantKey(e.target.value)
                setRolled(null)
              }}
              aria-label="Cast level"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {variants.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={rollDamage}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Roll damage
          </button>
          {rolled && (
            <span className="text-sm">
              <span className="font-semibold tabular-nums">{rolled.total}</span>{' '}
              <span className="text-slate-500 dark:text-slate-400">({rolled.detail})</span>
            </span>
          )}
        </div>
      )}

      {mechanics.attackRoll && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Spell attack — roll to hit using the caster's spell attack bonus.
        </p>
      )}

      {save && (!hasDamage || rolled) && (
        <GroupSaveForm
          // Re-seed the damage when a new roll comes in.
          key={rolled?.total ?? 'noroll'}
          combatants={combatants}
          dispatch={dispatch}
          onClose={reset}
          onRoll={onRoll}
          title={`${spell.name} — save`}
          seed={{
            ability: save.ability,
            onSave: save.onSave,
            damage: rolled ? String(rolled.total) : undefined,
          }}
        />
      )}

      {save && hasDamage && !rolled && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Roll damage to resolve the {save.ability.toUpperCase()} save.
        </p>
      )}
    </div>
  )
}
