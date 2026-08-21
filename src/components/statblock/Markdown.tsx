// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useContext } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Spell } from '../../schema/spell.ts'
import { linkifyConditions, resolveCondition } from '../../compendium/conditions.ts'
import { HoverCondition } from './HoverCondition.tsx'
import { HoverSpell } from './HoverSpell.tsx'
import { SpellLinkContext } from './spellLinkContext.ts'

// react-markdown sanitizes link URLs and drops unknown schemes; let our own
// `spell:` / `condition:` links (trusted compendium content) pass through.
const urlTransform = (url: string): string =>
  url.startsWith('spell:') || url.startsWith('condition:') ? url : defaultUrlTransform(url)

/** Resolve a `spell:<id>` link to its compendium entry for the hover preview. */
export type ResolveSpell = (ref: string) => Spell | undefined

// SRD 5.1 (dnd5eapi) emits tables with a blank line between every row, which breaks GFM
// table parsing (rows must be contiguous). Collapse blank lines that sit between two
// table rows so e.g. Control Weather's stage tables render as a table, not loose text.
const joinTableRows = (md: string): string =>
  md.replace(/(\|[^\n]*)\n(?:[ \t]*\n)+(?=[ \t]*\|)/g, '$1\n')

const TABLE =
  '[&_table]:my-2 [&_table]:w-full [&_table]:text-left [&_th]:border [&_td]:border [&_th]:border-slate-300 [&_td]:border-slate-300 [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 dark:[&_th]:border-slate-700 dark:[&_td]:border-slate-700 [&_th]:font-semibold'

const HOVER_LINK =
  'cursor-help font-medium text-indigo-600 underline decoration-dotted dark:text-indigo-400'

/**
 * Every link that leaves the app came out of prose somebody typed, so each one says so.
 *
 * `ugc` is the standard word for it, and the rest is what it means in practice: we are not
 * vouching for where this goes, the page it goes to learns nothing about where it was
 * clicked from, and it gets no handle on the tab it was opened from. `noreferrer` implies
 * that last one, and it is written out anyway, because it is the reason a new tab is safe
 * and a later edit dropping `noreferrer` should not quietly take it too.
 *
 * The `spell:` and `condition:` links get none of this. They are ours, they resolve inside
 * the app, and they never navigate.
 */
const UGC_REL = 'ugc nofollow noreferrer noopener'

/** Where our own pages live, so a link to one stays in the tab it was clicked in. */
const OURS = 'openfray.app'

/**
 * Whether a destination is one of ours: this origin, `openfray.app`, or a subdomain of it.
 *
 * Parsed rather than matched on the text, because `https://openfray.app.evil.example/`
 * carries our name and is somebody else's host. Anything that is not http(s) — the
 * `mailto:` remark-gfm makes out of an address — answers true, which only means it is
 * handed to the browser the way the browser would take it anyway.
 */
function ours(href: string): boolean {
  try {
    const url = new URL(href, window.location.href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
    return (
      url.hostname === window.location.hostname ||
      url.hostname === OURS ||
      url.hostname.endsWith(`.${OURS}`)
    )
  } catch {
    // Nothing that can be navigated to on purpose. react-markdown's sanitizer has already
    // emptied the destinations that mattered.
    return true
  }
}

/**
 * A markdown `a` renderer: `spell:` and `condition:` links become hover previews; the rest
 * stay plain links, or — without `links` — the text they were written as.
 */
function hoverAnchor(resolveSpell: ResolveSpell | undefined, links: boolean): Components['a'] {
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
    if (!links) return <>{children}</>
    return (
      <a href={href} rel={UGC_REL} target={ours(href ?? '') ? undefined : '_blank'}>
        {children}
      </a>
    )
  }
}

/** An image renderer that draws its alt text instead, for prose that may not fetch. */
const altOnly: Components['img'] = ({ alt }) => <>{alt}</>

/**
 * Renders compendium prose (bold, lists, paragraphs, and GFM tables — some spells
 * like Scrying carry tables), styled via arbitrary-variant classes for both themes.
 *
 * Pass `inline` to render a single line with no surrounding paragraph, so it can sit
 * beside a clickable action name. Pass `resolveSpell` to turn ingest-added
 * `spell:<id>` links into hover-preview spans.
 *
 * **Prose does not reach outside the app unless it says `links`.** A stat block's prose is
 * either the compendium's (which carries none, so this costs it nothing) or a stranger's,
 * embedded whole in a shared encounter — where a link borrows the app's authority and an
 * image hands a stranger's server a read receipt. `SharedNote` refuses both for the note.
 *
 * It has to be a renderer choice rather than something done to the text: `remark-gfm`
 * autolinks bare URLs, `www.` hosts and email addresses. `links` is for the Game Master's
 * own prose — their notes, a backstory.
 *
 * The ones it does render say where they came from and where they go: `rel` marks them as
 * somebody's own writing, and anything that is not one of ours opens in its own tab, so a
 * Game Master following a link out of their notes does not lose the fight they were running.
 */
export function Markdown({
  children,
  inline = false,
  resolveSpell,
  linkConditions = false,
  links = false,
}: {
  children: string
  inline?: boolean
  resolveSpell?: ResolveSpell
  /** Turn bare condition names (Grappled, Prone, …) into hover previews. */
  linkConditions?: boolean
  /** Let this prose carry links and images out of the app. See above — rarely right. */
  links?: boolean
}) {
  const a = hoverAnchor(resolveSpell, links)
  const img = links ? undefined : altOnly
  const linkSpells = useContext(SpellLinkContext)
  // Link bare spell names first (adds `spell:` links), then bare condition names.
  const linked = linkSpells ? linkSpells(children) : children
  const source = joinTableRows(linkConditions ? linkifyConditions(linked) : linked)
  if (inline) {
    return (
      <span className="[&_a]:underline [&_em]:italic [&_strong]:font-semibold">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={urlTransform}
          components={{ a, img, p: ({ children }) => <>{children}</> }}
        >
          {source}
        </ReactMarkdown>
      </span>
    )
  }
  return (
    <div
      className={`[&_a]:underline [&_em]:italic [&_hr]:hidden [&_li]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-2 [&_h4]:text-sm [&_h4]:font-semibold [&_:is(h1,h2,h3,h4)]:text-slate-700 dark:[&_:is(h1,h2,h3,h4)]:text-slate-200 ${TABLE}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        components={{ a, img }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
