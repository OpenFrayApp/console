// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Spell } from '../schema/spell.ts'
import type { SpellRef } from '../schema/creature.ts'
import { libraryTag } from '../compendium/libraries.ts'
import { FIELD } from './ActionEditor.tsx'

/** The edition tag ("5.5" / "5.0") for a spell or a stored ref id (`srd-5.2:fireball`). */
const editionOf = (source: string | undefined): string | undefined =>
  source ? libraryTag(source.includes(':') ? source.split(':')[0] : source) : undefined

function EditionBadge({ tag }: { tag: string | undefined }) {
  if (!tag) return null
  return (
    <span className="rounded bg-slate-100 px-1 py-px text-[0.65rem] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {tag}
    </span>
  )
}

/**
 * A tag-style picker for spells, restricted to real compendium entries (so a
 * spellcaster's list resolves to actual cards, never free-typed names). Type to
 * search, click a suggestion to add a chip; chips store `{ name, ref }` where the
 * ref is the spell's compendium id. Each suggestion/chip shows its edition so the
 * two SRD libraries (5.5 / 5.0) can be told apart when a name exists in both.
 */
export function SpellTagInput({
  value,
  onChange,
  spells,
}: {
  value: SpellRef[]
  onChange: (next: SpellRef[]) => void
  spells: Spell[]
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()
  const query = q.trim().toLowerCase()
  const keyOf = (s: { ref?: string; name: string }) => s.ref ?? s.name.toLowerCase()
  const chosen = new Set(value.map(keyOf))
  const suggestions = query
    ? spells.filter((s) => s.name.toLowerCase().includes(query) && !chosen.has(s.id)).slice(0, 8)
    : []

  // Anchor the menu to the input with fixed positioning so it escapes the modal
  // body's `overflow-auto` clip; flip above the field when there's little room below.
  // Reposition on scroll/resize so it tracks the input if the modal is scrolled.
  useLayoutEffect(() => {
    if (suggestions.length === 0) {
      setMenuStyle(undefined)
      return
    }
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect()
      if (!r) return
      const gap = 4
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < 220 && r.top > spaceBelow
      setMenuStyle({
        position: 'fixed',
        left: r.left,
        width: r.width,
        maxHeight: Math.max(96, (openUp ? r.top : spaceBelow) - gap - 8),
        ...(openUp ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [suggestions.length])

  const add = (s: Spell) => {
    onChange([...value, { name: s.name, ref: s.id }])
    setQ('')
  }
  const remove = (key: string) => onChange(value.filter((v) => keyOf(v) !== key))

  return (
    <div className="space-y-1">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => {
            const key = keyOf(v)
            const tag = editionOf(v.ref)
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
              >
                {v.name}
                {tag && (
                  <span className="text-[0.65rem] text-indigo-500 dark:text-indigo-300/80">{tag}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(key)}
                  aria-label={`Remove ${v.name}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-100"
                >
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={spells.length ? 'Add a spell…' : 'Loading spells…'}
          aria-label="Add spell"
          className={FIELD}
        />
        {suggestions.length > 0 && menuStyle && (
          <ul
            style={menuStyle}
            className="z-50 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => add(s)}
                  className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <EditionBadge tag={editionOf(s.source)} />
                    {s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
