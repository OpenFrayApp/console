// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'
import { cx } from '../lib/cx.ts'

/** The screens the phone layout can show, in swipe order, plus the compendium. */
export type MobileTab = 'tracker' | 'stat-block' | 'controls' | 'compendium'

/** The shape every icon in this bar is drawn on. */
const ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** Rows icon — the tracker's initiative list. */
function RowsIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </svg>
  )
}

/** Scroll icon — the selected combatant's stat block. */
function ScrollIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  )
}

/** d20 icon — the controls, the dice, and the game log. */
function DieIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <path d="M12 2 3.5 7v10L12 22l8.5-5V7z" />
      <path d="M12 2v6.5" />
      <path d="m3.5 7 8.5 1.5L20.5 7" />
      <path d="M12 8.5 6 17.5h12z" />
      <path d="m3.5 17 2.5.5" />
      <path d="m20.5 17-2.5.5" />
      <path d="M12 22v-4.5" />
    </svg>
  )
}

/** Open-book icon — the compendium. */
function BookIcon() {
  return (
    <svg {...ICON} className="h-5 w-5">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

/** One tab of the bar: an icon over a small label, filled while its screen is up. */
function Tab({
  icon,
  label,
  active,
  onSelect,
}: {
  icon: ReactNode
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium',
        active
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * The swipe shell's bottom bar: the console's three swipeable screens and the
 * compendium, as tabs. Hidden in the split and wide shells, where the screens are
 * grid columns and the header's view toggle covers the compendium.
 */
export function MobileNav({
  active,
  onSelect,
}: {
  active: MobileTab
  onSelect: (tab: MobileTab) => void
}) {
  return (
    <nav
      aria-label="Console screens"
      className="grid shrink-0 grid-cols-4 border-t border-slate-200 pb-[env(safe-area-inset-bottom)] dark:border-slate-800 split:hidden wide:hidden"
    >
      <Tab
        icon={<RowsIcon />}
        label="Tracker"
        active={active === 'tracker'}
        onSelect={() => onSelect('tracker')}
      />
      <Tab
        icon={<ScrollIcon />}
        label="Stat block"
        active={active === 'stat-block'}
        onSelect={() => onSelect('stat-block')}
      />
      <Tab
        icon={<DieIcon />}
        label="Controls"
        active={active === 'controls'}
        onSelect={() => onSelect('controls')}
      />
      <Tab
        icon={<BookIcon />}
        label="Compendium"
        active={active === 'compendium'}
        onSelect={() => onSelect('compendium')}
      />
    </nav>
  )
}
