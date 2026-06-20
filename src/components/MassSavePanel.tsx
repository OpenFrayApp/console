// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { GroupSaveForm } from './GroupSaveForm.tsx'

/**
 * The standalone Fireball flow: a button that opens the shared group-save form.
 * Casting a save spell opens the same form, pre-seeded from the spell.
 */
export function MassSavePanel({
  combatants,
  dispatch,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={combatants.length === 0}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Group save
      </button>
    )
  }

  return (
    <GroupSaveForm
      combatants={combatants}
      dispatch={dispatch}
      onClose={() => setOpen(false)}
    />
  )
}
