// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import type { MyShares } from '../../state/shares.ts'
import { shareUrl } from '../../state/shareCode.ts'
import { useCopyLink } from '../../hooks/useCopyLink.ts'
import { CopyIcon } from '../icons/CopyIcon.tsx'
import { OpenIcon } from '../icons/OpenIcon.tsx'
import { UnpublishIcon } from '../icons/UnpublishIcon.tsx'
import { Button, LinkButton } from '../ui/primitives.tsx'

/**
 * Everything this Game Master has published, as a screen rather than a dialog.
 *
 * A modal was the wrong shape once these could accumulate: it is somewhere you glance and
 * dismiss, and this is somewhere you work — find one link among forty, copy it, open it to
 * check what a reader sees, take one down. So it takes the whole console body, with the room
 * that gives for a page at a time and for controls that say what they do.
 *
 * It belongs to the account rather than to the board: a link outlives the encounter it came
 * from, and "what have I put out there" is a question about the person, not about tonight's
 * game. Nothing here ages out, so this screen is the only thing that says what is still up.
 */

/** How many links a page holds. Enough to scan without becoming a scroll. */
const PER_PAGE = 10

/** What a share is, in a word, so a mixed list reads at a glance. */
const KIND_LABEL: Record<string, string> = { encounter: 'Encounter', creature: 'Creature' }

export function SharedLinksPage({
  shares,
  onUnpublish,
  onClose,
}: {
  shares: MyShares
  onUnpublish: (code: string) => void
  onClose: () => void
}) {
  // Keyed by the row's code, so only the copied row says so. No failure notice
  // here: a blocked clipboard is survivable, the link is on screen to select by hand.
  const { copied, copy } = useCopyLink()
  const [page, setPage] = useState(0)

  const links = shares.status === 'ok' ? shares.shares : []
  const pages = Math.max(1, Math.ceil(links.length / PER_PAGE))
  // Clamped rather than stored: taking down the last link on the last page would otherwise
  // leave the reader on a page that no longer exists.
  const current = Math.min(page, pages - 1)
  const shown = links.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE)

  const date = (iso: string) => {
    const at = new Date(iso)
    return Number.isNaN(at.getTime())
      ? ''
      : at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shared links"
      className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950"
    >
      {/* The shell Account and Settings use, one step wider: the same screen a Game Master
        already knows, and a list of links with three controls a row needs the room. */}
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Shared links
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Anyone with one of these can read it and add it to their own board. They stand until
              you take them down.
            </p>
          </div>
          <Button className="shrink-0" onClick={onClose}>
            Done
          </Button>
        </div>

        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          {shares.status === 'unavailable' ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sharing isn’t set up on this server yet.
            </p>
          ) : shares.status === 'failed' ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Couldn’t load your links. Try again in a moment.
            </p>
          ) : links.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing published yet. Share an encounter or a creature, and its link waits here.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {shown.map((share) => (
                  <li key={share.code} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="truncate font-medium">{share.name}</span>
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {KIND_LABEL[share.kind] ?? share.kind}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          Shared {date(share.createdAt)}
                        </span>
                      </div>
                      <div className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {shareUrl(share.code)}
                      </div>
                    </div>

                    {/* Icon and word both: the screen has the room, and an icon alone makes
                      a destructive control a guess. */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {/* A button is not a flex container by default, so an icon and a
                        label stack rather than sit side by side. */}
                      <Button
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => copy(shareUrl(share.code), share.code)}
                      >
                        <CopyIcon />
                        {copied === share.code ? 'Copied' : 'Copy'}
                      </Button>
                      {/* A real link, because only one opens a new tab — and checking
                        what a reader sees must not take the Game Master off their board. */}
                      <LinkButton
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        href={shareUrl(share.code)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <OpenIcon />
                        Open
                      </LinkButton>
                      <Button
                        size="sm"
                        variant="danger"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => {
                          // Named, because a link taken down by mistake can't be put back:
                          // the code is drawn fresh every time, so republishing makes a
                          // different link and anywhere the old one was pasted stays broken.
                          if (
                            window.confirm(
                              `Take down the link to “${share.name}”? It stops working.`,
                            )
                          ) {
                            onUnpublish(share.code)
                          }
                        }}
                      >
                        <UnpublishIcon />
                        Unpublish
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {pages > 1 && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>
                    {current * PER_PAGE + 1}–{current * PER_PAGE + shown.length} of {links.length}
                  </span>
                  <span className="flex items-center gap-2">
                    <Button size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      disabled={current >= pages - 1}
                      onClick={() => setPage(current + 1)}
                    >
                      Next
                    </Button>
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
