// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useState } from 'react'
import type { Spell } from '../schema/spell.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { DEFAULT_ENABLED_LIBRARIES } from '../compendium/libraries.ts'
import { LibraryPicker } from './LibraryPicker.tsx'

/** "Cantrip" for level 0, otherwise "Lvl N". */
const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Lvl ${level}`)

/** A search popover to pick a spell from the enabled libraries plus the GM's own. */
export function AddSpellPicker({
  onPick,
  customSpells = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
  label,
  triggerClass,
}: {
  onPick: (s: Spell) => void
  customSpells?: Spell[]
  enabledLibraries?: string[]
  showHomebrew?: boolean
  label: string
  triggerClass: string
}) {
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const load = useCallback(() => {
    if (spells === null) loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [spells])

  return (
    <LibraryPicker
      label={label}
      triggerClass={triggerClass}
      placeholder="Search spells…"
      searchLabel="Search spells"
      entries={spells}
      custom={customSpells}
      enabledLibraries={enabledLibraries}
      showHomebrew={showHomebrew}
      meta={(s) => levelText(s.level)}
      onOpen={load}
      onPick={onPick}
    />
  )
}
