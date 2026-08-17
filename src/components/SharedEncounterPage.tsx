// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useMemo, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { EncounterTemplate, TemplateEntry } from '../schema/encounterTemplate.ts'
import { parseTemplate } from '../combat/encounterTemplate.ts'
import { fetchShare } from '../state/shares.ts'
import { loadLibraries, sourceOfId } from '../compendium/srd.ts'
import { makeSpellLinker } from '../compendium/spelllinker.ts'
import { formatCr } from '../compendium/format.ts'
import { SpellLinkContext } from './spellLinkContext.ts'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { CrossedSwordsIcon } from './CrossedSwordsIcon.tsx'
import { SharedNote } from './SharedNote.tsx'
import { useSwipePanes } from '../hooks/useSwipePanes.ts'
import { Button } from './ui.tsx'
import { cx } from '../lib/cx.ts'

/**
 * What a shared link opens: the encounter, read-only.
 *
 * Not the console with a dialog over it. A stranger's link should not boot someone else's
 * session, hydrate their fight from the cloud and start an autosave just to ask them a
 * question — and most people opening one of these are not Game Masters mid-fight. Some have
 * never seen the console. So this is its own screen, split out of the bundle like the player
 * view, showing a real encounter and then offering to open it.
 *
 * It is inert by construction rather than by hiding buttons: nothing here dispatches, rolls,
 * edits or logs. The only interactions are choosing what the right pane reads and hovering a
 * spell for its card — both of which are reading, not play.
 */

/** What the page is doing, or why it can't. */
type Status =
  | { state: 'loading' }
  | { state: 'ok'; template: EncounterTemplate }
  | { state: 'gone' }
  | { state: 'unreadable'; message: string }

/** The right pane reads one of these: the note, or a creature from the cast. */
type Reading = { kind: 'note' } | { kind: 'creature'; index: number }

/** One line of the cast, resolved against the compendium (or embedded homebrew). */
interface CastRow {
  entry: TemplateEntry
  creature: Creature | null
  name: string
  count: number
  side: 'friend' | 'foe'
}

const SIDE_TONE: Record<'friend' | 'foe', string> = {
  friend: 'text-emerald-700 dark:text-emerald-300',
  foe: 'text-rose-700 dark:text-rose-300',
}

export function SharedEncounterPage({
  code,
  onAdd,
}: {
  code: string
  /** Open the console with this cast staged. Absent while the page is still loading. */
  onAdd: (template: EncounterTemplate) => void
}) {
  const [status, setStatus] = useState<Status>({ state: 'loading' })
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [spells, setSpells] = useState<Spell[]>([])
  const [reading, setReading] = useState<Reading | null>(null)
  const [pane, setPane] = useState(0)
  const { ref: panesRef, onScroll: onPanesScroll } = useSwipePanes(pane, setPane)

  // Read the share, then fetch only the libraries its cast actually names.
  useEffect(() => {
    let active = true
    void fetchShare(code).then(async (found) => {
      if (!active) return
      if (found.status === 'missing') return setStatus({ state: 'gone' })
      if (found.status !== 'ok') {
        return setStatus({
          state: 'unreadable',
          message:
            found.status === 'unavailable'
              ? 'Shared encounters aren’t set up on this server yet.'
              : 'Couldn’t reach the server. Try the link again in a moment.',
        })
      }
      if (found.kind !== 'encounter') {
        return setStatus({
          state: 'unreadable',
          message: 'This link is for something this version of the console can’t open yet.',
        })
      }
      const { template, error } = parseTemplate(found.data)
      if (!template) return setStatus({ state: 'unreadable', message: error ?? '' })
      setStatus({ state: 'ok', template })
      setReading(template.note ? { kind: 'note' } : { kind: 'creature', index: 0 })

      // Which libraries this cast actually needs — the sources its refs name, plus the ones
      // an embedded creature's spells name. That second half is easy to forget and reads as
      // a coverage gap when it bites: a homebrew boss that casts Fireball contributes no
      // source of its own, so an all-homebrew cast used to fetch nothing at all and show no
      // spell cards for spells the reader plainly has.
      const sources = [
        ...new Set(
          template.entries.flatMap((e) => [
            ...(e.ref ? [sourceOfId(e.ref)] : []),
            ...(e.creature?.spellcasting?.groups ?? []).flatMap((g) =>
              g.spells.flatMap((s) => (s.ref ? [sourceOfId(s.ref)] : [])),
            ),
          ]),
        ),
      ]
      const library = await loadLibraries(sources)
      if (!active) return
      setCreatures(library.creatures)
      setSpells(library.spells)
    })
    return () => {
      active = false
    }
  }, [code])

  const template = status.state === 'ok' ? status.template : null

  /** The cast, with each entry resolved to the stat block it names. */
  const cast = useMemo((): CastRow[] => {
    if (!template) return []
    const byId = new Map(creatures.map((c) => [c.id, c]))
    return template.entries.map((entry) => {
      const creature = entry.creature ?? (entry.ref ? (byId.get(entry.ref) ?? null) : null)
      return {
        entry,
        creature,
        name: entry.quick?.name ?? creature?.name ?? 'Unknown creature',
        count: entry.count,
        side: entry.side,
      }
    })
  }, [template, creatures])

  const resolveSpell = useMemo(() => {
    const byId = new Map(spells.map((s) => [s.id, s]))
    return (ref?: string) => (ref ? byId.get(ref) : undefined)
  }, [spells])

  const linkSpells = useMemo(
    () => makeSpellLinker(spells.map((s) => ({ name: s.name, ref: s.id }))),
    [spells],
  )

  /** Select what the right pane reads, and on a phone slide over to it. */
  const read = (next: Reading) => {
    setReading(next)
    setPane(1)
  }

  const missing = cast.filter((row) => !row.creature && !row.entry.quick).length
  const total = cast.reduce((n, row) => n + row.count, 0)

  if (status.state !== 'ok') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-slate-600 dark:text-slate-300">
            {status.state === 'loading'
              ? 'Reading the encounter…'
              : status.state === 'gone'
                ? 'This encounter isn’t here any more. Links shared from a signed-out console stop working after 60 days — ask whoever sent it for a new one.'
                : status.message}
          </p>
          {status.state !== 'loading' && (
            <Button
              variant="primary"
              onClick={() => (window.location.href = import.meta.env.BASE_URL)}
            >
              Open the console
            </Button>
          )}
        </div>
      </Shell>
    )
  }

  const selected = reading?.kind === 'creature' ? cast[reading.index] : undefined

  return (
    <Shell>
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
              {template!.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {/* A byline is the publisher's own claim, presented as one: no check mark, no
                  link, nothing that suggests we verified it. */}
              {template!.by ? `Encounter by ${template!.by} · ` : ''}
              {total} {total === 1 ? 'creature' : 'creatures'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => onAdd(template!)}>
              Add to my board
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          OpenFray is a free combat console for running DnD 5e fights. Adding this puts its
          creatures on your board — nothing else about your game changes.
        </p>
      </header>

      <div
        ref={panesRef}
        onScroll={onPanesScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden split:grid split:grid-cols-[22rem_minmax(0,1fr)] split:gap-4 split:overflow-visible split:p-4 wide:grid wide:grid-cols-[22rem_minmax(0,1fr)] wide:gap-4 wide:overflow-visible wide:p-6"
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-2 p-4 swipe:w-full swipe:shrink-0 swipe:snap-center split:p-0 wide:p-0">
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {template!.note && (
              <li>
                <button
                  type="button"
                  onClick={() => read({ kind: 'note' })}
                  className={cx(
                    'w-full px-3 py-2 text-left text-sm font-medium',
                    reading?.kind === 'note'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                  )}
                >
                  Notes
                </button>
              </li>
            )}
            {cast.map((row, index) => (
              <li key={`${row.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => read({ kind: 'creature', index })}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                    reading?.kind === 'creature' && reading.index === index
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                  )}
                >
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate">{row.name}</span>
                    {row.count > 1 && (
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        ×{row.count}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <span className={SIDE_TONE[row.side]}>
                      {row.side === 'friend' ? 'Ally' : 'Foe'}
                    </span>
                    {row.creature && (
                      <span className="text-slate-400 dark:text-slate-500">
                        CR {formatCr(row.creature.cr)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {missing > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {missing === 1 ? 'One creature isn’t' : `${missing} creatures aren’t`} in this version
              of the compendium, so {missing === 1 ? 'it' : 'they'} won’t arrive.
            </p>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-auto rounded-lg border border-slate-200 px-4 pb-4 dark:border-slate-800 swipe:w-full swipe:shrink-0 swipe:snap-center">
          <button
            type="button"
            onClick={() => setPane(0)}
            className="mt-2 flex items-center gap-1 self-start text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 split:hidden wide:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>

          {reading?.kind === 'note' && template!.note ? (
            <div className="pt-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notes</h2>
              {/* Provenance, not a warning about links: the allowlist already made them
                  unclickable, and the useful thing to say is whose words these are. */}
              <p className="mb-2 mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                Written by whoever shared this link, not by OpenFray. Treat any address in it the
                way you’d treat one from a stranger.
              </p>
              <SharedNote>{template!.note}</SharedNote>
            </div>
          ) : selected?.creature ? (
            <SpellLinkContext.Provider value={linkSpells}>
              <CreatureStatBlock creature={selected.creature} resolveSpell={resolveSpell} />
            </SpellLinkContext.Provider>
          ) : selected?.entry.quick ? (
            <div className="space-y-1 pt-4">
              <h2 className="text-lg font-semibold">{selected.entry.quick.name}</h2>
              <p className="text-sm italic text-slate-500 dark:text-slate-400">
                A quick add — a name and two numbers, with no stat block behind it.
              </p>
              <p className="text-sm">
                Armor class {selected.entry.quick.ac} · {selected.entry.quick.maxHp} hit points
              </p>
            </div>
          ) : (
            <p className="pt-4 text-sm text-slate-500 dark:text-slate-400">
              {selected
                ? 'This creature isn’t in this version of the compendium, so there’s no stat block to read.'
                : 'Pick a creature to read its stat block.'}
            </p>
          )}
        </div>
      </div>
    </Shell>
  )
}

/** The page's frame: the wordmark, the content, and the console's own legal links. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="/"
        title="OpenFray home"
        className="flex items-center gap-2.5 px-4 py-3 text-lg font-bold tracking-tight transition-opacity hover:opacity-80 md:px-6"
      >
        <CrossedSwordsIcon className="h-6 w-6 text-indigo-400" />
        <span>
          <span className="text-indigo-500 dark:text-indigo-400">Open</span>
          <span>Fray</span>
        </span>
      </a>
      {children}
      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:px-6">
        <a href="/privacy">Privacy</a>
        <span>·</span>
        <a href="/terms">Terms</a>
        <span>·</span>
        <a href="https://github.com/OpenFrayApp/console" target="_blank" rel="noreferrer">
          Source
        </a>
        <span>·</span>
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">
          AGPL-3.0
        </a>
        <span className="ml-auto">
          <a href={`mailto:hello@openfray.app?subject=Reported%20encounter`}>Report this</a>
        </span>
      </footer>
    </div>
  )
}
