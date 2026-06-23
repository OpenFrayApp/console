// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type ReactNode } from 'react'
import { useAuth, type OAuthProvider } from '../auth/useAuth.ts'
import { CrossedSwordsIcon } from './CrossedSwordsIcon.tsx'

/** Discord wordmark glyph. */
function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3a13.6 13.6 0 0 0-.617 1.27 18.27 18.27 0 0 0-5.631 0A13.4 13.4 0 0 0 8.567 3 19.74 19.74 0 0 0 3.677 4.37C.533 9.045-.32 13.6.099 18.09a19.9 19.9 0 0 0 6.064 3.058c.488-.665.922-1.37 1.296-2.112a12.9 12.9 0 0 1-2.04-.978c.171-.125.339-.255.5-.389a14.2 14.2 0 0 0 12.16 0c.164.137.332.267.5.39-.652.385-1.336.71-2.043.978.375.74.81 1.447 1.296 2.112a19.8 19.8 0 0 0 6.067-3.058c.49-5.206-.838-9.72-3.518-13.72ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
    </svg>
  )
}

/** Google "G" mark in its brand colors. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
    </svg>
  )
}

const PROVIDERS: { id: OAuthProvider; label: string; icon: ReactNode; className: string }[] = [
  {
    id: 'discord',
    label: 'Continue with Discord',
    icon: <DiscordIcon />,
    className: 'bg-[#5865F2] text-white hover:bg-[#4752c4]',
  },
  {
    id: 'google',
    label: 'Continue with Google',
    icon: <GoogleIcon />,
    className:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  },
]

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
 * The dedicated sign-in page. Signing in with a provider for the first time creates
 * the account automatically; the provider redirect carries the user away and back.
 */
export function SignUpPage({ onClose }: { onClose: () => void }) {
  const { signInWithProvider } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  const start = async (provider: OAuthProvider) => {
    if (busy) return
    setError(null)
    setBusy(provider)
    const { error } = await signInWithProvider(provider)
    // On success the browser navigates to the provider, so this component unmounts;
    // we only land here again if the handoff itself failed.
    if (error) {
      setError(error)
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <a
                href="/"
                title="OpenFray home"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80 lg:w-[28rem] lg:shrink-0 lg:pr-4"
              >
                <span className="text-indigo-500 dark:text-indigo-400">
                  <CrossedSwordsIcon />
                </span>
                <h1 className="text-xl font-semibold tracking-tight">
                  <span className="text-indigo-500 dark:text-indigo-400">Open</span>Fray
                </h1>
              </a>
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign in to save your table</h3>
            <div className="mt-4 space-y-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => start(p.id)}
                  disabled={busy !== null}
                  className={`flex w-full items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${p.className}`}
                >
                  {p.icon}
                  {busy === p.id ? 'Redirecting…' : p.label}
                </button>
              ))}
              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Free forever — no ads, no paywall. New here? Signing in creates your account
              automatically. Your data stays private to it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
