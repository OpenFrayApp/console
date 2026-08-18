// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { AccountPanel } from './AccountPanel.tsx'
import { SharedLinksPanel } from './SharedLinksPanel.tsx'
import type { MyShares } from '../state/shares.ts'
import { popoverClass } from './popover.ts'

/** User-silhouette icon (the account menu button). */
function UserIcon() {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/**
 * Header account control. Signed in: a user-icon button opening a menu with Profile (the
 * account panel), Shared encounters (the links this account has published) and Sign out.
 * Anonymous: a "Sign in" button that opens the full sign-in page (OAuth providers). Renders
 * nothing until Supabase is configured, so an unconfigured build stays anon-only.
 *
 * The shared links live here rather than with the board because a published link outlives
 * the fight it came from: "what have I put out there" is a question about the account.
 */
export function AccountControl({
  onSignIn,
  shares = { status: 'ok', shares: [] },
  onOpenShares,
  onUnpublish,
  allowReserved = false,
}: {
  onSignIn: () => void
  /** Whether this account may publish under a reserved name; the profile field honours it. */
  allowReserved?: boolean
  /** The links this account has published; the menu item opens them. */
  shares?: MyShares
  /** Re-read the list — opening the panel is the cheapest moment to ask. */
  onOpenShares?: () => void
  onUnpublish?: (code: string) => void
}) {
  const { user, loading, configured, signOut } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  const [sharesOpen, setSharesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useDismiss(menuRef, menuOpen, closeMenu)

  if (!configured || loading) return null

  if (user) {
    const item =
      'block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={user.email}
          className="tap flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <UserIcon />
        </button>
        {menuOpen && (
          <div role="menu" className={`${popoverClass('roomy:w-44')} py-1 roomy:overflow-hidden`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setAccountOpen(true)
              }}
              className={item}
            >
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onOpenShares?.()
                setSharesOpen(true)
              }}
              className={item}
            >
              Shared encounters
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                signOut()
              }}
              className={item}
            >
              Sign out
            </button>
          </div>
        )}
        {accountOpen && (
          <AccountPanel onClose={() => setAccountOpen(false)} allowReserved={allowReserved} />
        )}
        {sharesOpen && (
          <SharedLinksPanel
            shares={shares}
            onUnpublish={onUnpublish ?? (() => {})}
            onClose={() => setSharesOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSignIn}
      className="tap-y whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
    >
      Sign in
    </button>
  )
}
