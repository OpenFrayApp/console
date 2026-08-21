// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import type { CastLine } from '../combat/encounterTemplate.ts'
import type { SavedFightSummary } from '../state/cloudEncounter.ts'
import { SECTION_HEADING } from './CreatureStatBlock.tsx'
import { Button } from './ui.tsx'
import { EditableField } from './EditableField.tsx'

/**
 * A saved fight, read rather than run: what was on the board, when it was saved, and the two
 * ways back in.
 *
 * The cast is grouped and counted, so a Game Master can tell one goblin ambush from another
 * without restoring either. The party is listed separately because it is the half that only
 * comes back with a Restore — Add creatures deliberately leaves it behind.
 */

/** One group of the cast: "Goblin ×4". */
function CastGroup({ heading, lines }: { heading: string; lines: CastLine[] }) {
  if (lines.length === 0) return null
  return (
    <div>
      <h4 className={SECTION_HEADING}>{heading}</h4>
      <ul className="text-sm text-slate-700 dark:text-slate-200">
        {lines.map((line) => (
          <li key={`${line.kind}-${line.name}`}>
            {line.name}
            {line.count > 1 && (
              <span className="text-slate-500 dark:text-slate-400"> ×{line.count}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SavedFightCard({
  fight,
  campaignName,
  cast,
  round,
  onRename,
  onRestore,
  onAddCast,
  onDelete,
}: {
  fight: SavedFightSummary
  /** The campaign it was saved under, when it still exists. */
  campaignName?: string
  /** The cast, or null while it is being read — the blob only loads when asked for. */
  cast: CastLine[] | null
  /** The round it was saved on; 0 means the fight hadn't begun. */
  round: number | null
  onRename: (name: string) => void
  onRestore: () => void
  onAddCast: () => void
  onDelete: () => void
}) {
  const [busy, setBusy] = useState(false)
  const party = cast?.filter((l) => l.kind === 'party') ?? []
  const allies = cast?.filter((l) => l.kind !== 'party' && l.side === 'friend') ?? []
  const foes = cast?.filter((l) => l.kind !== 'party' && l.side === 'foe') ?? []
  const creatures = [...allies, ...foes].reduce((n, l) => n + l.count, 0)

  /** Confirm, then hand the whole board over to this saved fight. */
  const restore = () => {
    if (
      window.confirm(
        `Replace the board with “${fight.name}”? Whatever is on it now goes, and the encounter in progress isn’t saved.`,
      )
    ) {
      setBusy(true)
      onRestore()
    }
  }

  return (
    <div className="flex flex-1 flex-col space-y-3 pt-4">
      <div>
        <h3 className="text-lg font-semibold">
          <EditableField
            initial={fight.name}
            onCommit={(name) => {
              const trimmed = name.trim()
              if (trimmed && trimmed !== fight.name) onRename(trimmed)
            }}
            title="Rename this encounter"
            inputClassName="w-full rounded border border-slate-300 bg-white px-1 text-lg font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            {fight.name}
          </EditableField>
        </h3>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          {[
            campaignName,
            new Date(fight.savedAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            }),
            round && round > 0 ? `saved on round ${round}` : 'saved before the encounter began',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {cast === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Reading the board…</p>
      ) : (
        <>
          <CastGroup heading="Creatures" lines={foes} />
          <CastGroup heading="Allies" lines={allies} />
          <CastGroup heading="Party" lines={party} />
          {cast.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This encounter was saved with an empty board.
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="primary" disabled={busy} onClick={restore}>
          Restore
        </Button>
        <Button
          disabled={busy || creatures === 0}
          title={
            creatures === 0
              ? 'Nothing to add — this encounter has no creatures.'
              : 'Add its creatures to the board you have now'
          }
          onClick={() => {
            setBusy(true)
            onAddCast()
          }}
        >
          Add creatures
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDelete}>
          Delete
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <strong className="font-semibold">Restore</strong> brings the whole encounter back, party
        and hit points included. <strong className="font-semibold">Add creatures</strong> drops only
        its creatures onto the board you have now, at full hit points.
      </p>
    </div>
  )
}
