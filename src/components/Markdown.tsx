// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import ReactMarkdown from 'react-markdown'

/**
 * Renders the markdown found in compendium prose (bold, bullet lists, paragraphs
 * — e.g. a creature's Spellcasting "At Will" list). Styled without the typography
 * plugin via arbitrary-variant classes; works in both themes.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="[&_a]:underline [&_em]:italic [&_li]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
