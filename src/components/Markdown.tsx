// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Spell } from '../schema/spell.ts'
import { HoverSpell } from './HoverSpell.tsx'

// react-markdown sanitizes link URLs and drops unknown schemes; let our own
// ingest-added `spell:` links (trusted compendium content) pass through.
const urlTransform = (url: string): string =>
  url.startsWith('spell:') ? url : defaultUrlTransform(url)

/** Resolve a `spell:<id>` link to its compendium entry for the hover preview. */
export type ResolveSpell = (ref: string) => Spell | undefined

/**
 * Renders the markdown found in compendium prose (bold, bullet lists, paragraphs,
 * and GFM tables — some spells like Scrying carry tables). Styled without the
 * typography plugin via arbitrary-variant classes; works in both themes.
 *
 * Pass `inline` to render a single line of prose with no surrounding paragraph,
 * so it can sit beside a clickable action name on the same line. Pass
 * `resolveSpell` to turn ingest-added `spell:<id>` links into hover-preview spans.
 */
const TABLE =
  '[&_table]:my-2 [&_table]:w-full [&_table]:text-left [&_th]:border [&_td]:border [&_th]:border-slate-300 [&_td]:border-slate-300 [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 dark:[&_th]:border-slate-700 dark:[&_td]:border-slate-700 [&_th]:font-semibold'

const SPELL_LINK =
  'cursor-help font-medium text-indigo-600 underline decoration-dotted dark:text-indigo-400'

/** A markdown `a` renderer: `spell:` links become hover previews; the rest stay links. */
function spellAnchor(resolveSpell?: ResolveSpell): Components['a'] {
  return ({ href, children }) => {
    if (href?.startsWith('spell:')) {
      const spell = resolveSpell?.(href.slice('spell:'.length))
      // No resolver / unknown spell (e.g. the reference compendium): plain text.
      if (!spell) return <>{children}</>
      return (
        <HoverSpell spell={spell} className={SPELL_LINK}>
          {children}
        </HoverSpell>
      )
    }
    return <a href={href}>{children}</a>
  }
}

export function Markdown({
  children,
  inline = false,
  resolveSpell,
}: {
  children: string
  inline?: boolean
  resolveSpell?: ResolveSpell
}) {
  const a = spellAnchor(resolveSpell)
  if (inline) {
    return (
      <span className="[&_a]:underline [&_em]:italic [&_strong]:font-semibold">
        <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={{ a, p: ({ children }) => <>{children}</> }}>
          {children}
        </ReactMarkdown>
      </span>
    )
  }
  return (
    <div
      className={`[&_a]:underline [&_em]:italic [&_li]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 ${TABLE}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={{ a }}>{children}</ReactMarkdown>
    </div>
  )
}
