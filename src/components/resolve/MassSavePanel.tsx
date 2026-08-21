// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import type { Combatant } from '../../schema/combatant.ts'
import type { EncounterAction } from '../../state/encounter.ts'
import { useOpenRequest } from '../../hooks/useOpenRequest.ts'
import { GroupSaveModal } from './SaveResolver.tsx'
import { Button } from '../ui/primitives.tsx'
import type { OnRoll } from '../log/GameLog.tsx'

/**
 * The standalone Fireball flow: a button that opens the shared group-save form.
 * Casting a save spell opens the same form, pre-seeded from the spell.
 */
export function MassSavePanel({
  combatants,
  dispatch,
  onRoll,
  openRequest,
  keyHint,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Bump to open the group save from outside — the keyboard's command. */
  openRequest?: number
  /** The keyboard chord, shown in the button's tooltip. */
  keyHint?: string
}) {
  const [open, setOpen] = useState(false)
  useOpenRequest(openRequest, () => {
    if (combatants.length > 0) setOpen(true)
  })

  // The button stays while the modal is up. Returning the modal in its place took the
  // button out of the header, and the row it shares closed over the gap.
  // `narrow:flex-1` shares that row's leftover width with Cast spell.
  return (
    <>
      <Button
        className="narrow:flex-1"
        onClick={() => setOpen(true)}
        disabled={combatants.length === 0}
        title={keyHint ? `Group save (${keyHint})` : undefined}
      >
        Group save
      </Button>
      {open && (
        <GroupSaveModal
          combatants={combatants}
          dispatch={dispatch}
          onClose={() => setOpen(false)}
          onRoll={onRoll}
        />
      )}
    </>
  )
}
