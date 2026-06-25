// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Spell } from '../schema/spell.ts'
import { linkifyConditions, resolveCondition } from '../compendium/conditions.ts'
import { HoverCondition } from './HoverCondition.tsx'
import { HoverSpell } from './HoverSpell.tsx'

// react-markdown sanitizes link URLs and drops unknown schemes; let our own
// `spell:` / `condition:` links (trusted compendium content) pass through.
const urlTransform = (url: string): string =>
  url.startsWith('spell:') || url.startsWith('condition:') ? url : defaultUrlTransform(url)

/** Resolve a `spell:<id>` link to its compendium entry for the hover preview. */
export type ResolveSpell = (ref: string) => Spell | undefined

/**
 * Renders compendium prose (bold, lists, paragraphs, and GFM tables — some spells
 * like Scrying carry tables), styled via arbitrary-variant classes for both themes.
 *
 * Pass `inline` to render a single line with no surrounding paragraph, so it can sit
 * beside a clickable action name. Pass `resolveSpell` to turn ingest-added
 * `spell:<id>` links into hover-preview spans.
 */
const TABLE =
  '[&_table]:my-2 [&_table]:w-full [&_table]:text-left [&_th]:border [&_td]:border [&_th]:border-slate-300 [&_td]:border-slate-300 [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 dark:[&_th]:border-slate-700 dark:[&_td]:border-slate-700 [&_th]:font-semibold'

const HOVER_LINK =
  'cursor-help font-medium text-indigo-600 underline decoration-dotted dark:text-indigo-400'

/**
 * A markdown `a` renderer: `spell:` and `condition:` links become hover previews;
 * the rest stay plain links.
 */
function hoverAnchor(resolveSpell?: ResolveSpell): Components['a'] {
  return ({ href, children }) => {
    if (href?.startsWith('spell:')) {
      const spell = resolveSpell?.(href.slice('spell:'.length))
      // No resolver / unknown spell (e.g. the reference compendium): plain text.
      if (!spell) return <>{children}</>
      return (
        <HoverSpell spell={spell} className={HOVER_LINK}>
          {children}
        </HoverSpell>
      )
    }
    if (href?.startsWith('condition:')) {
      const condition = resolveCondition(href.slice('condition:'.length))
      if (!condition) return <>{children}</>
      return (
        <HoverCondition name={condition.name} text={condition.text} className={HOVER_LINK}>
          {children}
        </HoverCondition>
      )
    }
    return <a href={href}>{children}</a>
  }
}

export function Markdown({
  children,
  inline = false,
  resolveSpell,
  linkConditions = false,
}: {
  children: string
  inline?: boolean
  resolveSpell?: ResolveSpell
  /** Turn bare condition names (Grappled, Prone, …) into hover previews. */
  linkConditions?: boolean
}) {
  const a = hoverAnchor(resolveSpell)
  const source = linkConditions ? linkifyConditions(children) : children
  if (inline) {
    return (
      <span className="[&_a]:underline [&_em]:italic [&_strong]:font-semibold">
        <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={{ a, p: ({ children }) => <>{children}</> }}>
          {source}
        </ReactMarkdown>
      </span>
    )
  }
  return (
    <div
      className={`[&_a]:underline [&_em]:italic [&_hr]:hidden [&_li]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-2 [&_h4]:text-sm [&_h4]:font-semibold [&_:is(h1,h2,h3,h4)]:text-slate-700 dark:[&_:is(h1,h2,h3,h4)]:text-slate-200 ${TABLE}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={{ a }}>{source}</ReactMarkdown>
    </div>
  )
}
