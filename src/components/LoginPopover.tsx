// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'

/**
 * Compact log-in popover for returning DMs: email + password, with a link to the
 * full sign-up flow for anyone without an account. On success the auth state flips
 * and the parent re-renders to the signed-in control. Dismissal (outside-click /
 * Escape) is handled by the anchor in AccountControl.
 */
export function LoginPopover({ onSignUp, onClose }: { onSignUp: () => void; onClose: () => void }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setError(error)
    else onClose()
  }

  return (
    <div className="absolute right-0 z-40 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-left shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <form onSubmit={submit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          autoFocus
          required
          className={FIELD}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          required
          className={FIELD}
        />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        No account?{' '}
        <button
          type="button"
          onClick={onSignUp}
          className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
        >
          Sign up
        </button>
      </p>
    </div>
  )
}
