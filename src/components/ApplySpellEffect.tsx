// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { isFoe, nameOf } from '../combat/combatant.ts'
import { spellEffectFor, type SpellEffectDef } from '../combat/spellEffects.ts'
import { TargetChips } from './TargetChips.tsx'
import { Button } from './ui.tsx'

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
  // Casterless GM cast: a self-buff has no known recipient, so let the GM pick.
  if (def.targeting === 'self') return ids
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
  onApplied,
}: {
  spell: Spell
  /** The caster, when known (a monster stat-block cast); absent for a GM "Cast spell". */
  caster?: Combatant
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  /** How many targets the effect landed on — a concentration spell begins here. */
  onApplied?: (count: number) => void
}) {
  const def = spellEffectFor(spell)
  const [selected, setSelected] = useState<Set<string>>(() =>
    def ? defaultTargets(def, caster, combatants) : new Set(),
  )
  const [appliedTo, setAppliedTo] = useState<string[] | null>(null)
  // Read through a ref so a caller's inline arrow can't re-run the self-buff effect.
  const onAppliedRef = useRef(onApplied)
  onAppliedRef.current = onApplied

  // A self-only spell (Speak with Animals, Blur) lands on its caster and nobody else,
  // so there is nothing to choose — and nothing to confirm. Without a known caster the
  // GM still has to say who cast it, and picks from the board as usual.
  const selfOnly = def?.targeting === 'self' && caster !== undefined
  const done = useRef(false)
  useEffect(() => {
    if (!def || !selfOnly || !caster || done.current) return
    done.current = true
    const effects = def.build({ source: caster.combatantId, spell, target: caster })
    dispatch({
      type: 'update',
      id: caster.combatantId,
      update: (x) => ({ ...x, effects: [...x.effects, ...effects] }),
    })
    setAppliedTo([nameOf(caster)])
    onAppliedRef.current?.(1)
  }, [def, selfOnly, caster, spell, dispatch])

  if (!def) return null

  const targets = selfOnly && caster ? [caster] : combatants.filter((c) => c.status !== 'dead')

  /** Toggle a target in the selection. */
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** Apply the effect to every selected target and note who received it. */
  const apply = () => {
    const names: string[] = []
    for (const c of targets) {
      if (!selected.has(c.combatantId)) continue
      // Build fresh per target so each effect carries its own unique id.
      const effects = def.build({ source: caster?.combatantId, spell, target: c })
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (x) => ({ ...x, effects: [...x.effects, ...effects] }),
      })
      names.push(nameOf(c))
    }
    setAppliedTo(names)
    onApplied?.(names.length)
  }

  return (
    <div className="space-y-2 rounded-md border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/60 dark:bg-indigo-900/10">
      <p className="text-sm">
        <span className="font-medium">Apply on the board:</span> {def.summary}
      </p>
      {selfOnly ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Applied to {caster ? nameOf(caster) : 'the caster'}.
        </p>
      ) : (
        <>
          <TargetChips
            targets={targets}
            selected={selected}
            onToggle={toggle}
            emptyText="No combatants to target."
          />
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={apply} disabled={selected.size === 0}>
              Apply effect
            </Button>
            {appliedTo != null && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                {appliedTo.length > 0
                  ? `Applied to ${appliedTo.join(', ')}`
                  : 'No targets selected'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
