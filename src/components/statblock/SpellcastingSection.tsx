// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { SpellGroup, SpellLevel, Spellcasting, SpellRef } from '../../schema/creature.ts'
import type { Spell } from '../../schema/spell.ts'
import { signed, titleCase, spellLevelOrdinal } from '../../compendium/format.ts'
import { SpellCard } from './SpellCard.tsx'
import { FloatingCard } from '../ui/FloatingCard.tsx'
import { useHoverCard } from '../../hooks/useHoverCard.ts'
import { SECTION_HEADING } from './parts.tsx'

/** Resolve a spell's compendium entry (for the hover preview + cast card). */
export type ResolveSpell = (ref?: string) => Spell | undefined
/** Uses left for a spell on the live combatant: null when unlimited (at-will). */
export type SpellUsesOf = (spell: SpellRef) => number | null

/** A spell group's usage heading: "At Will", "1st Level", "N/Day Each", or "N/Day" when the
 *  group is one pool between its spells rather than N uses of each. */
function usageLabel(group: SpellGroup): string {
  if (group.usage.type === 'atWill') return 'At Will'
  if (group.usage.type === 'slots') {
    return `${spellLevelOrdinal(group.usage.level)} Level`
  }
  return `${group.usage.per}/Day${group.usage.shared ? '' : ' Each'}`
}

/** The italic intro line: casting ability, save DC, and spell attack bonus, when known. */
function spellcastingHeader(sc: Spellcasting): string {
  const bits: string[] = []
  if (sc.ability) bits.push(`${sc.ability.toUpperCase()} as the spellcasting ability`)
  if (sc.saveDc != null) bits.push(`spell save DC ${sc.saveDc}`)
  if (sc.toHit != null) bits.push(`${signed(sc.toHit)} to hit with spell attacks`)
  return bits.length ? `Casts using ${bits.join(', ')}.` : 'Casts the following spells.'
}

/**
 * A monster's spellcasting, grouped by usage. Each spell is a button that opens
 * the cast modal; hovering it (desktop) previews the spell card. Per-day spells
 * show their remaining uses and grey out when spent. In the reference compendium
 * (no `onCast`) the spells render as plain text.
 */
export function SpellcastingSection({
  spellcasting,
  onCast,
  usesOf,
  slotsLeftOf,
  resolveSpell,
}: {
  spellcasting: Spellcasting
  onCast?: (spell: SpellRef) => void
  usesOf?: SpellUsesOf
  slotsLeftOf?: (level: number) => number
  resolveSpell?: ResolveSpell
}) {
  // The hover preview is anchored with a fixed, viewport-clamped position so it
  // isn't clipped by the scrolling stat-block column. Touch devices don't fire
  // hover, so they simply tap to open the cast modal (which shows the same card).
  const {
    card: preview,
    open: openPreview,
    close: closePreview,
    cancelClose,
  } = useHoverCard<Spell>()

  /** Open the spell hover card anchored to its button — only when the ref resolves. */
  const showPreview = (spell: SpellRef, el: HTMLElement) => {
    const found = resolveSpell?.(spell.ref)
    if (found) openPreview(found, el)
  }

  return (
    <div>
      <h4 className={SECTION_HEADING}>Spellcasting</h4>
      <p className="mb-2 text-sm italic text-slate-500 dark:text-slate-400">
        {spellcastingHeader(spellcasting)}
      </p>
      <div className="space-y-2">
        {spellcasting.groups.map((group, i) => {
          // Slot groups carry the count on the level label; all the level's spells
          // share that pool, so they don't show per-spell counts.
          const level = group.usage.type === 'slots' ? group.usage.level : null
          const slotMax =
            level != null ? (spellcasting.slots?.[String(level) as SpellLevel] ?? 0) : 0
          const slotLeft = level != null ? (slotsLeftOf ? slotsLeftOf(level) : slotMax) : 0
          const slotsDrained = level != null && slotLeft <= 0
          return (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {usageLabel(group)}
                {level != null && slotMax > 0 && (
                  <span className="ml-1 font-normal normal-case text-slate-400 dark:text-slate-500">
                    (
                    {slotsLeftOf
                      ? `${slotLeft}/${slotMax} slots`
                      : `${slotMax} ${slotMax === 1 ? 'slot' : 'slots'}`}
                    )
                  </span>
                )}
              </span>
              {group.spells.map((spell) => {
                const remaining = level != null ? null : (usesOf?.(spell) ?? null)
                const drained = level != null ? slotsDrained : remaining === 0
                // Source prose can list spells lowercased (e.g. ToB3 "charm person").
                // Prefer the resolved spell's canonical name; else title-case it.
                const name = resolveSpell?.(spell.ref)?.name ?? titleCase(spell.name)
                const label = remaining == null ? name : `${name} (${remaining})`
                if (!onCast) {
                  return (
                    <span
                      key={spell.ref ?? spell.name}
                      className="text-slate-600 dark:text-slate-300"
                    >
                      {label}
                    </span>
                  )
                }
                return (
                  <button
                    key={spell.ref ?? spell.name}
                    type="button"
                    onClick={() => onCast(spell)}
                    onMouseEnter={(e) => showPreview(spell, e.currentTarget)}
                    onMouseLeave={closePreview}
                    title={`Cast ${name}`}
                    className={
                      drained
                        ? 'text-slate-400 line-through hover:no-underline dark:text-slate-600'
                        : 'font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      {spellcasting.note && (
        <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
          {spellcasting.note}
        </p>
      )}
      {preview && (
        <FloatingCard style={preview.style} onMouseEnter={cancelClose} onMouseLeave={closePreview}>
          <SpellCard spell={preview.value} />
        </FloatingCard>
      )}
    </div>
  )
}
