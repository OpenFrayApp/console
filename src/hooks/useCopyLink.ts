// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef, useState } from 'react'

/** What every copy control says when the clipboard refuses. */
const COPY_FAILED = 'Couldn’t copy. Select the link and copy it yourself.'

/**
 * The copy-a-link state machine every share control shares: write the URL to
 * the clipboard, say "copied" for two seconds, and on a blocked clipboard say
 * so rather than claiming it worked — the link is on screen to select by hand.
 *
 * `copied` holds the `key` of the last successful copy (the URL itself when no
 * key is given) and clears two seconds later; a page of rows passes each row's
 * key and compares. A failed copy clears it — a control reading "Copied" beside
 * a message saying it couldn't would be lying. The failure sentence lands in
 * `error` and stays there, or goes to `onFail` instead for a caller with a
 * message slot of its own. Pending resets are dropped on unmount.
 */
export function useCopyLink(onFail?: (message: string) => void): {
  copied: string | null
  error: string | null
  copy: (url: string, key?: string) => void
} {
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  // Nothing to undo on the clipboard, but a reset firing after unmount is a
  // state set nobody hears.
  useEffect(
    () => () => {
      for (const id of timers.current) clearTimeout(id)
    },
    [],
  )

  /** Write `url` to the clipboard and mark `key` copied for two seconds. */
  const copy = (url: string, key: string = url): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(key)
        timers.current.push(window.setTimeout(() => setCopied(null), 2000))
      } catch {
        setCopied(null)
        if (onFail) onFail(COPY_FAILED)
        else setError(COPY_FAILED)
      }
    })()
  }

  return { copied, error, copy }
}
