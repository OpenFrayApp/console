// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { Theme } from '../state/persistence.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { MoonIcon, SunIcon } from './ThemeToggle.tsx'
import { track, EVENTS } from '../lib/analytics.ts'

/** Gear icon — the menu's own button. */
function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

/** Sliders icon — the Settings panel, distinct from the gear that opens this menu. */
function SlidersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M1 14h6" />
      <path d="M9 8h6" />
      <path d="M17 16h6" />
    </svg>
  )
}

/** Question mark in a circle — the handbook. */
function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2.5-2.5 2.5" />
      <path d="M12 17h.01" />
    </svg>
  )
}

const ITEM =
  'flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'

/** One row of the menu, as a button. */
function Item({
  icon,
  onClick,
  children,
  label,
}: {
  icon: ReactNode
  onClick: () => void
  children: string
  label?: string
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} aria-label={label} className={ITEM}>
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{icon}</span>
      {children}
    </button>
  )
}

/**
 * The console's odds and ends behind one gear: settings, the theme, and the handbook.
 * They were three separate buttons in the header, which is a crowded place — the things
 * a Game Master reaches for mid-fight belong there, and none of these are that.
 */
export function SettingsMenu({
  theme,
  onToggleTheme,
  onOpenSettings,
}: {
  theme: Theme
  onToggleTheme: () => void
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const target = theme === 'dark' ? 'light' : 'dark'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings and more"
        title="Settings and more"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <GearIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <Item
            icon={<SlidersIcon />}
            onClick={() => {
              close()
              onOpenSettings()
            }}
          >
            Settings
          </Item>

          {/* The menu stays open: the whole app changes colour, and leaving the row
            there lets the GM change their mind without hunting for the gear again. */}
          <Item
            icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            onClick={onToggleTheme}
            label={`Switch to ${target} mode`}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Item>

          <a
            href="/docs/"
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => {
              track(EVENTS.docsOpened)
              close()
            }}
            className={ITEM}
          >
            <span className="shrink-0 text-slate-500 dark:text-slate-400">
              <HelpIcon />
            </span>
            Handbook
          </a>
        </div>
      )}
    </div>
  )
}
