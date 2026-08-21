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
  children,
  onDone,
}: {
  link: string
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
        Your links are in the account menu, under Shared encounters. This one stands until you take
        it down.
      </p>
      <Button variant="primary" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

/**
 * What a signed-out Game Master sees where the publish form would be.
 *
 * Publishing needs an account, and this is the moment to say why rather than a moment to
 * refuse. Somebody who has just built an encounter and wants to hand it to a friend is as
 * willing to make an account as they will ever be, so the dialog opens as usual and asks.
 *
 * The reasons are what an account actually changes about a link, and each is true: it stands
 * until they take it down, it is theirs to take down, it is listed somewhere they can find
 * it, and it can carry their name.
 */
export function SignInToShare({ what, onSignIn }: { what: string; onSignIn: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 dark:text-slate-200">
        Sharing {what} needs an account. It is free, and it takes one click.
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
        <li>Your link stands until you take it down.</li>
        <li>You can take it down, from anywhere, whenever you like.</li>
        <li>Every link you publish is listed in one place.</li>
        <li>You can publish under a name of your choosing.</li>
      </ul>
      <Button variant="primary" onClick={onSignIn}>
        Sign in to share
      </Button>
    </div>
  )
}
