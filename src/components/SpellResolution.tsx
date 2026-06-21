// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { damageFormula, damageTypes, damageVariants } from '../combat/casting.ts'
import { roll } from '../dice/roll.ts'
import { GroupSaveForm } from './GroupSaveForm.tsx'
import type { OnRoll } from './RollLog.tsx'

const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Level ${level}`)

/**
 * Resolve a spell's mechanics against the board: roll its damage (scaled by the
 * chosen level) and, for a save spell, run the group save pre-seeded from the
 * spell. The spell owns the dice, damage type, and save ability; the caster owns
 * the DC (passed as `saveDc` when the caster is known — a monster's
 * Spellcasting.saveDc — or left for the DM to enter). PCs' own rolls are never
 * made for them (the group save records them). Spells with no mechanics render
 * nothing here — the caller handles "cast with no automatic effect".
 */
export function SpellResolution({
  spell,
  combatants,
  dispatch,
  onRoll,
  onClose,
  saveDc,
}: {
  spell: Spell
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  onClose: () => void
  /** The caster's save DC, used to pre-seed the save. */
  saveDc?: number
}) {
  const [variantKey, setVariantKey] = useState('base')
  const [rolled, setRolled] = useState<{ total: number; detail: string } | null>(null)

  const mechanics = spell.mechanics
  if (!mechanics) return null

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
    <div className="space-y-3">
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
          onClose={onClose}
          onRoll={onRoll}
          title={`${spell.name} — save`}
          seed={{
            ability: save.ability,
            onSave: save.onSave,
            dc: saveDc != null ? String(saveDc) : undefined,
            damage: rolled ? String(rolled.total) : undefined,
          }}
        />
      )}

      {save && hasDamage && !rolled && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Roll damage to resolve the {save.ability.toUpperCase()} save.
        </p>
      )}

      {!hasDamage && !save && !mechanics.attackRoll && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No automatic effect to resolve — {levelText(spell.level)} {spell.school}.
        </p>
      )}
    </div>
  )
}
