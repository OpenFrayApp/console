// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { isFoe } from '../combat/combatant.ts'
import { spellEffectFor, type SpellEffectDef } from '../combat/spellEffects.ts'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)

/**
 * Default target selection. With a caster (a monster casting), only its own row is
 * pre-checked for a self/ally buff — friend/foe is relative to the caster, which the
 * board's absolute PC-vs-monster flag can't tell, so we don't guess allies. For a
 * casterless GM cast the flag *is* absolute (PCs are allies, foes are enemies), so we
 * pre-check that side.
 */
function defaultTargets(
  def: SpellEffectDef,
  caster: Combatant | undefined,
  combatants: Combatant[],
): Set<string> {
  const ids = new Set<string>()
  if (caster) {
    if (def.targeting !== 'enemy') ids.add(caster.combatantId)
    return ids
  }
  for (const c of combatants) {
    if (def.targeting === 'enemy' ? isFoe(c) : !isFoe(c)) ids.add(c.combatantId)
  }
  return ids
}

/**
 * Offer to apply a buff/utility spell's board effect to chosen targets on cast.
 * Renders nothing when the spell has no modelled effect. Applying adds the effect to
 * each picked combatant (the game log records it); the GM tweaks or clears it from the
 * row afterward. Never rolls anything — applying a consequence isn't a roll.
 */
export function ApplySpellEffect({
  spell,
  caster,
  combatants,
  dispatch,
}: {
  spell: Spell
  /** The caster, when known (a monster stat-block cast); absent for a GM "Cast spell". */
  caster?: Combatant
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
}) {
  const def = spellEffectFor(spell)
  const [selected, setSelected] = useState<Set<string>>(() =>
    def ? defaultTargets(def, caster, combatants) : new Set(),
  )
  const [appliedTo, setAppliedTo] = useState<string[] | null>(null)

  if (!def) return null

  const targets = combatants.filter((c) => c.status !== 'dead')

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const apply = () => {
    const names: string[] = []
    for (const c of targets) {
      if (!selected.has(c.combatantId)) continue
      // Build fresh per target so each effect carries its own unique id.
      const effects = def.build({ source: caster?.combatantId, spell })
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (x) => ({ ...x, effects: [...x.effects, ...effects] }),
      })
      names.push(nameOf(c))
    }
    setAppliedTo(names)
  }

  return (
    <div className="space-y-2 rounded-md border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/60 dark:bg-indigo-900/10">
      <p className="text-sm">
        <span className="font-medium">Apply on the board:</span> {def.summary}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {targets.map((c) => {
          const on = selected.has(c.combatantId)
          return (
            <button
              key={c.combatantId}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.combatantId)}
              className={
                on
                  ? 'rounded border border-indigo-500 bg-indigo-600 px-2 py-1 text-sm font-medium text-white'
                  : 'rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }
            >
              {nameOf(c)}
            </button>
          )
        })}
        {targets.length === 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">No combatants to target.</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={selected.size === 0}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Apply effect
        </button>
        {appliedTo != null && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {appliedTo.length > 0 ? `Applied to ${appliedTo.join(', ')}` : 'No targets selected'}
          </span>
        )}
      </div>
    </div>
  )
}
