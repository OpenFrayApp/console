// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { WriteResult } from '../state/cloudEncounter.ts'
import type { PublishResult } from '../state/shares.ts'
import { shareUrl } from '../state/shareCode.ts'
import { bylineError } from '../lib/byline.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { popoverClass } from './popover.ts'
import { Button } from './ui.tsx'

/**
 * What a Game Master can do with the board as a whole: keep it, and hand it out.
 *
 * Both sit in the tracker's bottom corner rather than the header, because they are about
 * the board rather than about the app — the same reason the broom and the skull sit with
 * it. Their cards open upward; there is nothing below them.
 *
 * Neither one lists anything. A saved fight is read in the compendium, under Encounters,
 * and the links a Game Master has published are in their account menu. One shelf each,
 * with room to read it.
 */

const FIELD =
  'tap-y w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'

const LABEL = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200'

const ICON_BTN =
  'tap flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

/** A floppy disk: the one icon everybody still reads as "save", long after the disks went. */
function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      {/* The body, with the corner the shutter cuts off. */}
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      {/* The label, and the metal shutter above it. */}
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  )
}

/** The share graph — deliberately not the screen icon, which is the player view's. */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

/** The shell both controls wear: an icon button whose card opens upward. */
function CornerPopover({
  label,
  icon,
  disabled,
  children,
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
  /** Rendered with a `close` it can call once its work is done. */
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={label}
        title={label}
        aria-expanded={open}
        disabled={disabled}
        className={ICON_BTN}
      >
        {icon}
      </button>
      {open && (
        <div className={`${popoverClass('roomy:w-80', 'left', 'above')} p-3`}>
          {children(close)}
        </div>
      )}
    </div>
  )
}

/**
 * Keep the fight as it stands — the party, the hit points, the log — under a name.
 *
 * Saving is always a new row, so "before the boss" and "after" are two things to come back
 * to. Where it went is the message, because the moment after saving is the only moment a
 * Game Master goes looking for that answer.
 */
export function SaveFightButton({
  canSave,
  signedIn,
  onSave,
  onSignIn,
}: {
  /** Whether there is anyone on the board worth keeping. */
  canSave: boolean
  signedIn: boolean
  onSave: (name: string) => Promise<WriteResult>
  onSignIn: () => void
}) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const result = await onSave(trimmed)
    setBusy(false)
    if (result === 'ok') {
      setName('')
      setMessage(`Saved “${trimmed}”. Find it in the compendium, under Encounters.`)
    } else if (result === 'unavailable') {
      // Nothing the Game Master can do about this one, so don't send them round again.
      setMessage('Saved encounters aren’t set up on this server yet.')
    } else {
      setMessage('Couldn’t save that. Try again.')
    }
  }

  return (
    <CornerPopover label="Save this encounter" icon={<SaveIcon />}>
      {() => (
        <>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Save this encounter
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            The board as it stands — the party, the hit points, the log — kept to come back to in a
            later session.
          </p>
          {signedIn ? (
            <form onSubmit={save} className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="save-fight-name" className={LABEL}>
                  Name
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
                Saving an encounter needs an account, so it can follow you to the next session.
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
        </>
      )}
    </CornerPopover>
  )
}

/**
 * Publish the board's cast under a link.
 *
 * What travels is the creatures and nothing else — no hit points, no effects, no party, no
 * log — and that is said plainly above the fields, because a Game Master should never have
 * to guess what they just handed a stranger.
 */
export function ShareEncounterButton({
  canShare,
  signedIn,
  defaultByline,
  allowReserved = false,
  onShare,
}: {
  /** Whether the board holds any creature worth publishing. */
  canShare: boolean
  signedIn: boolean
  /** The byline they published under last time, remembered device-locally. */
  defaultByline: string
  /**
   * Whether this account has been granted the reserved names — the app's own and the
   * maintainer's. Read from the database at sign-in, so the person it belongs to is named
   * nowhere in this repository.
   */
  allowReserved?: boolean
  onShare: (draft: { name: string; note: string; by: string }) => Promise<PublishResult>
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [by, setBy] = useState(defaultByline)
  /**
   * The account's name arrives after this control has mounted — the board renders long
   * before the session resolves — so seeding the field once at mount left it empty for
   * every signed-in Game Master. It follows the account until the Game Master types
   * something, and then it is theirs; the same derived-state idiom the add controls use for
   * their open requests.
   */
  const [lastDefault, setLastDefault] = useState(defaultByline)
  if (defaultByline !== lastDefault) {
    setLastDefault(defaultByline)
    if (by === lastDefault) setBy(defaultByline)
  }
  const [message, setMessage] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const problem = by.trim() ? bylineError(by, { allowReserved }) : null

  const publish = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy || problem) return
    setBusy(true)
    const result = await onShare({ name: name.trim(), note: note.trim(), by: by.trim() })
    setBusy(false)
    if (result.status === 'ok') {
      setLink(shareUrl(result.code))
      setMessage(null)
      setName('')
      setNote('')
    } else if (result.status === 'tooBig') {
      setMessage('This encounter is too big to share. Try it without the homebrew creatures.')
    } else if (result.status === 'unavailable') {
      setMessage('Sharing isn’t set up on this server yet.')
    } else {
      setMessage('Couldn’t publish that. Try again.')
    }
  }

  /** Put the link on the clipboard, and say so briefly. */
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setMessage('Couldn’t copy. Select the link and copy it yourself.')
    }
  }

  return (
    <CornerPopover label="Share this encounter" icon={<ShareIcon />} disabled={!canShare}>
      {(close) => (
        <>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Share this encounter
          </h2>
          {!link && (
            <form onSubmit={publish} className="mt-2 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                A link anyone can open to put these creatures on their own board. The creatures
                travel and nothing else — no hit points, no effects, no players, no log.
              </p>
              <div>
                <label htmlFor="share-name" className={LABEL}>
                  Name
                </label>
                <input
                  id="share-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Goblin ambush"
                  autoComplete="off"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="share-note" className={LABEL}>
                  Note (optional)
                </label>
                <textarea
                  id="share-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="How the encounter opens, what the boss does first…"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="share-by" className={LABEL}>
                  Your name (optional)
                </label>
                <input
                  id="share-by"
                  value={by}
                  onChange={(e) => setBy(e.target.value)}
                  placeholder="Shown as “Encounter by …”"
                  autoComplete="off"
                  className={FIELD}
                />
                {problem && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{problem}</p>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Whoever opens the link reads the note, so keep your spoilers out of it. The link
                stops working after 60 days.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={busy || !name.trim() || !!problem}
              >
                Publish
              </Button>
            </form>
          )}

          {link && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                Published. Anyone with this link can add it to their board.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  aria-label="Share link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="tap-y min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
                <Button size="sm" onClick={() => void copy(link)}>
                  {copied === link ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {signedIn
                  ? 'Your links are in the account menu, under Shared encounters. This one stops working after 60 days.'
                  : 'Signed out, this link stops working after 60 days and isn’t listed anywhere. Sign in before sharing to keep it on your account, where you can take it down early.'}
              </p>
              <Button
                variant="quiet"
                onClick={() => {
                  setLink(null)
                  close()
                }}
              >
                Done
              </Button>
            </div>
          )}

          {message && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </CornerPopover>
  )
}
