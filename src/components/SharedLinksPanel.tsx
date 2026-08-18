// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import type { MyShares } from '../state/shares.ts'
import { shareUrl } from '../state/shareCode.ts'
import { Modal } from './Modal.tsx'
import { Button } from './ui.tsx'

/**
 * The encounters this Game Master has published, and the way to take one down.
 *
 * It belongs to the account rather than to the board: a link outlives the fight it came
 * from, and "what have I put out there" is a question about the person, not about tonight's
 * game. Anonymous publishers have no list at all — their rows carry no owner, which is also
 * why those links expire on their own.
 */
export function SharedLinksPanel({
  shares,
  onUnpublish,
  onClose,
}: {
  shares: MyShares
  onUnpublish: (code: string) => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  /** Put a link on the clipboard, and mark that row briefly. */
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // A blocked clipboard is survivable: the link is on screen to select by hand.
      setCopied(null)
    }
  }

  const links = shares.status === 'ok' ? shares.shares : []

  return (
    <Modal
      title="Shared encounters"
      subtitle="Links you've published. Anyone with one can add its creatures to their own board."
      onClose={onClose}
    >
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
          Nothing published yet. Share an encounter from the board, and its link waits here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {links.map((share) => (
            <li key={share.code} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{share.name}</div>
                <div className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                  {shareUrl(share.code)}
                </div>
              </div>
              <Button size="sm" onClick={() => void copy(share.code)}>
                {copied === share.code ? 'Copied' : 'Copy'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  // Naming it, because a link taken down by mistake can't be put back: the
                  // code is drawn fresh every time, so republishing makes a different link.
                  if (window.confirm(`Take down the link to “${share.name}”? It stops working.`)) {
                    onUnpublish(share.code)
                  }
                }}
              >
                Unpublish
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
