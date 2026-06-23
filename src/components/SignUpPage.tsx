// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { CrossedSwordsIcon } from './CrossedSwordsIcon.tsx'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

/** What signing up unlocks — the value prop for the page. */
const BENEFITS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Saved & synced',
    body: 'Your in-progress fights persist to the cloud and follow you across devices — reopen mid-round next week.',
    icon: <path d="M21 12a9 9 0 1 1-6.219-8.56M21 3v6h-6" />,
  },
  {
    title: 'Custom creatures',
    body: 'Build your own homebrew creatures with the full stat-block editor — anything the SRD leaves out.',
    icon: <path d="m14.5 17.5 4 4M11 3 8 6m0 0L3 11l3 3 5-5M8 6l3 3m6.5 1.5L21 7l-4-4-3.5 3.5m4 4-9 9-3-3 9-9" />,
  },
  {
    title: 'Campaigns',
    body: 'Run campaigns with their own edition and house rules — crit damage, surprise, creature HP — applied across your fights.',
    icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />,
  },
  {
    title: 'Your party, kept',
    body: 'The PCs you add stay with your encounters across sessions — no re-entering the table every week.',
    icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
]

/**
 * The dedicated sign-up page: the value of an account on the left, the
 * email/password form on the right (sign up by default, with a log-in toggle for
 * returning DMs). Shown full-screen over the app; closes itself on success.
 */
export function SignUpPage({
  initialMode = 'in',
  onClose,
}: {
  /** Which tab opens first — 'in' (sign in) by default; 'up' for the sign-up link. */
  initialMode?: 'up' | 'in'
  onClose: () => void
}) {
  const { signUp, signIn } = useAuth()
  const [mode, setMode] = useState<'up' | 'in'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Set after a sign-up that needs email confirmation — the page can't auto-close
  // (there's no session yet), so we show a "check your inbox" panel instead.
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  const switchMode = (m: 'up' | 'in') => {
    setMode(m)
    setError(null)
    setConfirmEmail(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    const trimmed = email.trim()
    const result = await (mode === 'up' ? signUp : signIn)(trimmed, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (mode === 'up' && result.needsConfirmation) {
      setConfirmEmail(trimmed)
      setPassword('')
      return
    }
    // Otherwise a session was created: the auth state flips and the parent unmounts
    // this page.
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-indigo-500 dark:text-indigo-400">
              <CrossedSwordsIcon className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                <span className="text-indigo-500 dark:text-indigo-400">Open</span>Fray
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">DnD 5e combat console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Keep browsing
          </button>
        </div>

        <div className="mt-10 grid flex-1 items-start gap-10 lg:grid-cols-[1fr_24rem]">
          {/* Value proposition */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Save your table to the cloud.
            </h2>
            <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
              OpenFray runs great without an account — SRD monsters, quick adds, your party, and the
              dice are all free to use. Sign up to make it <em>yours</em>.
            </p>
            <p className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200">
              <span className="font-semibold">Free, and always will be.</span> No ads, no
              paywall, no premium tier — OpenFray is a passion project for the table.
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-6 w-6 shrink-0 text-indigo-600 dark:text-indigo-400"
                    aria-hidden="true"
                  >
                    {b.icon}
                  </svg>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{b.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign-up sent a confirmation email — there's no session yet, so show
              the next step instead of the form. */}
          {confirmEmail ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Check your inbox</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                We sent a confirmation link to <span className="font-medium text-slate-900 dark:text-slate-100">{confirmEmail}</span>.
                Click it to finish creating your account, then sign in here.
              </p>
              <button
                type="button"
                onClick={() => switchMode('in')}
                className="mt-4 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Back to sign in
              </button>
            </div>
          ) : (
          <form
            onSubmit={submit}
            className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => switchMode('in')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'in' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('up')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'up' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sign up
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                required
                className={FIELD}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                required
                className={FIELD}
              />
              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {busy ? 'Working…' : mode === 'up' ? 'Create account' : 'Sign in'}
              </button>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                {mode === 'up'
                  ? 'Free forever — no ads, no paywall. Your data stays private to your account.'
                  : "Welcome back, let's go on an adventure!"}
              </p>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}
