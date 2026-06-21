// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useAuth } from '../auth/useAuth.ts'

/**
 * Header account control: the signed-in email + Sign out, or a "Sign up" button
 * that opens the sign-up page when anonymous. Renders nothing until Supabase is
 * configured, so an unconfigured build stays anonymous-only.
 */
export function AccountControl({ onSignUp }: { onSignUp: () => void }) {
  const { user, loading, configured, signOut } = useAuth()

  if (!configured || loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden max-w-[12rem] truncate text-sm text-slate-500 dark:text-slate-400 sm:inline"
          title={user.email}
        >
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSignUp}
      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
    >
      Sign up
    </button>
  )
}
