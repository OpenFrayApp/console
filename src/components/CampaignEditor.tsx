// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type FormEvent } from 'react'
import type { Edition } from '../schema/primitives.ts'
import type { Campaign } from '../schema/campaign.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

const LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

/**
 * Create or edit a single campaign (name + edition). Editing an existing campaign
 * also exposes Delete. The form owns only its draft fields; persistence is the
 * parent's job. Give it a `key` on the campaign id so the draft resets when the
 * selection changes.
 */
export function CampaignEditor({
  campaign,
  onSave,
  onDelete,
  onCancel,
}: {
  /** The campaign being edited, or null/undefined to create a new one. */
  campaign?: Campaign | null
  onSave: (campaign: Campaign) => void
  onDelete?: (id: string) => void
  onCancel: () => void
}) {
  const editing = campaign != null
  const [name, setName] = useState(campaign?.name ?? '')
  const [edition, setEdition] = useState<Edition>(campaign?.edition ?? '5.5')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ id: campaign?.id ?? crypto.randomUUID(), name: trimmed, edition })
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md space-y-4 py-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {editing ? 'Edit campaign' : 'New campaign'}
      </h2>

      <label className="block space-y-1">
        <span className={LABEL}>Campaign name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Curse of Strahd"
          aria-label="Campaign name"
          autoFocus
          className={FIELD}
        />
      </label>

      <label className="block space-y-1">
        <span className={LABEL}>Edition</span>
        <select
          value={edition}
          onChange={(e) => setEdition(e.target.value as Edition)}
          aria-label="Campaign edition"
          className={FIELD}
        >
          <option value="5.5">DnD 5.5 (2024)</option>
          <option value="5.0">DnD 5.0 (2014)</option>
        </select>
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {editing ? 'Save changes' : 'Create campaign'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        {editing && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(campaign.id)}
            className="ml-auto rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
