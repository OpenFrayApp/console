// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import type { ClaimResult } from '../../state/cloudEncounter.ts'
import { playerCodeError, playerViewUrl, normalizePlayerCode } from '../../state/playerCode.ts'
import { useCopyLink } from '../../hooks/useCopyLink.ts'
import { CAMPAIGN_BACKGROUNDS } from '../../lib/backgrounds.ts'
import { CopyIcon } from '../icons/CopyIcon.tsx'
import { ICON } from '../icons/icon.ts'
import { OpenIcon } from '../icons/OpenIcon.tsx'
import { FieldHint } from '../ui/FieldHint.tsx'
import { Modal } from '../ui/Modal.tsx'
import { PinInput } from '../ui/PinInput.tsx'
import { Button, IconButton, LinkButton } from '../ui/primitives.tsx'

/** Cast icon — the board sent to the table's screens. */
function CastIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
      <path d="M2 12a9 9 0 0 1 8 8" />
      <path d="M2 16a5 5 0 0 1 4 4" />
      <line x1="2" x2="2.01" y1="20" y2="20" />
    </svg>
  )
}

/** Check icon — the link is on the clipboard. */
function CheckIcon() {
  return (
    <svg {...ICON} className="h-4 w-4">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

const SECTION = 'border-t border-slate-200 pt-3 dark:border-slate-800'
const SECTION_LABEL = 'text-xs font-medium text-slate-700 dark:text-slate-200'

interface SharePanelProps {
  /** The current share code, or null before one exists. */
  code: string | null
  sharing: boolean
  onToggleShare: () => void
  /** Signed in only: claim a chosen name. Absent for an anonymous GM. */
  onClaim?: (code: string) => Promise<ClaimResult>
  /** Open the sign-in screen, for the anonymous nudge toward naming a link. */
  onSignIn: () => void
  /** The four-digit PIN locking the view, or null for an open link. */
  pin?: string | null
  /** Set or clear the PIN; the section only renders when the caller handles it. */
  onSetPin?: (pin: string | null) => void
  /** The bundled backdrop behind the view, or null for the plain screen. */
  backdrop?: string | null
  /** Set or clear the backdrop; the section only renders when the caller handles it. */
  onSetBackdrop?: (id: string | null) => void
}

/**
 * The Game Master's control for the shared player view, in a modal so mid-fight
 * changes — the PIN, the backdrop, the link's name — have room to sit side by side.
 * What players *see* of a creature stays a setting rather than a control here,
 * because that is a preference for every fight, not a decision made while sharing one.
 */
export function SharePanel({
  code,
  sharing,
  onToggleShare,
  onClaim,
  onSignIn,
  pin = null,
  onSetPin,
  backdrop = null,
  onSetBackdrop,
}: SharePanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  // A blocked clipboard lands in the panel's shared message slot, where typing a
  // name clears it like any other notice.
  const { copied, copy } = useCopyLink(setMessage)
  const [claiming, setClaiming] = useState(false)
  const [pinDraft, setPinDraft] = useState(pin ?? '')

  /** Keep the draft; a fourth digit commits it, and clearing every box lifts the lock. */
  const editPin = (next: string) => {
    setPinDraft(next)
    if (next.length === 4 && next !== pin) {
      onSetPin?.(next)
      setMessage('PIN set. Viewers type it before the board shows.')
    } else if (next.length === 0 && pin) {
      onSetPin?.(null)
      setMessage('PIN removed.')
    }
  }

  const url = code ? playerViewUrl(code) : null

  /** Claim the typed name, keeping the current link in force if it's taken. */
  const claim = async () => {
    if (!onClaim) return
    const problem = playerCodeError(draft)
    if (problem) {
      setMessage(problem)
      return
    }
    setClaiming(true)
    const result = await onClaim(normalizePlayerCode(draft))
    setClaiming(false)
    if (result === 'ok') {
      setDraft('')
      setMessage('Saved.')
    } else if (result === 'taken') {
      setMessage('That name is taken. Try another.')
    } else if (result === 'unavailable') {
      // Nothing the GM can do about this one, so don't send them round the loop again.
      setMessage('Naming a link isn’t set up on this server yet. Your current link still works.')
    } else {
      setMessage('Couldn’t save that name. Try again.')
    }
  }

  return (
    <>
      <IconButton
        active={sharing}
        className="relative"
        onClick={() => setOpen((v) => !v)}
        aria-label={sharing ? 'Sharing with players' : 'Share with players'}
        title={sharing ? 'Sharing with players' : 'Share with players'}
        aria-expanded={open}
      >
        <CastIcon />
        {sharing && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
          />
        )}
      </IconButton>

      {open && (
        <Modal
          title="Player view"
          subtitle="A read-only screen with the turn order and the game log. Anyone with the link can watch, so share it with your table and not the internet."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-3">
            <div>
              <Button variant={sharing ? 'danger' : 'primary'} onClick={onToggleShare}>
                {sharing ? 'Stop sharing' : 'Start sharing'}
              </Button>
            </div>

            {url && (
              <div className={SECTION}>
                <label htmlFor="share-link" className={`mb-1 block ${SECTION_LABEL}`}>
                  Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="share-link"
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="tap-y min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                  <Button
                    size="sm"
                    onClick={() => copy(url)}
                    aria-label={copied ? 'Copied' : 'Copy the link'}
                    title={copied ? 'Copied' : 'Copy the link'}
                    className="inline-flex items-center justify-center px-1.5"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </Button>
                  <LinkButton
                    size="sm"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open the player view in a new tab"
                    title="Open the player view in a new tab"
                    className="inline-flex items-center justify-center px-1.5"
                  >
                    <OpenIcon />
                  </LinkButton>
                </div>
              </div>
            )}

            {onSetPin && (
              <div className={SECTION}>
                <span className="mb-1 flex items-center gap-1.5">
                  <span className={SECTION_LABEL}>PIN</span>
                  <FieldHint>
                    Locks the view: players type the four digits before the board shows. Empty boxes
                    leave the link open.
                  </FieldHint>
                </span>
                <div className="flex items-center gap-2">
                  <PinInput value={pinDraft} onChange={editPin} />
                  {pin && (
                    <Button size="sm" variant="quiet" onClick={() => editPin('')}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )}

            {onSetBackdrop && (
              <div className={SECTION}>
                <span className="mb-1 flex items-center gap-1.5">
                  <span className={SECTION_LABEL}>Backdrop</span>
                  <FieldHint>
                    Sits dimmed behind the table’s screen, in the art each theme gets. Change it
                    whenever the scene does.
                  </FieldHint>
                </span>
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="radiogroup"
                  aria-label="Backdrop"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={backdrop === null}
                    onClick={() => onSetBackdrop(null)}
                    className={`flex aspect-video w-24 items-center justify-center rounded border text-xs ${
                      backdrop === null
                        ? 'border-indigo-500 text-indigo-600 ring-1 ring-indigo-500 dark:text-indigo-400'
                        : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    None
                  </button>
                  {CAMPAIGN_BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={backdrop === b.id}
                      aria-label={b.label}
                      title={b.label}
                      onClick={() => onSetBackdrop(b.id)}
                      className={`relative aspect-video w-24 overflow-hidden rounded border ${
                        backdrop === b.id
                          ? 'border-indigo-500 ring-1 ring-indigo-500'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-cover bg-center dark:hidden"
                        style={{
                          backgroundImage: `url(${import.meta.env.BASE_URL}${b.fileLight})`,
                        }}
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 hidden bg-cover bg-center dark:block"
                        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${b.file})` }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onClaim ? (
              <div className={SECTION}>
                <span className="mb-1 flex items-center gap-1.5">
                  <label htmlFor="share-link-name" className={SECTION_LABEL}>
                    Name the link
                  </label>
                  <FieldHint>
                    Letters, numbers and hyphens. It stays yours between sessions.
                  </FieldHint>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="share-link-name"
                    value={draft}
                    placeholder={code ?? 'tuesday-game'}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      setMessage(null)
                    }}
                    className="tap-y min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <Button size="sm" variant="secondary" onClick={claim} disabled={claiming}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`${SECTION} text-xs text-slate-600 dark:text-slate-400`}>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Sign in
                </button>{' '}
                to name the link something your table can remember.
              </p>
            )}

            {message && (
              <p className="text-xs text-slate-700 dark:text-slate-200" role="status">
                {message}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
