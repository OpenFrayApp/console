// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { popoverClass } from '../ui/popover.ts'
import { Button } from '../ui/primitives.tsx'

/** User-silhouette icon (the account menu button). */
export function UserIcon() {
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

/** Open site account management or console-owned shared links from the header. */
export function AccountControl({
  onSignIn,
  onOpenShares,
  onOpenAccount,
}: {
  onSignIn: () => void
  onOpenAccount: () => void
  /** Open the shared-links screen. It is a screen rather than a dialog because it is
   *  somewhere a Game Master works, not somewhere they glance. */
  onOpenShares?: () => void
}) {
  const { user, loading, configured } = useAuth()
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
                onOpenAccount()
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
              }}
              className={item}
            >
              Shared links
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Button variant="primary" onClick={onSignIn}>
      Sign in
    </Button>
  )
}
