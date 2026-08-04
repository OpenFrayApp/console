// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState } from 'react'
import type { ClaimResult } from '../state/cloudEncounter.ts'
import { playerCodeError, playerViewUrl, normalizePlayerCode } from '../state/playerCode.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { Button, LinkButton } from './ui.tsx'
import { cx } from '../lib/cx.ts'

/** The shape every icon in this panel is drawn on. */
const ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** Screen icon — the board as the table sees it. */
function ScreenIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}

/** Copy icon — one sheet laid over another. */
function CopyIcon() {
  return (
    <svg {...ICON} className="h-4 w-4">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
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

/** External-link icon — the view, opened somewhere else. */
function OpenIcon() {
  return (
    <svg {...ICON} className="h-4 w-4">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

interface SharePanelProps {
  /** The current share code, or null before one exists. */
  code: string | null
  sharing: boolean
  onToggleShare: () => void
  /** Signed in only: claim a chosen name. Absent for an anonymous GM. */
  onClaim?: (code: string) => Promise<ClaimResult>
  /** Open the sign-in screen, for the anonymous nudge toward naming a link. */
  onSignIn: () => void
}

/**
 * The Game Master's control for the shared player view: start and stop sharing, copy or
 * open the link, and — signed in — choose what it's called. What players *see* is a setting
 * rather than a control here, because it's a preference for every fight, not a
 * decision made while sharing one.
 */
export function SharePanel({ code, sharing, onToggleShare, onClaim, onSignIn }: SharePanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const url = code ? playerViewUrl(code) : null

  /** Put the link on the clipboard, and say so briefly. */
  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // A blocked clipboard is fine — the link is on screen to select by hand.
      setMessage('Couldn’t copy. Select the link and copy it yourself.')
    }
  }

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={sharing ? 'Sharing with players' : 'Share with players'}
        title={sharing ? 'Sharing with players' : 'Share with players'}
        aria-expanded={open}
        className={cx(
          'relative flex h-9 w-9 items-center justify-center rounded-md border',
          sharing
            ? 'border-emerald-400 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
            : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
        )}
      >
        <ScreenIcon />
        {sharing && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Player view</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            A read-only screen with the turn order and the game log. Anyone with the link can watch,
            so share it with your table and not the internet.
          </p>

          <div className="mt-3">
            <Button variant={sharing ? 'danger' : 'primary'} onClick={onToggleShare}>
              {sharing ? 'Stop sharing' : 'Start sharing'}
            </Button>
          </div>

          {url && (
            <div className="mt-3">
              <label
                htmlFor="share-link"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-link"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
                <Button
                  size="sm"
                  onClick={copy}
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

          {onClaim ? (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <label
                htmlFor="share-name"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Name the link
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-name"
                  value={draft}
                  placeholder={code ?? 'tuesday-game'}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setMessage(null)
                  }}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                <Button size="sm" variant="secondary" onClick={claim} disabled={claiming}>
                  Save
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Letters, numbers and hyphens. It stays yours between sessions.
              </p>
            </div>
          ) : (
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
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
            <p className="mt-2 text-xs text-slate-700 dark:text-slate-200" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
