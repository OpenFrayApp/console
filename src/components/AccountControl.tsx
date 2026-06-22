// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { AccountPanel } from './AccountPanel.tsx'
import { LoginPopover } from './LoginPopover.tsx'

/**
 * Header account control: the signed-in email (click to manage the account) +
 * Sign out, or a "Sign in" button that opens a compact log-in popover (with a link
 * to the full sign-up flow) when anonymous. Renders nothing until Supabase is
 * configured, so an unconfigured build stays anonymous-only.
 */
export function AccountControl({ onSignUp }: { onSignUp: () => void }) {
  const { user, loading, configured, signOut } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const loginRef = useRef<HTMLDivElement>(null)
  const closeLogin = useCallback(() => setLoginOpen(false), [])
  useDismiss(loginRef, loginOpen, closeLogin)

  if (!configured || loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="hidden max-w-[12rem] truncate text-sm text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200 sm:inline"
          title="Manage your account"
        >
          {user.email}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
        {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="relative" ref={loginRef}>
      <button
        type="button"
        onClick={() => setLoginOpen((o) => !o)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in
      </button>
      {loginOpen && (
        <LoginPopover
          onSignUp={() => {
            setLoginOpen(false)
            onSignUp()
          }}
          onClose={closeLogin}
        />
      )}
    </div>
  )
}
