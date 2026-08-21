// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useMemo, useState } from 'react'
import type { Creature } from '../../schema/creature.ts'
import type { Spell } from '../../schema/spell.ts'
import type { EncounterTemplate, TemplateEntry } from '../../schema/encounterTemplate.ts'
import {
  parseTemplate,
  uncopyableCreatures,
  withoutUncopyable,
} from '../../combat/encounterTemplate.ts'
import { parseCreatureTemplate } from '../../combat/creatureTemplate.ts'
import type { CreatureTemplate } from '../../schema/creatureTemplate.ts'
import { SharedCreature } from './SharedCreature.tsx'
import { fetchShare } from '../../state/shares.ts'
import {
  LICENSE_LABELS,
  effectiveLicense,
  summarizeLicenses,
  type ContentLicense,
} from '../../schema/license.ts'
import { loadLibraries, sourceOfId } from '../../compendium/srd.ts'
import { makeSpellLinker } from '../../compendium/spelllinker.ts'
import { formatCr } from '../../compendium/format.ts'
import { estimateXp } from '../../combat/difficulty.ts'
import { SpellLinkContext } from '../statblock/spellLinkContext.ts'
import { CreatureStatBlock } from '../statblock/CreatureStatBlock.tsx'
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon.tsx'
import { ReportIcon } from '../icons/ReportIcon.tsx'
import { ThemeToggle } from '../icons/ThemeToggle.tsx'
import { Wordmark } from '../shell/Wordmark.tsx'
import { LegalLinks } from '../shell/LegalLinks.tsx'
import { SharedNote } from './SharedNote.tsx'
import { ReportShareDialog } from './ReportShareDialog.tsx'
import { Modal } from '../ui/Modal.tsx'
import { LicenseLink } from '../statblock/LicenseLink.tsx'
import { useSwipePanes } from '../../hooks/useSwipePanes.ts'
import { track, EVENTS } from '../../lib/analytics.ts'
import { useTheme } from '../../hooks/useTheme.ts'
import { Button } from '../ui/primitives.tsx'
import { cx } from '../../lib/cx.ts'

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
  | { state: 'ok'; template: EncounterTemplate; official: boolean }
  | { state: 'creature'; template: CreatureTemplate; official: boolean }
  /**
   * No encounter behind the code.
   *
   * `permanent` when a tombstone says it was taken down. The page says the same sentence
   * either way: a stranger following a link has no business being told that somebody's work
   * was moderated, and the two cases are deliberately indistinguishable. What changes is the
   * advice, because sending them to ask for a re-share is sending them to waste somebody's
   * time on something that is not coming back.
   */
  | { state: 'gone'; permanent?: boolean }
  | { state: 'takenDown' }
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
  const [reporting, setReporting] = useState(false)
  /** Open when adding would leave creatures behind, so the reader decides knowing that. */
  const [confirmingAdd, setConfirmingAdd] = useState(false)
  const { ref: panesRef, onScroll: onPanesScroll } = useSwipePanes(pane, setPane)

  // Read the share, then fetch only the libraries its cast actually names.
  useEffect(() => {
    let active = true
    void fetchShare(code).then(async (found) => {
      if (!active) return
      if (found.status === 'takenDown') return setStatus({ state: 'gone', permanent: true })
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
      // The second kind under /s/. `kind` was made a namespace for exactly this, so a
      // creature is a branch here rather than a second URL shape or a second table.
      if (found.kind === 'creature') {
        const { template, error } = parseCreatureTemplate(found.data)
        if (!template) return setStatus({ state: 'unreadable', message: error ?? '' })
        setStatus({ state: 'creature', template, official: found.official })
        track(EVENTS.encounterLinkOpened)
        const sources = template.ref ? [sourceOfId(template.ref)] : []
        const library = await loadLibraries(sources)
        if (!active) return
        setCreatures(library.creatures)
        setSpells(library.spells)
        return
      }
      if (found.kind !== 'encounter') {
        return setStatus({
          state: 'unreadable',
          message: 'This link is for something this version of the console can’t open yet.',
        })
      }
      const { template, error } = parseTemplate(found.data)
      if (!template) return setStatus({ state: 'unreadable', message: error ?? '' })
      setStatus({ state: 'ok', template, official: found.official })
      // Counted where the encounter actually resolved, not on arrival: a dead code and a
      // payload this version can't read are the two outcomes worth telling apart from a
      // reader who got what the link promised.
      track(EVENTS.encounterLinkOpened)
      // Always the details first: they carry the encounter's name, which is nowhere else on
      // the page now, and the note that explains what the cast is for.
      setReading({ kind: 'note' })

      // The sources its refs name, plus the ones an embedded creature's spells name — a
      // homebrew boss casting Fireball contributes no source of its own, so an all-homebrew
      // cast would otherwise fetch nothing and show no card for a spell the reader has.
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
  // Ours, according to the database — the publisher holds a byline grant. Never according to
  // the byline, which is a claim anyone can type into a form.
  const official = status.state === 'ok' && status.official

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

  /**
   * What this encounter says about reuse, and what the whole of it comes to.
   *
   * Two separate claims, deliberately. The encounter's own license covers the publisher's
   * expression — the name, the note, the arrangement — and says nothing about the
   * creatures, because collecting a stat block is not adapting it. The summary is the
   * strictest term among everything present, offered as a description of what is here
   * rather than as a grant the encounter makes.
   *
   * A creature the compendium can't resolve contributes nothing, which is why it is left
   * out below: guessing at a license for a stat block nobody can read would be worse than
   * saying the whole is unknown, and saying the whole is unknown is what happens anyway
   * the moment anything is unstated.
   */
  const ownLicense = template?.license ?? 'unstated'
  const summary = useMemo(() => {
    const parts: ContentLicense[] = [ownLicense]
    for (const row of cast) {
      if (row.creature) parts.push(effectiveLicense(row.creature))
      else if (row.entry.quick) parts.push('unstated')
    }
    return summarizeLicenses(parts)
  }, [ownLicense, cast])

  const missing = cast.filter((row) => !row.creature && !row.entry.quick).length
  const uncopyable = template ? uncopyableCreatures(template) : []
  /**
   * Whether anything would reach the board at all. When every creature is one its author
   * asked nobody reuse, the button has nothing to do — offering it and then explaining that
   * it does nothing is worse than not offering it. The encounter stays here to be read,
   * which was its publisher's choice.
   */
  const anythingToAdd = template ? withoutUncopyable(template).entries.length > 0 : false
  const total = cast.reduce((n, row) => n + row.count, 0)

  /**
   * What the encounter is worth, in the experience the books award for beating it.
   *
   * A creature's own number when it has one, and the estimate the difficulty readout already
   * uses when it doesn't — a homebrew stat block and a quick add both have hit points and an
   * armor class, which is what that estimate reads. A creature this compendium can't resolve
   * contributes nothing rather than a guess, which is why the missing line above matters.
   */
  const xp = cast.reduce((sum, row) => {
    const creature = row.creature
    const each = creature
      ? ((row.entry.inLair ? creature.xpLair : undefined) ??
        creature.xp ??
        estimateXp(creature.maxHp, creature.ac))
      : row.entry.quick
        ? estimateXp(row.entry.quick.maxHp, row.entry.quick.ac)
        : 0
    return sum + each * row.count
  }, 0)

  if (status.state === 'creature') {
    const shared = status.template
    const creature =
      shared.creature ?? (shared.ref ? (creatures.find((c) => c.id === shared.ref) ?? null) : null)
    return (
      <Shell>
        <SharedCreature
          template={shared}
          creature={creature}
          official={status.official}
          resolveSpell={resolveSpell}
          linkSpells={linkSpells}
          onAdd={onAdd}
          onReport={() => {
            track(EVENTS.shareReportOpened)
            setReporting(true)
          }}
        />
        {reporting && <ReportShareDialog code={code} onClose={() => setReporting(false)} />}
      </Shell>
    )
  }

  if (status.state !== 'ok') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-slate-600 dark:text-slate-300">
            {status.state === 'loading'
              ? 'Reading the encounter…'
              : status.state === 'gone'
                ? `This shared encounter no longer exists or it never did.${
                    status.permanent
                      ? ''
                      : ' If you received this link from someone, ask them to create the encounter again and share it.'
                  }`
                : status.state === 'takenDown'
                  ? 'This encounter has been taken down.'
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
      {/* The header is the action and the introduction. The encounter's own name belongs with
        its details, one pane over, where the note that explains it is. */}
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            OpenFray is a free combat console for running Dungeons and Dragons 5e sessions. Adding
            this encounter puts its creatures on your board — nothing else about your game changes.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {anythingToAdd && (
              <Button
                variant="primary"
                onClick={() =>
                  uncopyable.length > 0
                    ? setConfirmingAdd(true)
                    : onAdd(withoutUncopyable(template!))
                }
              >
                Use this encounter
              </Button>
            )}
          </div>
        </div>
      </header>

      <div
        ref={panesRef}
        onScroll={onPanesScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden split:grid split:grid-cols-[22rem_minmax(0,1fr)] split:gap-4 split:overflow-visible split:p-4 wide:grid wide:grid-cols-[22rem_minmax(0,1fr)] wide:gap-4 wide:overflow-visible wide:p-6"
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-2 p-4 swipe:w-full swipe:shrink-0 swipe:snap-center split:p-0 wide:p-0">
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            <li>
              <button
                type="button"
                onClick={() => read({ kind: 'note' })}
                className={cx(
                  'w-full px-3 py-2 text-left font-medium',
                  reading?.kind === 'note'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                )}
              >
                Encounter Details
              </button>
            </li>
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
              of the compendium, so {missing === 1 ? 'it' : 'they'} won’t arrive
              {xp > 0 ? ' and the total below leaves them out' : ''}.
            </p>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-auto rounded-lg border border-slate-200 px-4 pb-4 dark:border-slate-800 swipe:w-full swipe:shrink-0 swipe:snap-center">
          <button
            type="button"
            onClick={() => setPane(0)}
            className="mt-2 flex items-center gap-1 self-start text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 split:hidden wide:hidden"
          >
            <ChevronLeftIcon />
            Back
          </button>

          {reading?.kind === 'note' ? (
            <div className="flex flex-1 flex-col pt-4">
              <h1 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {template!.name}
              </h1>
              {template!.note ? (
                <SharedNote>{template!.note}</SharedNote>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  The author of this encounter didn’t leave any additional details about it. You can
                  still add it to your board.
                </p>
              )}
              {/* One line at the foot of the details: who signed it, how big it is, and what
                beating it is worth — the number a Game Master sizing up a link reads first,
                so it is the one thing here set in bold. The byline is the publisher's own
                claim, presented as one: no check mark, no link, nothing that suggests we
                checked it. */}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <p>
                  {template!.by ? `Shared by ${template!.by} · ` : ''}
                  {total} {total === 1 ? 'creature' : 'creatures'}
                  {xp > 0 && (
                    <>
                      {' · '}
                      <strong className="font-semibold text-slate-700 dark:text-slate-200">
                        {xp.toLocaleString()} XP
                      </strong>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Next to the report, because the two say one thing between them: these
                    are somebody else's words, and here is what to do if they are wrong. Our
                    own encounters drop it — telling a reader to be wary of words that are
                    ours reads as boilerplate, and boilerplate is what people learn to skip
                    on the pages that need it. */}
                  {!official && (
                    <span className="italic">
                      Treat any link and information in these notes with caution.
                    </span>
                  )}
                  {/* What the publisher said about their own words. The creatures carry
                    their own on their rows, and the summary after it describes everything
                    present — none of the three is a grant the page makes on anyone's
                    behalf. */}
                  <LicenseLink license={ownLicense} />
                  {summary.kind === 'single' && summary.license !== ownLicense && (
                    <> · Strictest here: {LICENSE_LABELS[summary.license]}</>
                  )}
                  {summary.kind === 'mixed' && <> · Mixed terms, see each creature</>}
                  {/* A form rather than a mailto: the reason and the code travel with it, and
                    it works on a phone with no mail account set up. */}
                  <button
                    type="button"
                    onClick={() => {
                      track(EVENTS.shareReportOpened)
                      setReporting(true)
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <ReportIcon />
                    Report this
                  </button>
                </div>
              </div>
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
      {/* Asked at the moment of deciding rather than noted somewhere above it: a reader
        pressing Add has decided to take this encounter, and what they are about to get is
        less than what is on screen. Adding copies each creature into their own library,
        which is reuse, and one whose author asked that nobody reuse it stays behind. */}
      {confirmingAdd && (
        <Modal
          title="Some creatures stay behind"
          subtitle={
            'The creatures in the list below are not licensed for reuse: either “All rights ' +
            'reserved”, or with no license stated at all, which reserves them the same way. ' +
            'They can be read here but will not be copied to your board. Contact their author ' +
            'to get access to them. If you believe this is a mistake, report this encounter by ' +
            'closing this window and clicking the “Report this” button on the bottom right ' +
            'corner.'
          }
          onClose={() => setConfirmingAdd(false)}
        >
          <ul className="mb-4 list-inside list-disc text-sm text-slate-700 dark:text-slate-200">
            {uncopyable.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setConfirmingAdd(false)
                onAdd(withoutUncopyable(template!))
              }}
            >
              Use the rest
            </Button>
            <Button variant="quiet" onClick={() => setConfirmingAdd(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {reporting && <ReportShareDialog code={code} onClose={() => setReporting(false)} />}
    </Shell>
  )
}

/** The page's frame: the wordmark, the content, and the console's own legal links. */
function Shell({ children }: { children: React.ReactNode }) {
  // Lives here rather than in the page body so the switch is on the dead-link and
  // still-loading screens too, which are the ones a stranger is most likely to land on.
  const [theme, toggleTheme] = useTheme()
  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Adding this encounter swaps the console in over this page, so the wordmark has to
        land where the console's own does: 14px down. The padding is 10 rather than 14
        because the theme switch is 36px against the wordmark's 28, and `items-center`
        spends the other 4 centring it. */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <Wordmark className="flex items-center gap-2.5 text-xl font-semibold tracking-tight transition-opacity hover:opacity-80" />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      {children}
      <LegalLinks
        as="footer"
        className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:px-6"
      />
    </div>
  )
}
