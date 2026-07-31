// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { durationRounds, spellAction } from '../combat/casting.ts'
import { startConcentration } from '../combat/concentration.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { DEFAULT_ENABLED_LIBRARIES } from '../compendium/libraries.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { isSupportSpell } from '../combat/spellEffects.ts'
import { ApplySpellEffect } from './ApplySpellEffect.tsx'
import { LibraryPicker } from './LibraryPicker.tsx'
import { Modal } from './Modal.tsx'
import { SpellCard } from './SpellCard.tsx'
import { SpellResolution } from './SpellResolution.tsx'
import type { OnRoll } from './GameLog.tsx'

/** "Cantrip" for level 0, otherwise "Lvl N". */
const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Lvl ${level}`)

/**
 * Cast a spell from the compendium: roll its damage (scaled by the chosen level)
 * and, for a save spell, resolve the group save pre-seeded from the spell. The
 * spell owns the dice, damage type, and save ability; the GM supplies the DC (from
 * the caster) and the cast level. PCs' own rolls are never made for them.
 */
export function CastSpellPanel({
  combatants,
  dispatch,
  onRoll,
  round = 0,
  customSpells = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Current combat round — stamped on the caster's concentration when it starts. */
  round?: number
  /** The signed-in user's custom spells, castable alongside the SRD. */
  customSpells?: Spell[]
  /** Only spells from these libraries (plus custom) are listed — matches the picker. */
  enabledLibraries?: string[]
  /** When false, homebrew (custom) spells are hidden — matches the compendium/picker. */
  showHomebrew?: boolean
}) {
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [spell, setSpell] = useState<Spell | null>(null)
  const [casterId, setCasterId] = useState<string>('')
  const caster = casterId ? combatants.find((c) => c.combatantId === casterId) : undefined
  const load = useCallback(() => {
    if (spells === null) loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [spells])

  /** Drop the picked spell, returning to the Cast spell button. */
  const reset = () => {
    setSpell(null)
  }

  /** Set the spell to cast; a concentration spell starts the chosen caster concentrating. */
  const pick = (s: Spell) => {
    reset()
    setSpell(s)
    // A concentration spell starts the chosen caster concentrating, with the spell's
    // round timer — mirroring a stat-block cast. The caster is optional, so this only
    // fires when one is picked.
    if (s.concentration && caster) {
      const saveDc = caster.isPC ? 0 : (caster.creature.spellcasting?.saveDc ?? 0)
      dispatch({
        type: 'update',
        id: caster.combatantId,
        update: (cc) =>
          startConcentration(cc, {
            spell: s.name,
            saveDc,
            round,
            rounds: durationRounds(s.duration),
          }),
      })
    }
  }

  if (!spell) {
    return (
      <LibraryPicker
        label="Cast spell"
        triggerClass="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        disabled={combatants.length === 0}
        align="left"
        placeholder="Search spells…"
        searchLabel="Search spells"
        // Every spell from the enabled libraries, so buffs like Bless list too — not
        // just the rollable ones.
        entries={spells}
        custom={customSpells}
        enabledLibraries={enabledLibraries}
        showHomebrew={showHomebrew}
        meta={(s) => levelText(s.level)}
        onOpen={load}
        onPick={pick}
      >
        <select
          value={casterId}
          onChange={(e) => setCasterId(e.target.value)}
          aria-label="Caster"
          className="mb-1.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">No caster (GM rolls)</option>
          {combatants.map((c) => (
            <option key={c.combatantId} value={c.combatantId}>
              {c.isPC ? c.name : c.label}
            </option>
          ))}
        </select>
      </LibraryPicker>
    )
  }

  // An attack or save spell opens the same modal as a monster's action: a save
  // spell → the mass-save modal, an attack spell → the attack modal. A chosen monster
  // caster seeds the save DC / spell attack bonus from its spellcasting; otherwise the
  // GM supplies them. Magical effect is pre-checked for saves.
  const spellcasting = caster && !caster.isPC ? caster.creature.spellcasting : undefined
  const action = isSupportSpell(spell)
    ? null
    : spellAction(spell, { saveDc: spellcasting?.saveDc, toHit: spellcasting?.toHit })
  if (action) {
    return (
      <ActionResolver
        attacker={caster && !caster.isPC ? caster : undefined}
        action={action}
        combatants={combatants}
        dispatch={dispatch}
        onRoll={onRoll}
        defaultMagical
        spell={spell}
        onClose={reset}
      />
    )
  }

  // A damage-only / buff / utility spell with no attack or save opens the same popup a
  // stat-block cast does: its reference card (Bless, Shield of Faith, …), or the compact
  // roll-damage view for a damage-only spell.
  return (
    <Modal
      title={`Cast ${spell.name}`}
      subtitle={`${levelText(spell.level)} · ${spell.school}${caster ? ` · ${caster.isPC ? caster.name : caster.label}` : ''}`}
      onClose={reset}
    >
      {spell.mechanics && !isSupportSpell(spell) ? (
        <div className="space-y-3">
          <SpellResolution
            spell={spell}
            combatants={combatants}
            dispatch={dispatch}
            onRoll={onRoll}
            onClose={reset}
          />
          <ApplySpellEffect
            spell={spell}
            caster={caster}
            combatants={combatants}
            dispatch={dispatch}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <SpellCard spell={spell} />
          <ApplySpellEffect
            spell={spell}
            caster={caster}
            combatants={combatants}
            dispatch={dispatch}
          />
        </div>
      )}
    </Modal>
  )
}
