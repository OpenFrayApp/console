// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { GroupSaveModal } from './ActionResolver.tsx'
import { Button } from './ui.tsx'
import type { OnRoll } from './GameLog.tsx'

/**
 * The standalone Fireball flow: a button that opens the shared group-save form.
 * Casting a save spell opens the same form, pre-seeded from the spell.
 */
export function MassSavePanel({
  combatants,
  dispatch,
  onRoll,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={combatants.length === 0}>
        Group save
      </Button>
    )
  }

  return (
    <GroupSaveModal
      combatants={combatants}
      dispatch={dispatch}
      onClose={() => setOpen(false)}
      onRoll={onRoll}
    />
  )
}
