// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import ReactMarkdown from 'react-markdown'
import type { ReactNode } from 'react'

/**
 * The note on a shared encounter — the one place a stranger's prose renders inside our own
 * chrome, which is a different risk from the rest of a shared payload (ids and numbers).
 *
 * The grammar is an **allowlist**, not a blocklist, and the reason isn't tags. Raw HTML is
 * already inert here (react-markdown renders none without `rehype-raw`). What an allowlist
 * stops is the two things that survive HTML-stripping:
 *
 * - **A link**: "Sign in to load this encounter" pointing anywhere, rendered inside the
 *   console's own panel, borrows the app's authority. That is phishing, and no amount of tag
 *   filtering touches it.
 * - **An image**: `![](https://…)` makes the reader's browser call a stranger's server,
 *   handing over an IP and a User-Agent and giving whoever posted the link a read receipt on
 *   everyone who opened it. The console loads no third-party resources anywhere else.
 *
 * So bold, italic, quotes, lists and headings render, and everything else — links, images,
 * code, tables, HTML — comes through as its own plain text (`unwrapDisallowed`), which keeps
 * what the writer said while dropping what it would have done. Headings are safe company for
 * that list: unlike a link or an image, a heading neither navigates nor fetches.
 *
 * **This is deliberately its own component rather than a flag on `Markdown`.** That one
 * carries the compendium's trusted prose and its `spell:`/`condition:` hover links, and the
 * day someone adds `rehype-raw` there for a good-looking reason, this must not inherit it.
 * `tests/components/SharedNote.test.tsx` is what fails first if the two ever converge.
 */

/** Bold, italic, quotes, lists, paragraphs, breaks, headings. Nothing that navigates or fetches. */
const ALLOWED = [
  'p',
  'strong',
  'em',
  'blockquote',
  'br',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]

/**
 * A note's top-level heading, whatever number the writer reached for.
 *
 * The page already owns its `h1` (the encounter's name) and its `h2` (Notes), so a `#` in
 * somebody's prep cannot be either without breaking the document's outline for anyone
 * reading with a screen reader. Anything above `h3` lands on `h3`; `h4` and below are
 * respected as typed, because by then the writer is describing structure inside their own
 * section rather than competing with the page's.
 */
const Heading = ({ children }: { children?: ReactNode }) => <h3>{children}</h3>

export function SharedNote({ children }: { children: string }) {
  return (
    <div
      className={
        'max-h-72 overflow-y-auto break-words text-sm text-slate-700 ' +
        // Line breaks are kept inside a block, never between them. A Game Master's prep is
        // full of single newlines that markdown would fold into one paragraph, so the text
        // has to render as typed; but react-markdown leaves a newline between every block,
        // and preserving those on the wrapper doubles the gap around every heading.
        '[&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap ' +
        '[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 ' +
        '[&_blockquote]:pl-3 [&_blockquote]:italic [&_em]:italic [&_li]:my-0.5 [&_p]:my-1 ' +
        '[&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 ' +
        '[&_ol]:list-decimal [&_ol]:pl-5 dark:text-slate-200 dark:[&_blockquote]:border-slate-700 ' +
        // The four levels a note can use, each a step quieter than the last.
        '[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-3 ' +
        '[&_h4]:text-sm [&_h4]:font-medium [&_h5]:mb-0.5 [&_h5]:mt-2 [&_h5]:text-xs ' +
        '[&_h5]:font-semibold [&_h6]:mb-0.5 [&_h6]:mt-2 [&_h6]:text-xs [&_h6]:font-medium ' +
        '[&_:is(h3,h4,h5,h6)]:text-slate-800 dark:[&_:is(h3,h4,h5,h6)]:text-slate-100 ' +
        '[&_:is(h3,h4,h5,h6):first-child]:mt-0'
      }
    >
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        skipHtml
        components={{ h1: Heading, h2: Heading, h3: Heading }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
