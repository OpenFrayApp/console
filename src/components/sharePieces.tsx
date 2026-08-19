// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import { Button } from './ui.tsx'

/**
 * The parts an encounter and a creature publish identically.
 *
 * Both dialogs ask for a byline and both end on a link, and those two are where the fiddly
 * behaviour lives: a byline the account fills in but never owns, and a copy button whose
 * clipboard write can fail. Everything else about the two is genuinely per-kind — a name and
 * a license for an encounter, a refusal and a warning for a creature — so what is shared is
 * these pieces rather than one dialog wearing a configuration object.
 */

export const SHARE_FIELD =
  'tap-y w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'
export const SHARE_LABEL = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200'

/** The byline field itself, with whatever the rules had to say about what was typed. */
export function BylineField({
  id,
  value,
  onChange,
  problem,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  problem: string | null
}) {
  return (
    <div>
      <label htmlFor={id} className={SHARE_LABEL}>
        Your name (optional)
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Shown as “Shared by …”"
        autoComplete="off"
        className={SHARE_FIELD}
      />
      {problem && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{problem}</p>}
    </div>
  )
}

/**
 * What a dialog becomes once the link exists: the link, a way to take it, and what happens
 * to it afterwards.
 *
 * A blocked clipboard is survivable rather than fatal — the link is on screen to select by
 * hand — so the failure says that instead of swallowing itself.
 */
export function PublishedLink({
  link,
  signedIn,
  children,
  onDone,
}: {
  link: string
  signedIn: boolean
  /** What was published, in a sentence: "Anyone with this link can …". */
  children: React.ReactNode
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{children}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className="tap-y min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        />
        <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
      {failed && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Couldn’t copy. Select the link and copy it yourself.
        </p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {signedIn
          ? 'Your links are in the account menu, under Shared encounters. This one stands until you take it down.'
          : 'Signed out, this link stops working after 60 days and isn’t listed anywhere.'}
      </p>
      <Button variant="primary" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
