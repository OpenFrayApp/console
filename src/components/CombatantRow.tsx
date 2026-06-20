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

/** A glanceable type marker: sword-and-shield for PCs, a monster face for monsters. */
function CombatantTypeIcon({ isPC }: { isPC: boolean }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (isPC) {
    return (
      <svg
        {...common}
        className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400"
        role="img"
        aria-label="Player character"
      >
        <path d="M12 21s6-3 6-8V6l-6-2-6 2v7c0 5 6 8 6 8z" />
        <path d="M12 7.5v6M10 9.5h4" />
      </svg>
    )
  }
  return (
    <svg
      {...common}
      className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400"
      role="img"
      aria-label="Monster"
    >
      <path d="M4 4l2.6 3.2a8 8 0 0 1 10.8 0L20 4" />
      <path d="M5.2 8A7 7 0 0 0 4 12a8 8 0 0 0 16 0 7 7 0 0 0-1.2-4" />
      <path d="M9 16.4c.9.7 1.9 1 3 1s2.1-.3 3-1" />
      <circle cx="9.2" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
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
        'flex items-center gap-3 rounded-lg border px-3 py-2',
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
          <CombatantTypeIcon isPC={combatant.isPC} />
          <span className={cx('truncate font-medium', dead && 'line-through')}>
            {displayName(combatant)}
          </span>
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

        {combatant.concentration && (
          <div className="mt-1 text-xs text-violet-600 dark:text-violet-400">
            Concentrating: {combatant.concentration.spell}
          </div>
        )}
      </div>

      <div className="text-right text-sm">
        <div>
          <span className={cx('tabular-nums', hpToneFor(tier))}>
            {hp.current}/{hp.max}
          </span>
          {hp.temp > 0 && (
            <span className="text-sky-600 dark:text-sky-400"> +{hp.temp} temp</span>
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
