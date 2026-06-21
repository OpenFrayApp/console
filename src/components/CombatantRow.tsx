// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import { hpTier, type HpTier } from '../combat/resources.ts'
import { isStable } from '../combat/deathsaves.ts'
import { EffectBadge } from './EffectBadge.tsx'
import { DeathSavePips } from './DeathSaveControls.tsx'
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
}: CombatantRowProps) {
  const { hp, status } = combatant
  const dead = status === 'dead'
  const downed = dead || status === 'unconscious'
  const tier = hpTier(combatant)
  const showTier = !downed && tier !== 'healthy'

  return (
    <div
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
      className={cx(
        'group flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2',
        // Type-coded left edge: PCs sky, monsters rose.
        combatant.isPC ? 'border-l-sky-400 dark:border-l-sky-500' : 'border-l-rose-400 dark:border-l-rose-500',
        onSelect && 'cursor-pointer',
        active
          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        selected && 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950',
        dead && 'opacity-50',
      )}
    >
      <div className="w-7 text-center text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {combatant.initiative}
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

        {combatant.effects.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {combatant.effects.map((e) => (
              <EffectBadge
                key={e.id}
                effect={e}
                onRemove={onRemoveEffect ? () => onRemoveEffect(e.id) : undefined}
              />
            ))}
          </div>
        )}

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
          <span className={cx('tabular-nums', hpToneFor(tier))}>
            {hp.current}/{hp.max}
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
