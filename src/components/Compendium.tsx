// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useMemo, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { Campaign } from '../schema/campaign.ts'
import { formatCr } from '../compendium/format.ts'
import { loadSrdCreatures, loadSrdSpells } from '../compendium/srd.ts'
import { CampaignEditor } from './CampaignEditor.tsx'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { CustomMonsterForm } from './CustomMonsterForm.tsx'
import { creatureToDraft, emptyDraft, type MonsterDraft } from './customMonster.ts'
import { SpellCard } from './SpellCard.tsx'

type Tab = 'creatures' | 'spells' | 'campaigns'

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-md px-3 py-1 text-sm font-medium',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  )
}

/** Left column for the Campaigns tab: a "New campaign" button + the user's list. */
function CampaignList({
  campaigns,
  gated,
  selectedId,
  onNew,
  onSelect,
}: {
  campaigns: Campaign[]
  gated: boolean
  selectedId: string | 'new' | null
  onNew: () => void
  onSelect: (id: string) => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        New campaign
      </button>

      {gated ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Sign up to create and manage campaigns.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
          </p>
          <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {campaigns.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                    c.id === selectedId
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {c.edition}
                  </span>
                </button>
              </li>
            ))}
            {campaigns.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No campaigns yet
              </li>
            )}
          </ul>
        </>
      )}
    </>
  )
}

/** Right column for the Campaigns tab: the editor, a sign-up prompt, or an empty state. */
function CampaignDetail({
  gated,
  mode,
  campaign,
  onNew,
  onGated,
  onSave,
  onDelete,
  onCancel,
}: {
  gated: boolean
  mode: string | 'new' | null
  campaign?: Campaign | null
  onNew: () => void
  onGated: () => void
  onSave: (campaign: Campaign) => void
  onDelete: (id: string) => void
  onCancel: () => void
}) {
  if (gated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="max-w-sm text-slate-500 dark:text-slate-400">
          Campaigns are saved to your account. Sign up to create one and set its edition.
        </p>
        <button
          type="button"
          onClick={onGated}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign up
        </button>
      </div>
    )
  }

  if (mode === 'new' || campaign) {
    return (
      <CampaignEditor
        key={mode}
        campaign={campaign}
        onSave={onSave}
        onDelete={campaign ? onDelete : undefined}
        onCancel={onCancel}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="max-w-sm text-slate-500 dark:text-slate-400">
        Select a campaign to edit it, or create a new one. Each campaign has its own
        edition.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Create campaign
      </button>
    </div>
  )
}

export function Compendium({
  customCreatures = [],
  onCreateCreature,
  onUpdateCreature,
  onDeleteCreature,
  campaigns = [],
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  createGated = false,
  onGated,
}: {
  /** The user's custom creature library, listed alongside the SRD. */
  customCreatures?: Creature[]
  /** Save a freshly-authored creature to the library. */
  onCreateCreature: (creature: Creature) => void
  /** Replace an edited creature in the library. */
  onUpdateCreature?: (creature: Creature) => void
  /** Remove a creature from the library. */
  onDeleteCreature?: (id: string) => void
  /** The signed-in user's campaigns (empty when anonymous). */
  campaigns?: Campaign[]
  /** Save a new campaign. */
  onCreateCampaign?: (campaign: Campaign) => void
  /** Replace an edited campaign. */
  onUpdateCampaign?: (campaign: Campaign) => void
  /** Remove a campaign. */
  onDeleteCampaign?: (id: string) => void
  /** When anonymous, create actions prompt sign-up instead. */
  createGated?: boolean
  onGated?: () => void
}) {
  const [tab, setTab] = useState<Tab>('creatures')
  const [query, setQuery] = useState('')
  const [creatures, setCreatures] = useState<Creature[] | null>(null)
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The editor modal: null = closed; otherwise the draft to edit and an id when
  // updating an existing creature (vs creating a new one).
  const [editor, setEditor] = useState<{ draft: MonsterDraft; editId: string | null } | null>(null)
  // Campaigns tab: which campaign is open in the editor — a campaign id, 'new', or
  // null (nothing open).
  const [campaignEdit, setCampaignEdit] = useState<string | 'new' | null>(null)

  useEffect(() => {
    loadSrdCreatures().then(setCreatures, () => setCreatures([]))
    loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [])

  const loading = tab === 'creatures' ? creatures === null : spells === null

  // The user's custom creatures sit alongside the SRD in one searchable list.
  const allCreatures = useMemo(
    () => [...customCreatures, ...(creatures ?? [])],
    [customCreatures, creatures],
  )

  const entries = useMemo(() => {
    const list =
      tab === 'creatures'
        ? allCreatures.map((c) => ({
            id: c.id,
            name: c.name,
            meta: `CR ${formatCr(c.cr)}`,
            custom: c.id.startsWith('custom:'),
          }))
        : (spells ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            meta: s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`,
            custom: false,
          }))
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [tab, allCreatures, spells, query])

  const selectedCreature =
    tab === 'creatures' ? allCreatures.find((c) => c.id === selectedId) : undefined
  const selectedSpell =
    tab === 'spells' ? (spells ?? []).find((s) => s.id === selectedId) : undefined

  const switchTab = (next: Tab) => {
    setTab(next)
    setSelectedId(null)
    setQuery('')
    setCampaignEdit(null)
  }

  // Campaigns are signed-up-only; for anonymous users every entry point prompts
  // sign-up instead of opening the editor.
  const editingCampaign =
    campaignEdit && campaignEdit !== 'new'
      ? campaigns.find((c) => c.id === campaignEdit)
      : null
  const startNewCampaign = () => (createGated ? onGated?.() : setCampaignEdit('new'))
  const saveCampaign = (campaign: Campaign) => {
    if (campaignEdit === 'new') onCreateCampaign?.(campaign)
    else onUpdateCampaign?.(campaign)
    setCampaignEdit(null)
  }
  const removeCampaign = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id)
    if (window.confirm(`Delete “${campaign?.name ?? 'this campaign'}”?`)) {
      onDeleteCampaign?.(id)
      setCampaignEdit(null)
    }
  }

  const startCreate = () => (createGated ? onGated?.() : setEditor({ draft: emptyDraft(), editId: null }))
  const startEdit = (c: Creature) => setEditor({ draft: creatureToDraft(c), editId: c.id })
  const submitEditor = (creature: Creature) => {
    if (editor?.editId) onUpdateCreature?.(creature)
    else onCreateCreature(creature)
  }
  const deleteCreature = (c: Creature) => {
    if (window.confirm(`Delete “${c.name}” from your library?`)) {
      if (selectedId === c.id) setSelectedId(null)
      onDeleteCreature?.(c.id)
    }
  }
  // Edit/Delete only on the user's own custom creatures.
  const isCustom = (c: Creature) => c.id.startsWith('custom:')

  return (
    <div className="grid h-full min-h-0 gap-4 md:grid-cols-[20rem_1fr]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="mb-2 flex gap-1">
          <TabButton active={tab === 'creatures'} onClick={() => switchTab('creatures')}>
            Creatures
          </TabButton>
          <TabButton active={tab === 'spells'} onClick={() => switchTab('spells')}>
            Spells
          </TabButton>
          <TabButton active={tab === 'campaigns'} onClick={() => switchTab('campaigns')}>
            Campaigns
          </TabButton>
        </div>

        {tab === 'campaigns' ? (
          <CampaignList
            campaigns={campaigns}
            gated={createGated}
            selectedId={campaignEdit}
            onNew={startNewCampaign}
            onSelect={(id) => setCampaignEdit(id)}
          />
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab}…`}
              aria-label={`Search ${tab}`}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />

            {loading ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : (
              <>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {entries.length} {tab}
            </p>
            <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                      e.id === selectedId
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                    )}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {e.custom && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          Custom
                        </span>
                      )}
                      {e.meta}
                    </span>
                  </button>
                </li>
              ))}
              {entries.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  No matches
                </li>
              )}
            </ul>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-auto rounded-lg border border-slate-200 px-4 pb-4 dark:border-slate-800">
        {tab === 'campaigns' ? (
          <CampaignDetail
            gated={createGated}
            mode={campaignEdit}
            campaign={editingCampaign}
            onNew={startNewCampaign}
            onGated={() => onGated?.()}
            onSave={saveCampaign}
            onDelete={removeCampaign}
            onCancel={() => setCampaignEdit(null)}
          />
        ) : selectedCreature ? (
          // The stat block carries its own sticky header (with top padding inside
          // its solid background). Custom creatures get Edit / Delete in the source row.
          <CreatureStatBlock
            creature={selectedCreature}
            onEdit={isCustom(selectedCreature) ? () => startEdit(selectedCreature) : undefined}
            onDelete={isCustom(selectedCreature) ? () => deleteCreature(selectedCreature) : undefined}
          />
        ) : selectedSpell ? (
          <div className="pt-4">
            <SpellCard spell={selectedSpell} />
          </div>
        ) : (
          // Nothing selected: a centered prompt. On the Creatures tab it doubles as
          // the entry point for building a custom creature.
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="rounded-full bg-slate-100 p-5 dark:bg-slate-800/70">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <path d="M12 7v14" />
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
              </svg>
            </div>
            <p className="max-w-sm text-slate-500 dark:text-slate-400">
              {tab === 'creatures'
                ? 'Select a creature to view it, or create a custom one.'
                : 'Select a spell to view it.'}
            </p>
            {tab === 'creatures' && (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Create custom creature
              </button>
            )}
          </div>
        )}
      </div>

      <CustomMonsterForm
        open={editor != null}
        initialDraft={editor?.draft ?? emptyDraft()}
        editId={editor?.editId ?? null}
        onClose={() => setEditor(null)}
        onSubmit={submitEditor}
      />
    </div>
  )
}
