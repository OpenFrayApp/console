// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type FormEvent } from 'react'
import type { Edition } from '../schema/primitives.ts'
import {
  DEFAULT_CAMPAIGN_RULES,
  type Campaign,
  type CampaignRules,
} from '../schema/campaign.ts'
import {
  CRIT_OPTIONS,
  EDITION_OPTIONS,
  HP_OPTIONS,
  SURPRISE_OPTIONS,
  TIEBREAK_OPTIONS,
  type Option,
} from './campaignLabels.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

const LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

/** A labelled <select> over a set of options. */
function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
}) {
  return (
    <label className="block space-y-1">
      <span className={LABEL}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className={FIELD}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Modal to create or edit a campaign — its name, edition, and house rules. Mirrors
 * the custom-creature form: controlled via `open`, seeded from `campaign` (null =
 * create), and handing the built Campaign to `onSubmit`. Editing keeps the id.
 */
export function CampaignFormModal({
  open,
  campaign,
  onClose,
  onSubmit,
}: {
  open: boolean
  /** The campaign being edited, or null to create a new one. */
  campaign?: Campaign | null
  onClose: () => void
  onSubmit: (campaign: Campaign) => void
}) {
  const editing = campaign != null
  const [name, setName] = useState('')
  const [edition, setEdition] = useState<Edition>('5.5')
  const [rules, setRules] = useState<CampaignRules>(DEFAULT_CAMPAIGN_RULES)

  // Seed the form each time it opens (create → defaults, edit → the campaign's values).
  useEffect(() => {
    if (!open) return
    setName(campaign?.name ?? '')
    setEdition(campaign?.edition ?? '5.5')
    setRules(campaign?.rules ?? DEFAULT_CAMPAIGN_RULES)
  }, [open, campaign])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const setRule = <K extends keyof CampaignRules>(key: K, value: CampaignRules[K]) =>
    setRules((prev) => ({ ...prev, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ id: campaign?.id ?? crypto.randomUUID(), name: trimmed, edition, rules })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-label={editing ? 'Edit campaign' : 'New campaign'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="my-auto w-full max-w-md rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{editing ? 'Edit campaign' : 'New campaign'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
          <label className="block space-y-1">
            <span className={LABEL}>Campaign name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Curse of Strahd"
              aria-label="Campaign name"
              autoFocus
              autoComplete="off"
              className={FIELD}
            />
          </label>

          <SelectField label="Edition" value={edition} onChange={setEdition} options={EDITION_OPTIONS} />

          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">House rules</h3>
            <SelectField
              label="Critical hit damage"
              value={rules.crit}
              onChange={(v) => setRule('crit', v)}
              options={CRIT_OPTIONS}
            />
            <SelectField
              label="Surprise round"
              value={rules.surprise}
              onChange={(v) => setRule('surprise', v)}
              options={SURPRISE_OPTIONS}
            />
            <SelectField
              label="Creature HP"
              value={rules.hp}
              onChange={(v) => setRule('hp', v)}
              options={HP_OPTIONS}
            />
            <SelectField
              label="Initiative ties"
              value={rules.initiativeTiebreak}
              onChange={(v) => setRule('initiativeTiebreak', v)}
              options={TIEBREAK_OPTIONS}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {editing ? 'Save changes' : 'Create campaign'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
