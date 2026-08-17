// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { Campaign } from '../schema/campaign.ts'
import type { SavedFights, WriteResult } from '../state/cloudEncounter.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { popoverClass } from './popover.ts'
import { Button } from './ui.tsx'
import { cx } from '../lib/cx.ts'

/**
 * Saved encounters: keep the fight as it stands, and bring one back.
 *
 * It lives in the header rather than beside the board's broom and skull because those hide
 * once combat starts, and mid-session is exactly when a fight gets saved — the party is
 * three rounds deep and Tuesday is over.
 *
 * Two ways back in, and the difference matters. **Restore** puts the whole encounter back as
 * it was, party and hit points and log included, which is what makes several campaigns
 * bearable. **Add creatures** takes only the cast, fresh, onto whatever board is already
 * there — the same ambush next week, against this week's party.
 */

/** Bookmark — a fight kept to come back to. */
function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

const FIELD =
  'tap-y w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'

/** The day a fight was saved, short enough for a list row. */
function savedWhen(iso: string): string {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  return when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function EncountersMenu({
  fights,
  campaigns,
  canSave,
  signedIn,
  onOpen,
  onSave,
  onRestore,
  onAddCast,
  onDelete,
  onSignIn,
}: {
  /** The saved list, or why there isn't one — "none yet" and "not set up" read differently. */
  fights: SavedFights
  /** For the campaign tag on a row; empty when anonymous. */
  campaigns: Campaign[]
  /** Whether there is anything on the board worth saving. */
  canSave: boolean
  signedIn: boolean
  /** Refresh the list — the menu opening is the cheapest moment to ask. */
  onOpen?: () => void
  onSave: (name: string) => Promise<WriteResult>
  /** Put the whole fight back; false when the blob couldn't be read. */
  onRestore: (id: string) => Promise<boolean>
  /**
   * Add just the cast to the board in hand: how many arrived, and any creature that couldn't
   * be found — a library the app no longer ships. Null when the encounter couldn't be read.
   */
  onAddCast: (id: string) => Promise<{ added: number; missing: string[] } | null>
  onDelete: (id: string) => void
  onSignIn: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const toggle = () => {
    setOpen((was) => {
      if (!was) {
        setMessage(null)
        onOpen?.()
      }
      return !was
    })
  }

  /** Save the board under the typed name. A blank name is a no-op, not an error. */
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const result = await onSave(trimmed)
    setBusy(false)
    if (result === 'ok') {
      setName('')
      setMessage(`Saved “${trimmed}”.`)
    } else if (result === 'unavailable') {
      // Nothing the Game Master can do about this one, so don't send them round again.
      setMessage('Saved encounters aren’t set up on this server yet.')
    } else {
      setMessage('Couldn’t save that. Try again.')
    }
  }

  /** Restore a whole fight, once the Game Master has agreed to lose the board in hand. */
  const restore = async (id: string, label: string) => {
    if (
      !window.confirm(
        `Replace the board with “${label}”? Whatever is on it now goes, and the fight in progress isn’t saved.`,
      )
    ) {
      return
    }
    setBusy(true)
    const ok = await onRestore(id)
    setBusy(false)
    if (ok) close()
    else setMessage('Couldn’t read that encounter. Try again.')
  }

  /** Add the cast of a saved fight to the board in hand, leaving the party alone. */
  const addCast = async (id: string) => {
    setBusy(true)
    const result = await onAddCast(id)
    setBusy(false)
    if (!result) {
      setMessage('Couldn’t read that encounter. Try again.')
    } else if (result.added === 0 && result.missing.length === 0) {
      setMessage('That encounter has no creatures to add.')
    } else if (result.missing.length > 0) {
      // Never silently short a Game Master a monster: they'd find out mid-fight.
      const n = result.missing.length
      setMessage(
        `Added ${result.added}. ${n === 1 ? 'One creature' : `${n} creatures`} ${
          n === 1 ? 'isn’t' : 'aren’t'
        } in your compendium any more.`,
      )
    } else {
      close()
    }
  }

  /** Delete a saved fight, naming it so nobody loses the wrong one. */
  const remove = (id: string, label: string) => {
    if (window.confirm(`Delete “${label}”? This can’t be undone.`)) onDelete(id)
  }

  const list = fights.status === 'ok' ? fights.fights : []

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Saved encounters"
        title="Saved encounters"
        aria-expanded={open}
        className={cx(
          'tap flex h-9 w-9 items-center justify-center rounded-md border',
          'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
        )}
      >
        <BookmarkIcon />
      </button>

      {open && (
        <div className={`${popoverClass('roomy:w-80')} p-3 roomy:mt-2`}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Encounters</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Keep this fight as it stands — the party, the hit points, the log — and come back to it
            in a later session.
          </p>

          {signedIn ? (
            <form onSubmit={save} className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="save-fight-name"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  Save this fight
                </label>
                <input
                  id="save-fight-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name it"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className={FIELD}
                />
              </div>
              <Button type="submit" variant="primary" disabled={!canSave || busy || !name.trim()}>
                Save
              </Button>
            </form>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Saving a fight needs an account, so it can follow you to the next session.
              </p>
              <div className="mt-2">
                <Button variant="primary" onClick={onSignIn}>
                  Sign in
                </Button>
              </div>
            </div>
          )}

          {!canSave && signedIn && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add someone to the board first.
            </p>
          )}

          {message && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300" role="status">
              {message}
            </p>
          )}

          {signedIn && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              {fights.status === 'unavailable' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saved encounters aren’t set up on this server yet.
                </p>
              ) : fights.status === 'failed' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Couldn’t load your saved encounters. Reopen this menu to try again.
                </p>
              ) : list.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No saved encounters yet. Build a board, then save it here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((fight) => {
                    const campaign = campaigns.find((c) => c.id === fight.campaignId)
                    return (
                      <li key={fight.id} className="text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                            {fight.name}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                            {savedWhen(fight.savedAt)}
                          </span>
                        </div>
                        {campaign && (
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {campaign.name}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => restore(fight.id, fight.name)}
                          >
                            Restore
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => addCast(fight.id)}>
                            Add creatures
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => remove(fight.id, fight.name)}
                          >
                            Delete
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
