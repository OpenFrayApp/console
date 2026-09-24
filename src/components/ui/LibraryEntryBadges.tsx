// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Edition } from '../../schema/primitives.ts'
import {
  editionBadgeClass,
  editionLabel,
  librarySource,
  librarySourceBadgeClass,
  libraryTag,
} from '../../compendium/libraries.ts'
import { EntryBadges } from './primitives.tsx'

/** Show a reference's custom, source, and edition badges in the compendium's order. */
export function LibraryEntryBadges({
  entry,
  showEdition = true,
}: {
  entry: { id: string; source?: string; edition?: Edition }
  showEdition?: boolean
}) {
  const custom = entry.id.startsWith('custom:')
  const source = !custom && entry.source ? librarySource(entry.source) : undefined
  const edition = showEdition
    ? custom || !entry.source
      ? entry.edition
      : libraryTag(entry.source)
    : undefined
  return (
    <EntryBadges
      custom={custom}
      source={source}
      sourceTone={entry.source ? librarySourceBadgeClass(entry.source) : undefined}
      edition={edition && editionLabel(edition)}
      editionTone={edition && editionBadgeClass(edition)}
    />
  )
}
