// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../../schema/creature.ts'
import type { CreatureTemplate } from '../../schema/creatureTemplate.ts'
import type { EncounterTemplate } from '../../schema/encounterTemplate.ts'
import type { ResolveSpell } from '../statblock/Markdown.tsx'
import { SpellLinkContext } from '../statblock/spellLinkContext.ts'
import { CreatureStatBlock } from '../statblock/CreatureStatBlock.tsx'
import { SharedNote } from './SharedNote.tsx'
import { mayCopy } from '../../schema/license.ts'
import { Button } from '../ui/primitives.tsx'

/**
 * What a shared creature link opens: one stat block, read-only, and the offer to keep it.
 *
 * The same page the shared encounter uses, with one creature in place of a cast — the shell,
 * the theme, the footer and the report all come from there. What differs is that a creature
 * has no list to browse, so the stat block takes the width and the note sits under it.
 *
 * A library creature travels as a reference and resolves against the compendium the app
 * ships, not against whatever the reader has switched on in settings — so a shared Tome of
 * Beasts creature reads and adds for anybody. The one case that fails is a library this
 * version doesn't carry at all, where the page says so and offers nothing else.
 */

/** A flag: the mark this reader is putting on something for somebody else to look at. */
function ReportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3.5 w-3.5"
    >
      <path d="M4 21V4" />
      <path d="M4 4h11l-1.5 3.5L15 11H4" />
    </svg>
  )
}

export function SharedCreature({
  template,
  creature,
  official,
  resolveSpell,
  linkSpells,
  onAdd,
  onReport,
}: {
  template: CreatureTemplate
  /** Resolved against the reader's own compendium, or null when they haven't got it. */
  creature: Creature | null
  official: boolean
  resolveSpell: ResolveSpell
  linkSpells: (text: string) => string
  /** Adding one creature is adding an encounter of one, which is already a solved path. */
  onAdd: (template: EncounterTemplate) => void
  onReport: () => void
}) {
  /**
   * One creature is an encounter with one entry, so adding it goes through the machinery
   * that already stages a cast until the console's own board has hydrated. Nothing about
   * that sequencing is worth having twice.
   */
  /** Whether the reader may take a copy, as against read what is on the page. */
  const copyable = !creature || mayCopy(creature)

  const add = () => {
    const entry = template.creature
      ? { creature: template.creature, count: 1, side: 'foe' as const }
      : { ref: template.ref!, count: 1, side: 'foe' as const }
    onAdd({ v: 1, name: creature?.name ?? 'Shared creature', entries: [entry] })
  }

  return (
    <>
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            OpenFray is a free combat console for running Dungeons and Dragons 5e sessions. Adding
            this creature puts it on your board — nothing else about your game changes.
          </p>
          {/* Adding a creature copies it into the reader's own library, which is reuse —
            so an author who said nobody may reuse it is taken at their word. The stat block
            stays readable: publishing it was their choice, and reading is not copying. */}
          {creature && copyable && (
            <Button variant="primary" onClick={add}>
              Use this creature
            </Button>
          )}
        </div>
      </header>

      {/* Two columns at the widths that have them, the same shape a shared encounter uses:
        the thing being read takes the space, and the publisher's word about it sits beside
        rather than under, where a long stat block would bury it. Narrow screens stack, note
        first, because somebody who followed a link is told what it is before they scroll. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6 split:grid split:grid-cols-[minmax(0,1fr)_20rem] split:items-start split:overflow-hidden wide:grid wide:grid-cols-[minmax(0,1fr)_22rem] wide:overflow-hidden">
        <div className="order-2 min-w-0 split:order-1 split:h-full split:overflow-y-auto wide:order-1 wide:h-full wide:overflow-y-auto">
          {creature ? (
            <SpellLinkContext.Provider value={linkSpells}>
              <CreatureStatBlock creature={creature} resolveSpell={resolveSpell} strangers />
            </SpellLinkContext.Provider>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This creature isn’t in this version of the compendium
              {template.ref ? ` (${template.ref})` : ''}, so there’s no stat block to read.
            </p>
          )}
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800 split:order-2 split:h-full split:overflow-y-auto wide:order-2 wide:h-full wide:overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Creature Details
          </h2>
          {template.note ? (
            <SharedNote>{template.note}</SharedNote>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Whoever shared this left no notes with it.
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {/* Shared by, never "creature by": whoever published this may have written it,
              or may have found it in a book, or been sent it by somebody else. What the
              byline can honestly claim is that they are the one who put it here.
              The license is not repeated here — the stat block's own source line carries it
              for every creature, and a page with one creature on it has no second place
              that needs telling. */}
            <p>{template.by ? `Shared by ${template.by}` : ''}</p>
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropped from our own, as on a shared encounter: telling a reader to be
                wary of words that are ours reads as boilerplate, and boilerplate is what
                people learn to skip on the pages that need it. */}
              {!official && template.note && (
                <span className="italic">
                  Treat any link and information in these notes with caution.
                </span>
              )}
              <button
                type="button"
                onClick={onReport}
                className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <ReportIcon />
                Report this
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
