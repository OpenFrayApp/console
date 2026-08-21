// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { WriteResult } from '../../state/cloudEncounter.ts'
import type { PublishResult } from '../../state/shares.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { popoverClass } from '../ui/popover.ts'
import type { ContentLicense } from '../../schema/license.ts'
import { ShareIcon } from '../icons/ShareIcon.tsx'
import { ShareEncounterDialog } from '../share/ShareEncounterDialog.tsx'
import { Button } from '../ui/primitives.tsx'

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
/**
 * The board's share control: an icon, and the dialog it opens.
 *
 * The dialog is its own component in its own file — what a Game Master is doing when they
 * publish has nothing to do with where the button sits, and keeping the two together is how
 * this file ended up holding a form.
 */
export function ShareEncounterButton({
  canShare,
  signedIn,
  defaultByline,
  defaultLicense = 'unstated',
  restricted = [],
  canDropRestricted = true,
  allowReserved = false,
  onShare,
  onSignIn,
}: {
  /** Whether the board holds any creature worth publishing. */
  canShare: boolean
  signedIn: boolean
  defaultByline: string
  defaultLicense?: ContentLicense
  restricted?: string[]
  canDropRestricted?: boolean
  allowReserved?: boolean
  onShare: (draft: {
    name: string
    note: string
    by: string
    license: ContentLicense
  }) => Promise<PublishResult>
  /** Opens the account screen, for the dialog to offer when signed out. */
  onSignIn: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share this encounter"
        title="Share this encounter"
        disabled={!canShare}
        className={ICON_BTN}
      >
        <ShareIcon />
      </button>

      {open && (
        <ShareEncounterDialog
          signedIn={signedIn}
          defaultByline={defaultByline}
          defaultLicense={defaultLicense}
          restricted={restricted}
          canDropRestricted={canDropRestricted}
          allowReserved={allowReserved}
          onShare={onShare}
          onSignIn={onSignIn}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
