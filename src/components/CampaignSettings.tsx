// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const FIELD =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const BTN =
  'flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * Campaign settings (edition + name), a signed-up-only feature. For anonymous
 * users the control prompts sign-up; for signed-in users it opens a small editor.
 * Settings persist on the user account (Supabase user_metadata).
 */
export function CampaignSettings({ onSignUp }: { onSignUp: () => void }) {
  const { user, configured, campaign, updateCampaign } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [edition, setEdition] = useState<'5.5' | '5.0'>('5.5')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  // Accounts (and thus campaigns) only exist when Supabase is configured.
  if (!configured) return null

  if (!user) {
    return (
      <button type="button" onClick={onSignUp} className={BTN} aria-label="Campaign settings — sign up to use">
        <GearIcon />
        Campaign
      </button>
    )
  }

  const openEditor = () => {
    // Seed from the saved settings each time it's opened.
    setName(campaign.name ?? '')
    setEdition(campaign.edition ?? '5.5')
    setOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await updateCampaign({ name: name.trim() || undefined, edition })
    setBusy(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => (open ? setOpen(false) : openEditor())} className={BTN}>
        <GearIcon />
        <span className="max-w-[10rem] truncate">{campaign.name || 'Campaign'}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{campaign.edition ?? '5.5'}</span>
      </button>
      {open && (
        <form
          onSubmit={save}
          className="absolute right-0 z-30 mt-1 w-64 space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Campaign name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Curse of Strahd" aria-label="Campaign name" className={FIELD} />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Edition</span>
            <select value={edition} onChange={(e) => setEdition(e.target.value as '5.5' | '5.0')} aria-label="Campaign edition" className={FIELD}>
              <option value="5.5">DnD 5.5 (2024)</option>
              <option value="5.0">DnD 5.0 (2014)</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
