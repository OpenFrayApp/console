// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type ReactNode } from 'react'
import { useAuth, type OAuthProvider } from '../../auth/useAuth.ts'
import { Wordmark } from '../shell/Wordmark.tsx'
import { track, EVENTS, type EventName } from '../../lib/analytics.ts'
import { Button } from '../ui/primitives.tsx'

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
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </svg>
  )
}

/**
 * The event each provider records. Typed as a full Record, so adding a provider to
 * OAuthProvider fails the build until it has an event and the split stays complete.
 */
const SIGN_IN_EVENT: Record<OAuthProvider, EventName> = {
  discord: EVENTS.signInDiscord,
  google: EVENTS.signInGoogle,
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

/**
 * The dedicated sign-in page. Signing in with a provider for the first time creates
 * the account automatically; the provider redirect carries the user away and back.
 */
export function SignUpPage({ onClose }: { onClose: () => void }) {
  const { signInWithProvider } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  /** Begin the provider's OAuth redirect; a failed handoff shows the error and re-enables. */
  const start = async (provider: OAuthProvider) => {
    if (busy) return
    track(SIGN_IN_EVENT[provider])
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
      className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950"
    >
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <Wordmark
                h1
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                wordClassName="text-xl font-semibold tracking-tight"
              />
            </div>
          </div>
          <Button onClick={onClose}>Back to the console</Button>
        </div>

        <div className="mx-auto mt-10 w-full max-w-md">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sign in
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Sign in to save your encounters, characters, and custom creatures.
            </p>
          </div>

          <div className="mt-6">
            <p
              id="sign-in-terms"
              className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
            >
              By continuing with Google or Discord, you agree to the{' '}
              <a
                href="/terms/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 underline dark:text-indigo-400"
              >
                Terms of Service
              </a>
              . Our{' '}
              <a
                href="/privacy/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 underline dark:text-indigo-400"
              >
                Privacy Policy
              </a>{' '}
              explains how we handle your personal data.
            </p>
            <div className="mt-4 space-y-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => start(p.id)}
                  disabled={busy !== null}
                  aria-describedby="sign-in-terms"
                  className={`tap flex w-full items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${p.className}`}
                >
                  {p.icon}
                  {busy === p.id ? 'Redirecting…' : p.label}
                </button>
              ))}
              {error && (
                <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              First time here? Continuing creates a free account. Your current encounter stays on
              the board.
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              You must be 13 or older.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
