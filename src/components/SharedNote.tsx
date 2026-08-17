// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import ReactMarkdown from 'react-markdown'

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
 * So bold, italic, quotes and lists render, and everything else — links, images, headings,
 * code, tables, HTML — comes through as its own plain text (`unwrapDisallowed`), which keeps
 * what the writer said while dropping what it would have done.
 *
 * **This is deliberately its own component rather than a flag on `Markdown`.** That one
 * carries the compendium's trusted prose and its `spell:`/`condition:` hover links, and the
 * day someone adds `rehype-raw` there for a good-looking reason, this must not inherit it.
 * `tests/components/SharedNote.test.tsx` is what fails first if the two ever converge.
 */

/** Bold, italic, quotes, lists, paragraphs, breaks. Nothing that navigates or fetches. */
const ALLOWED = ['p', 'strong', 'em', 'blockquote', 'br', 'ul', 'ol', 'li']

export function SharedNote({ children }: { children: string }) {
  return (
    <div
      className={
        'max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-700 ' +
        '[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 ' +
        '[&_blockquote]:pl-3 [&_blockquote]:italic [&_em]:italic [&_li]:my-0.5 [&_p]:my-1 ' +
        '[&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 ' +
        '[&_ol]:list-decimal [&_ol]:pl-5 dark:text-slate-200 dark:[&_blockquote]:border-slate-700'
      }
    >
      <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  )
}
