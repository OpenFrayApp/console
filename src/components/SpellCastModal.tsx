// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant, MonsterCombatant } from '../schema/combatant.ts'
import type { SpellRef } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { spellAction } from '../combat/casting.ts'
import { titleCase } from '../compendium/format.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { ApplySpellEffect } from './ApplySpellEffect.tsx'
import { Modal } from './Modal.tsx'
import { SpellCard } from './SpellCard.tsx'
import type { OnRoll } from './GameLog.tsx'

/**
 * Cast a spell from a monster's stat block. "Cast" spends a use (per-day decrements;
 * at-will doesn't) and logs it. An attack/save spell then hands off to the shared
 * resolver, seeded with the caster's DC / attack bonus at the spell's fixed level
 * (no upcasting). A utility spell with no mechanics is still castable. The caster is
 * always a monster, so no roll is ever made on a player's behalf.
 */
export function SpellCastModal({
  caster,
  spellRef,
  spell,
  usesRemaining,
  combatants,
  dispatch,
  onRoll,
  onCast,
  onRestore,
  onClose,
}: {
  caster: MonsterCombatant
  spellRef: SpellRef
  /** The resolved compendium spell, if found (absent for an unresolved custom ref). */
  spell?: Spell
  /** Uses left: null when unlimited (at-will), otherwise the remaining per-day count. */
  usesRemaining: number | null
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Spend a use and log the cast. */
  onCast: () => void
  /** Give back one spent use (when out of uses). */
  onRestore: () => void
  onClose: () => void
}) {
  const [cast, setCast] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const drained = usesRemaining === 0

  const action = spell
    ? spellAction(spell, {
        saveDc: caster.creature.spellcasting?.saveDc,
        toHit: caster.creature.spellcasting?.toHit,
      })
    : null

  const usageLabel =
    usesRemaining == null ? 'At will' : `${usesRemaining} use${usesRemaining === 1 ? '' : 's'} left`

  // Casting a concentration spell while already concentrating needs confirmation.
  const conflictsConcentration = spell?.concentration === true && caster.concentration != null

  const proceed = () => {
    setConfirming(false)
    onCast()
    setCast(true)
  }

  const doCast = () => {
    if (conflictsConcentration) setConfirming(true)
    else proceed()
  }

  if (cast && action) {
    return (
      <ActionResolver
        attacker={caster}
        action={action}
        combatants={combatants}
        dispatch={dispatch}
        onRoll={onRoll}
        defaultMagical
        spell={spell}
        onClose={onClose}
      />
    )
  }

  return (
    <Modal
      title={
        <>
          {caster.label} casts {spell?.name ?? titleCase(spellRef.name)}
        </>
      }
      subtitle={usageLabel}
      onClose={onClose}
    >
      {spell ? (
        <div className="mb-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <SpellCard spell={spell} />
        </div>
      ) : (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          No compendium entry for this spell — casting it spends a use.
        </p>
      )}

      {confirming ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {caster.concentration?.spell
              ? `You are already concentrating on ${caster.concentration.spell}. Are you sure you want to cast ${spell?.name ?? titleCase(spellRef.name)}?`
              : `You're already concentrating. Are you sure you want to cast ${spell?.name ?? titleCase(spellRef.name)}?`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={proceed}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Cast anyway
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !cast ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={doCast}
            disabled={drained}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Cast
          </button>
          {drained && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              No uses remaining ·{' '}
              <button type="button" onClick={onRestore} className="text-indigo-600 hover:underline dark:text-indigo-400">
                restore one
              </button>
            </span>
          )}
        </div>
      ) : (
        // Cast, but nothing to resolve on the board (a utility spell). Offer to apply
        // its effect on the board when we model one (Bless, Shield of Faith, …).
        <div className="space-y-3">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Cast — spent a use.</p>
          {spell && (
            <ApplySpellEffect
              spell={spell}
              caster={caster}
              combatants={combatants}
              dispatch={dispatch}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
