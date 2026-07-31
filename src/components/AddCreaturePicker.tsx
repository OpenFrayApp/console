// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import { loadSrdCreatures } from '../compendium/srd.ts'
import { DEFAULT_ENABLED_LIBRARIES } from '../compendium/libraries.ts'
import { formatCr } from '../compendium/format.ts'
import { LibraryPicker } from './LibraryPicker.tsx'

const TRIGGER =
  'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500'

/** A search popover to pick a creature (enabled SRD libraries + custom) to add. */
export function AddCreaturePicker({
  onPick,
  customCreatures = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
  label = 'Add creature',
  triggerClass = TRIGGER,
  closeOnPick = false,
}: {
  onPick: (c: Creature) => void
  customCreatures?: Creature[]
  enabledLibraries?: string[]
  showHomebrew?: boolean
  /** The trigger's text — "Start from" on the custom-creature form. */
  label?: string
  triggerClass?: string
  /** Adding leaves the picker open for the next creature; starting a form closes it. */
  closeOnPick?: boolean
}) {
  const [creatures, setCreatures] = useState<Creature[] | null>(null)
  const load = useCallback(() => {
    if (creatures === null) loadSrdCreatures().then(setCreatures, () => setCreatures([]))
  }, [creatures])

  return (
    <LibraryPicker
      label={label}
      triggerClass={triggerClass}
      placeholder="Search creatures…"
      searchLabel="Search creatures"
      entries={creatures}
      custom={customCreatures}
      enabledLibraries={enabledLibraries}
      showHomebrew={showHomebrew}
      meta={(c) => `CR ${formatCr(c.cr)}`}
      onOpen={load}
      onPick={onPick}
      closeOnPick={closeOnPick}
    />
  )
}
