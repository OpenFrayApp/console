// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { durationRounds, spellAction } from '../combat/casting.ts'
import { startConcentration } from '../combat/concentration.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import {
  DEFAULT_ENABLED_LIBRARIES,
  editionBadgeClass,
  editionLabel,
  inEnabledLibrary,
  librarySource,
  librarySourceBadgeClass,
  libraryTag,
} from '../compendium/libraries.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { ApplySpellEffect } from './ApplySpellEffect.tsx'
import { Modal } from './Modal.tsx'
import { SpellCard } from './SpellCard.tsx'
import { SpellResolution } from './SpellResolution.tsx'
import type { OnRoll } from './GameLog.tsx'

const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Lvl ${level}`)
const isCustom = (s: Spell): boolean => s.id.startsWith('custom:')

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
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [spell, setSpell] = useState<Spell | null>(null)
  const [casterId, setCasterId] = useState<string>('')
  const caster = casterId ? combatants.find((c) => c.combatantId === casterId) : undefined
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
    // A concentration spell starts the chosen caster concentrating, with the spell's
    // round timer — mirroring a stat-block cast. The caster is optional, so this only
    // fires when one is picked.
    if (s.concentration && caster) {
      const saveDc = caster.isPC ? 0 : (caster.creature.spellcasting?.saveDc ?? 0)
      dispatch({
        type: 'update',
        id: caster.combatantId,
        update: (cc) =>
          startConcentration(cc, { spell: s.name, saveDc, round, rounds: durationRounds(s.duration) }),
      })
    }
  }

  // Source tag (Core / ToB…): library spells only — custom carries its own badge.
  const sourceTag = (s: Spell): string | undefined =>
    isCustom(s) ? undefined : librarySource(s.source)
  const editionTag = (s: Spell): string | undefined =>
    isCustom(s) ? s.edition : libraryTag(s.source)

  if (!spell) {
    const q = query.trim().toLowerCase()
    // Every spell from the enabled libraries (so buffs like Bless show too), filtered
    // by the active content set — not just rollable ones, and not the whole bundle.
    const matches = [...customSpells, ...(spells ?? [])]
      .filter((s) => inEnabledLibrary(s, enabledLibraries))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))

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
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spells…"
              aria-label="Search spells"
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
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        {isCustom(s) && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                            Custom
                          </span>
                        )}
                        {sourceTag(s) && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${librarySourceBadgeClass(s.source)}`}>
                            {sourceTag(s)}
                          </span>
                        )}
                        {editionTag(s) && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${editionBadgeClass(editionTag(s))}`}>
                            {editionLabel(editionTag(s))}
                          </span>
                        )}
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

  // An attack or save spell opens the same modal as a monster's action: a save
  // spell → the mass-save modal, an attack spell → the attack modal. A chosen monster
  // caster seeds the save DC / spell attack bonus from its spellcasting; otherwise the
  // GM supplies them. Magical effect is pre-checked for saves.
  const spellcasting = caster && !caster.isPC ? caster.creature.spellcasting : undefined
  const action = spellAction(spell, { saveDc: spellcasting?.saveDc, toHit: spellcasting?.toHit })
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
      {spell.mechanics ? (
        <div className="space-y-3">
          <SpellResolution
            spell={spell}
            combatants={combatants}
            dispatch={dispatch}
            onRoll={onRoll}
            onClose={reset}
          />
          <ApplySpellEffect spell={spell} caster={caster} combatants={combatants} dispatch={dispatch} />
        </div>
      ) : (
        <div className="space-y-3">
          <SpellCard spell={spell} />
          <ApplySpellEffect spell={spell} caster={caster} combatants={combatants} dispatch={dispatch} />
        </div>
      )}
    </Modal>
  )
}
