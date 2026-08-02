// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useState } from 'react'
import type { Spell } from '../schema/spell.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { DEFAULT_ENABLED_LIBRARIES } from '../compendium/libraries.ts'
import type { LibrarySort } from '../state/settings.ts'
import { LibraryPicker } from './LibraryPicker.tsx'
import type { ButtonVariant } from './ui.tsx'

/** "Cantrip" for level 0, otherwise "Lvl N". */
const levelText = (level: number): string => (level === 0 ? 'Cantrip' : `Lvl ${level}`)

/** A search popover to pick a spell from the enabled libraries plus the GM's own. */
export function AddSpellPicker({
  onPick,
  customSpells = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
  librarySort = 'name',
  label,
  variant = 'secondary',
  align = 'right',
}: {
  onPick: (s: Spell) => void
  customSpells?: Spell[]
  enabledLibraries?: string[]
  showHomebrew?: boolean
  /** The compendium's sort setting — 'cr' lists by spell level. */
  librarySort?: LibrarySort
  label: string
  variant?: ButtonVariant
  align?: 'left' | 'right'
}) {
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const load = useCallback(() => {
    if (spells === null) loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [spells])

  return (
    <LibraryPicker
      label={label}
      variant={variant}
      align={align}
      placeholder="Search spells…"
      searchLabel="Search spells"
      entries={spells}
      custom={customSpells}
      enabledLibraries={enabledLibraries}
      showHomebrew={showHomebrew}
      sortKey={librarySort === 'cr' ? (s) => s.level : undefined}
      meta={(s) => levelText(s.level)}
      onOpen={load}
      onPick={onPick}
    />
  )
}
