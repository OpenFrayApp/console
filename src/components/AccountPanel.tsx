// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { track, EVENTS } from '../lib/analytics.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'
const LABEL = 'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

type Note = { kind: 'ok' | 'err'; text: string } | null

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', discord: 'Discord' }
/** The display label for an OAuth provider id ("google" → "Google"); email/absent → null. */
function providerName(provider?: string): string | null {
  if (!provider || provider === 'email') return null
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

/** A status line for a form: ok in green, errors in red; renders nothing when null. */
function NoteLine({ note }: { note: Note }) {
  if (!note) return null
  return (
    <p
      className={`text-sm ${note.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
    >
      {note.text}
    </p>
  )
}

/**
 * Account management for a signed-in user. With OAuth sign-in the email and
 * password are owned by the identity provider, so this panel just shows the
 * signed-in identity and permanently deletes the account + all its data (GDPR
 * erasure). Shown full-screen over the app; closes on a successful delete (the
 * user is signed out) or via Done.
 */
export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { user, signOut, deleteAccount } = useAuth()
  const provider = providerName(user?.app_metadata?.provider)

  const [confirm, setConfirm] = useState('')
  const [delNote, setDelNote] = useState<Note>(null)
  const [delBusy, setDelBusy] = useState(false)

  const confirmed = confirm.trim().toLowerCase() === (user?.email ?? '').toLowerCase()
  /** Delete the account once the typed email matches; on success the panel closes, signed out. */
  const submitDelete = async (e: FormEvent) => {
    e.preventDefault()
    if (!confirmed || delBusy) return
    setDelBusy(true)
    setDelNote(null)
    const { error } = await deleteAccount()
    if (error) {
      setDelBusy(false)
      setDelNote({ kind: 'err', text: error })
    } else {
      track(EVENTS.accountDeleted)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400" title={user?.email}>
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Signed in
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You're signed in with{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">{user?.email}</span>{' '}
              {provider ? (
                <>
                  via{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{provider}</span>
                  . Change your email or password in your {provider} account — OpenFray never sees
                  them.
                </>
              ) : (
                <>
                  via the service you signed in with. Change your email or password there — OpenFray
                  never sees them.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                track(EVENTS.signedOut)
                signOut()
              }}
              className="mt-3 text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Sign out
            </button>
          </section>

          <section className="rounded-lg border border-rose-300 p-4 dark:border-rose-900/70">
            <h3 className="mb-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Delete account
            </h3>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Deletes your account and <strong>everything in it</strong>: your fights, your
              creatures and spells, your campaigns, and your characters. It happens straight away
              and can't be undone.
            </p>
            <form onSubmit={submitDelete} className="space-y-2">
              <label className="block space-y-1">
                <span className={LABEL}>
                  Type your email (<span className="normal-case">{user?.email}</span>) to confirm
                </span>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={user?.email ?? 'your email'}
                  aria-label="Confirm account email to delete"
                  autoComplete="off"
                  className={FIELD}
                />
              </label>
              <NoteLine note={delNote} />
              <button
                type="submit"
                disabled={!confirmed || delBusy}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {delBusy ? 'Deleting…' : 'Delete my account'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
