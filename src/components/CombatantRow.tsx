// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useRef } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import { hpTier, type HpTier } from '../combat/resources.ts'
import { isFoe } from '../combat/combatant.ts'
import { isStable } from '../combat/deathsaves.ts'
import { groupSaveEnds } from '../combat/saveEnds.ts'
import { EffectBadge, SaveEndsBadge } from './EffectBadge.tsx'
import { DeathSavePips } from './DeathSaveControls.tsx'
import { EditableField } from './EditableField.tsx'
import { hpToneFor } from './hpTone.ts'

const displayName = (c: Combatant): string => (c.isPC ? c.name : c.label)
const armorClass = (c: Combatant): number => (c.isPC ? c.ac : c.creature.ac)

function concentrationTitle(c: NonNullable<Combatant['concentration']>): string {
  const base = c.spell ? `Concentrating: ${c.spell}` : 'Concentrating'
  return c.rounds != null ? `${base} (${c.rounds} round${c.rounds === 1 ? '' : 's'} left)` : base
}

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const TIER_LABEL: Record<HpTier, string> = {
  healthy: 'Healthy',
  hurt: 'Hurt',
  bloodied: 'Bloodied',
  critical: 'Critical',
}

interface CombatantRowProps {
  combatant: Combatant
  /** Whose turn it is (the initiative cursor). */
  active?: boolean
  /** The row the DM has selected to inspect in the detail panel. */
  selected?: boolean
  /** Selects this combatant when the row is clicked. */
  onSelect?: () => void
  /** When set, effect badges become removable. */
  onRemoveEffect?: (effectId: string) => void
  /** Removes this combatant from the encounter (the on-hover X). */
  onRemove?: () => void
  /** Click-to-edit current HP from a raw input ("12", "+5", "-3"). */
  onHpInput?: (raw: string) => void
  /** Show a drag handle, to manually reorder the turn order. */
  reorderable?: boolean
  /** This row is the one currently being dragged (rendered as a faint placeholder). */
  dragging?: boolean
  /** This row's handle started a drag. */
  onReorderStart?: () => void
  /** A drag ended (committed or cancelled). */
  onReorderEnd?: () => void
  /** The drag is hovering this row — the parent moves the dragged row here as a preview. */
  onReorderOver?: () => void
}

/**
 * One row in the initiative list: initiative, name, HP/AC, and the combatant's
 * effect badges (conditions and effects, one unified list). Dead/down combatants
 * are greyed and struck through; living combatants surface their wound tier.
 */
export function CombatantRow({
  combatant,
  active = false,
  selected = false,
  onSelect,
  onRemoveEffect,
  onRemove,
  onHpInput,
  reorderable = false,
  dragging = false,
  onReorderStart,
  onReorderEnd,
  onReorderOver,
}: CombatantRowProps) {
  const { hp, status } = combatant
  const dead = status === 'dead'
  const downed = dead || status === 'unconscious'
  const tier = hpTier(combatant)
  const showTier = !downed && tier !== 'healthy'
  const rowRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rowRef}
      aria-current={active ? 'true' : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      // The whole list is the drop zone; each row reports when the drag hovers it so
      // the parent can move the dragged row here as a live preview.
      onDragOver={
        reorderable
          ? (e) => {
              e.preventDefault()
              onReorderOver?.()
            }
          : undefined
      }
      className={cx(
        'group flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2 transition-opacity',
        // Disposition-coded left edge: friends sky, foes rose.
        isFoe(combatant) ? 'border-l-rose-400 dark:border-l-rose-500' : 'border-l-sky-400 dark:border-l-sky-500',
        onSelect && 'cursor-pointer',
        active
          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        selected && 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950',
        dragging && 'opacity-40',
        dead && 'opacity-50',
      )}
    >
      {reorderable && (
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', combatant.combatantId)
            // Drag a snapshot of the whole row, not just the grip.
            if (rowRef.current) e.dataTransfer.setDragImage(rowRef.current, 24, 20)
            onReorderStart?.()
          }}
          onDragEnd={() => onReorderEnd?.()}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Drag to reorder ${displayName(combatant)}`}
          title="Drag to reorder"
          className="shrink-0 cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <circle cx="9" cy="6" r="1.4" />
            <circle cx="15" cy="6" r="1.4" />
            <circle cx="9" cy="12" r="1.4" />
            <circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="18" r="1.4" />
            <circle cx="15" cy="18" r="1.4" />
          </svg>
        </span>
      )}

      <div className="w-7 text-center text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {/* Manual reorder can store a fractional rank; the DM only ever sees the integer. */}
        {Math.floor(combatant.initiative)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              aria-label={`Remove ${displayName(combatant)}`}
              title="Remove from the encounter"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-rose-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-3 w-3">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
          <span className={cx('truncate font-medium', dead && 'line-through')}>
            {displayName(combatant)}
          </span>
          {combatant.concentration && (
            <span
              title={concentrationTitle(combatant.concentration)}
              className="inline-flex h-5 shrink-0 items-center justify-center rounded bg-violet-200 px-1 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200"
            >
              C
            </span>
          )}
          {status === 'dead' && (
            <span className="rounded bg-slate-200 px-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              Dead
            </span>
          )}
          {status === 'unconscious' && (
            <span className="rounded bg-amber-200 px-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Unconscious
            </span>
          )}
          {combatant.isPC && isStable(combatant) && (
            <span className="rounded bg-emerald-200 px-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Stable
            </span>
          )}
        </div>

        {combatant.effects.length > 0 &&
          (() => {
            // Save-ends conditions that share a save show as one badge (they roll
            // and clear together); everything else is its own badge.
            const groups = groupSaveEnds(combatant.effects).filter((g) => g.effects.length >= 2)
            const grouped = new Set(groups.flatMap((g) => g.effects.map((e) => e.id)))
            const loose = combatant.effects.filter((e) => !grouped.has(e.id))
            return (
              <div className="mt-1 flex flex-wrap gap-1">
                {loose.map((e) => (
                  <EffectBadge
                    key={e.id}
                    effect={e}
                    onRemove={onRemoveEffect ? () => onRemoveEffect(e.id) : undefined}
                  />
                ))}
                {groups.map((g) => (
                  <SaveEndsBadge
                    key={`${g.ability}|${g.dc}|${g.when}`}
                    group={g}
                    onRemove={
                      onRemoveEffect ? () => g.effects.forEach((e) => onRemoveEffect(e.id)) : undefined
                    }
                  />
                ))}
              </div>
            )
          })()}

        {combatant.isPC && combatant.status === 'unconscious' && (
          <div className="mt-1">
            <DeathSavePips
              saves={combatant.deathSaves ?? { successes: 0, failures: 0 }}
            />
          </div>
        )}
      </div>

      <div className="text-right text-sm">
        <div>
          <span className="tabular-nums">
            {onHpInput ? (
              // Edit HP inline (damage/heal/set), like the stat block. Stop key events
              // from reaching the row so Enter commits the edit instead of selecting.
              <span onKeyDown={(e) => e.stopPropagation()}>
                <EditableField
                  initial=""
                  onCommit={onHpInput}
                  title="Set HP, or +N / −N"
                  inputMode="numeric"
                  inputClassName="w-12 rounded border border-slate-300 bg-white px-1 text-right tabular-nums dark:border-slate-600 dark:bg-slate-800"
                >
                  <span className={hpToneFor(tier)}>{hp.current}</span>
                </EditableField>
              </span>
            ) : (
              <span className={hpToneFor(tier)}>{hp.current}</span>
            )}
            <span className="text-slate-400 dark:text-slate-500">/{hp.max}</span>
          </span>
          {hp.temp > 0 && (
            <span className="text-sky-600 dark:text-sky-400"> +{hp.temp}</span>
          )}
          {showTier && <span className="sr-only"> {TIER_LABEL[tier]}</span>}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          AC {armorClass(combatant)}
        </div>
      </div>
    </div>
  )
}
