// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { CrossedSwordsIcon } from '../icons/CrossedSwordsIcon.tsx'

/**
 * The OpenFray wordmark: the crossed swords beside the two-tone name, linking home.
 *
 * Colour sits on a wrapper, not on the icon: the icon's `className` replaces its default
 * rather than adding to it, so passing one here would take `h-7 w-7` with it and render
 * nothing.
 */
export function Wordmark({
  className,
  wordClassName,
  h1 = false,
}: {
  /** The anchor's layout classes: what the wordmark spans is the surface's own decision. */
  className?: string
  /** Classes on the name itself, where a surface sizes or hides the word. */
  wordClassName?: string
  /** Surfaces whose document the wordmark titles (the console, the sign-up page) pass true. */
  h1?: boolean
}) {
  const Word = h1 ? 'h1' : 'span'
  return (
    <a href="/" title="OpenFray home" className={className}>
      <span className="text-indigo-500 dark:text-indigo-400">
        <CrossedSwordsIcon />
      </span>
      <Word className={wordClassName}>
        <span className="text-indigo-500 dark:text-indigo-400">Open</span>Fray
      </Word>
    </a>
  )
}
