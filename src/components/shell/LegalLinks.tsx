// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

const SOURCE_URL = 'https://github.com/OpenFrayApp/console'
const LICENSE_URL = 'https://www.gnu.org/licenses/agpl-3.0.html'

/**
 * The legal row: Privacy, Terms, Source, and the license.
 *
 * The Source link is the running app's AGPL §13 offer, so it ships wherever this row
 * does. The layout is each surface's own; the links and their addresses are not.
 */
export function LegalLinks({
  as: Tag = 'div',
  className,
  linkClassName,
  separatorsHidden = false,
  sourceAsIcon = false,
}: {
  /** What the row renders as: the shared pages use a footer element. */
  as?: 'div' | 'footer'
  className?: string
  /** Classes every text link carries (the settings menu underlines on hover). */
  linkClassName?: string
  /** Mark the dots decorative, keeping them off screen readers. */
  separatorsHidden?: boolean
  /** The desktop footer draws Source as the GitHub mark rather than the word. */
  sourceAsIcon?: boolean
}) {
  const dot = separatorsHidden ? <span aria-hidden>·</span> : <span>·</span>
  return (
    <Tag className={className}>
      <a href="/privacy" className={linkClassName}>
        Privacy
      </a>
      {dot}
      <a href="/terms" className={linkClassName}>
        Terms
      </a>
      {dot}
      {sourceAsIcon ? (
        <>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="OpenFray on GitHub"
            title="GitHub"
            className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          &nbsp;
          <span>
            <a href={LICENSE_URL} target="_blank" rel="noreferrer">
              AGPL-3.0
            </a>
          </span>
        </>
      ) : (
        <>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={linkClassName}>
            Source
          </a>
          {dot}
          <a href={LICENSE_URL} target="_blank" rel="noreferrer" className={linkClassName}>
            AGPL-3.0
          </a>
        </>
      )}
    </Tag>
  )
}
