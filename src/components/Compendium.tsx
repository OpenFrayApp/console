// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useMemo, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { Campaign } from '../schema/campaign.ts'
import type { RosterPc } from '../schema/roster.ts'
import { formatCr } from '../compendium/format.ts'
import type { LibrarySort } from '../state/settings.ts'
import { loadSrdCreatures, loadSrdSpells } from '../compendium/srd.ts'
import { makeSpellLinker } from '../compendium/spelllinker.ts'
import { SpellLinkContext } from './spellLinkContext.ts'
import {
  DEFAULT_ENABLED_LIBRARIES,
  editionBadgeClass,
  editionLabel,
  inEnabledLibrary,
  librarySource,
  librarySourceBadgeClass,
  libraryTag,
} from '../compendium/libraries.ts'
import { CampaignCard } from './CampaignCard.tsx'
import { CampaignFormModal } from './CampaignFormModal.tsx'
import { campaignAcronym } from './campaignLabels.ts'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { PresetCard } from './PresetCard.tsx'
import type { EffectPreset } from '../schema/preset.ts'
import { isOwnPreset } from '../schema/preset.ts'
import { CustomMonsterForm } from './CustomMonsterForm.tsx'
import { ImportCreatureModal } from './ImportCreatureModal.tsx'
import { creatureToDraft, emptyDraft, type MonsterDraft } from './customMonster.ts'
import { PcStatBlock } from './PcStatBlock.tsx'
import { PcFormModal } from './PcFormModal.tsx'
import { abilityMod } from '../schema/primitives.ts'
import { SpellCard, SpellTags } from './SpellCard.tsx'
import { CustomSpellForm } from './CustomSpellForm.tsx'
import { emptySpellDraft, spellToDraft, type SpellDraft } from './customSpell.ts'
import { track, EVENTS } from '../lib/analytics.ts'
import { cx } from '../lib/cx.ts'
import { EntryBadges, TabButton } from './ui.tsx'

export type Tab = 'creatures' | 'spells' | 'campaigns' | 'characters' | 'effects'

/** The selectable campaign list with its count; gated (anonymous) users see a sign-in note. */
function CampaignList({
  campaigns,
  gated,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  campaigns: Campaign[]
  gated: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  emptyLabel: string
}) {
  if (gated) {
    return (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Sign in to see your campaigns.
      </p>
    )
  }
  return (
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
              <span className="flex shrink-0 items-center gap-1.5">
                <EntryBadges
                  edition={editionLabel(c.edition)}
                  editionTone={editionBadgeClass(c.edition)}
                />
              </span>
            </button>
          </li>
        ))}
        {campaigns.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
        )}
      </ul>
    </>
  )
}

/** The preset list: the GM's own, then whatever the enabled libraries ship. */
function PresetList({
  presets,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  presets: EffectPreset[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyLabel: string
}) {
  return (
    <>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {presets.length} {presets.length === 1 ? 'preset' : 'presets'}
      </p>
      <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {presets.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={cx(
                'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                p.id === selectedId
                  ? 'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
              )}
            >
              <span className="min-w-0 truncate">{p.name}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {/* No edition badge: a preset is board state, and a condition or a
                    modifier reads the same in either edition. */}
                <EntryBadges
                  custom={isOwnPreset(p)}
                  source={p.source && librarySource(p.source)}
                  sourceTone={p.source && librarySourceBadgeClass(p.source)}
                />
              </span>
            </button>
          </li>
        ))}
        {presets.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
        )}
      </ul>
    </>
  )
}

function PcList({
  pcs,
  campaigns,
  gated,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  pcs: RosterPc[]
  campaigns: Campaign[]
  gated: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  emptyLabel: string
}) {
  /** A PC's campaign as an acronym tag; blank when unset or the campaign is gone. */
  const tag = (campaignId?: string | null): string => {
    const name = campaigns.find((c) => c.id === campaignId)?.name
    return name ? campaignAcronym(name) : ''
  }
  if (gated) {
    return (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Sign in to see your characters.
      </p>
    )
  }
  return (
    <>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {pcs.length} {pcs.length === 1 ? 'character' : 'characters'}
      </p>
      <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {pcs.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={cx(
                'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                p.id === selectedId
                  ? 'bg-indigo-50 dark:bg-indigo-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-900',
              )}
            >
              <span className="truncate">{p.name}</span>
              <span
                className="shrink-0 text-xs text-slate-400 dark:text-slate-500"
                title={campaigns.find((c) => c.id === p.campaignId)?.name}
              >
                {tag(p.campaignId)}
              </span>
            </button>
          </li>
        ))}
        {pcs.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
        )}
      </ul>
    </>
  )
}

/** The library screen: tabbed lists with search, a detail pane, and the create/edit modals. */
export function Compendium({
  customCreatures = [],
  onCreateCreature,
  onUpdateCreature,
  onDeleteCreature,
  customSpells = [],
  onCreateSpell,
  onUpdateSpell,
  onDeleteSpell,
  campaigns = [],
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  presets = [],
  onRenamePreset,
  onDeletePreset,
  rosterPcs = [],
  onCreatePc,
  onUpdatePc,
  onDeletePc,
  onAddPcToEncounter,
  initialTab = 'creatures',
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
  librarySort = 'name',
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
  /** The user's custom spell library, listed alongside the SRD. */
  customSpells?: Spell[]
  /** Save a freshly-authored spell to the library. */
  onCreateSpell?: (spell: Spell) => void
  /** Replace an edited spell in the library. */
  onUpdateSpell?: (spell: Spell) => void
  /** Remove a spell from the library. */
  onDeleteSpell?: (id: string) => void
  /** The signed-in user's campaigns (empty when anonymous). */
  campaigns?: Campaign[]
  /** Save a new campaign. */
  onCreateCampaign?: (campaign: Campaign) => void
  /** Replace an edited campaign. */
  onUpdateCampaign?: (campaign: Campaign) => void
  /** Remove a campaign. */
  onDeleteCampaign?: (id: string) => void
  /** The signed-in user's party roster (empty when anonymous). */
  rosterPcs?: RosterPc[]
  /** Save a new roster PC. */
  onCreatePc?: (pc: RosterPc) => void
  /** Replace an edited roster PC. */
  onUpdatePc?: (pc: RosterPc) => void
  /** Remove a roster PC. */
  onDeletePc?: (id: string) => void
  /** Drop a roster PC into the current encounter (instantiated as a combatant). */
  onAddPcToEncounter?: (pc: RosterPc) => void
  /** Which tab to open on (the component remounts when the view re-enters). */
  initialTab?: Tab
  /** Every preset on offer — the GM's own first, then the enabled libraries'. */
  presets?: EffectPreset[]
  /** Rename one of the GM's own presets. */
  onRenamePreset?: (preset: EffectPreset) => void
  /** Delete one of the GM's own presets. */
  onDeletePreset?: (id: string) => void
  /** Content library ids to show. */
  enabledLibraries?: string[]
  /** When false, homebrew (custom) creatures and spells are hidden. On by default. */
  showHomebrew?: boolean
  /** List order: by name, or by CR (creatures) / spell level (spells). */
  librarySort?: LibrarySort
  /** When anonymous, create actions prompt sign-up instead. */
  createGated?: boolean
  onGated?: () => void
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const [creatures, setCreatures] = useState<Creature[] | null>(null)
  const [spells, setSpells] = useState<Spell[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // null = closed; otherwise the draft, with editId set when updating an existing creature.
  const [editor, setEditor] = useState<{ draft: MonsterDraft; editId: string | null } | null>(null)
  const [importing, setImporting] = useState(false)
  const [spellEditor, setSpellEditor] = useState<{
    draft: SpellDraft
    editId: string | null
  } | null>(null)
  const [campaignForm, setCampaignForm] = useState<{ campaign: Campaign | null } | null>(null)
  const [pcForm, setPcForm] = useState<{ pc: RosterPc | null } | null>(null)

  useEffect(() => {
    loadSrdCreatures().then(setCreatures, () => setCreatures([]))
    loadSrdSpells().then(setSpells, () => setSpells([]))
  }, [])

  const loading =
    tab === 'creatures' ? creatures === null : tab === 'spells' ? spells === null : false

  const allCreatures = useMemo(
    () => [...customCreatures, ...(creatures ?? [])],
    [customCreatures, creatures],
  )

  const allSpells = useMemo(() => [...customSpells, ...(spells ?? [])], [customSpells, spells])
  // Resolve `spell:<id>` prose links to their card for the hover preview.
  const resolveSpell = useMemo(() => {
    const byId = new Map(allSpells.map((s) => [s.id, s]))
    return (ref?: string) => (ref ? byId.get(ref) : undefined)
  }, [allSpells])
  // Link bare cast-spell names in creature prose (custom creatures aren't pre-baked).
  const linkSpells = useMemo(() => {
    const byName = new Map<string, string>()
    for (const s of allSpells) {
      if (!byName.has(s.name) || s.id.startsWith('srd-5.2')) byName.set(s.name, s.id)
    }
    return makeSpellLinker([...byName].map(([name, ref]) => ({ name, ref })))
  }, [allSpells])

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q)) : campaigns
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [campaigns, query])

  const filteredPcs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? rosterPcs.filter((p) => p.name.toLowerCase().includes(q)) : rosterPcs
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [rosterPcs, query])

  // Sorted the way the other tabs are. A preset has no challenge rating, so the CR
  // setting falls back to the same alphabetical order rather than leaving the list in
  // whatever order the libraries happen to ship.
  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? presets.filter((p) => p.name.toLowerCase().includes(q)) : presets
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [presets, query])

  const entries = useMemo(() => {
    // Edition tag: a custom entry uses its own edition; an SRD entry, its library's.
    const tag = (item: { id: string; source: string; edition?: string }) =>
      item.id.startsWith('custom:') ? item.edition : libraryTag(item.source)
    const list =
      tab === 'creatures'
        ? allCreatures
            .filter((c) => inEnabledLibrary(c, enabledLibraries, showHomebrew))
            .map((c) => ({
              id: c.id,
              name: c.name,
              sortKey: c.cr ?? 0,
              meta: `CR ${formatCr(c.cr)}`,
              custom: c.id.startsWith('custom:'),
              src: c.id.startsWith('custom:') ? undefined : librarySource(c.source),
              srcClass: c.id.startsWith('custom:') ? undefined : librarySourceBadgeClass(c.source),
              lib: tag(c),
              libClass: editionBadgeClass(tag(c)),
              concentration: false,
              ritual: false,
            }))
        : allSpells
            .filter((s) => inEnabledLibrary(s, enabledLibraries, showHomebrew))
            .map((s) => ({
              id: s.id,
              name: s.name,
              sortKey: s.level,
              meta: s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`,
              custom: s.id.startsWith('custom:'),
              src: s.id.startsWith('custom:') ? undefined : librarySource(s.source),
              srcClass: s.id.startsWith('custom:') ? undefined : librarySourceBadgeClass(s.source),
              lib: tag(s),
              libClass: editionBadgeClass(tag(s)),
              concentration: s.concentration,
              ritual: s.ritual,
            }))
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list
    // By CR/level (ascending), name as tiebreak; otherwise straight alphabetical.
    return [...filtered].sort((a, b) =>
      librarySort === 'cr'
        ? a.sortKey - b.sortKey || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    )
  }, [tab, allCreatures, allSpells, query, enabledLibraries, showHomebrew, librarySort])

  const selectedCreature =
    tab === 'creatures' ? allCreatures.find((c) => c.id === selectedId) : undefined
  const selectedSpell = tab === 'spells' ? allSpells.find((s) => s.id === selectedId) : undefined
  const selectedCampaign =
    tab === 'campaigns' ? campaigns.find((c) => c.id === selectedId) : undefined
  const selectedPc = tab === 'characters' ? rosterPcs.find((p) => p.id === selectedId) : undefined
  const selectedPreset = tab === 'effects' ? presets.find((p) => p.id === selectedId) : undefined

  /** Change the tab and clear both the selection and the search. */
  const switchTab = (next: Tab) => {
    setTab(next)
    setSelectedId(null)
    setQuery('')
  }

  // Campaigns are signed-up-only; for anonymous users the create action prompts sign-up.
  const startNewCampaign = () => (createGated ? onGated?.() : setCampaignForm({ campaign: null }))
  /** Create or update the campaign from the form, then select it. */
  const submitCampaign = (campaign: Campaign) => {
    if (campaignForm?.campaign) onUpdateCampaign?.(campaign)
    else {
      track(EVENTS.campaignCreated)
      onCreateCampaign?.(campaign)
    }
    setSelectedId(campaign.id)
  }
  /** Delete the campaign once the GM confirms; deselects it first if it was open. */
  const removeCampaign = (campaign: Campaign) => {
    if (
      window.confirm(
        `Delete the campaign “${campaign.name}”? Its house rules go with it, and this can’t be undone.`,
      )
    ) {
      if (selectedId === campaign.id) setSelectedId(null)
      onDeleteCampaign?.(campaign.id)
    }
  }

  // Roster PCs are signed-up-only; anonymous create prompts sign-up.
  const startNewPc = () => (createGated ? onGated?.() : setPcForm({ pc: null }))
  /** Create or update the roster PC from the form, then select it. */
  const submitPc = (pc: RosterPc) => {
    if (pcForm?.pc) onUpdatePc?.(pc)
    else {
      track(EVENTS.characterCreated)
      onCreatePc?.(pc)
    }
    setSelectedId(pc.id)
  }
  /** Delete the roster PC once the GM confirms; a copy already on the board stays put. */
  const removePc = (pc: RosterPc) => {
    if (
      window.confirm(
        `Delete “${pc.name}”? This can’t be undone. Anyone already on the board stays there.`,
      )
    ) {
      if (selectedId === pc.id) setSelectedId(null)
      onDeletePc?.(pc.id)
    }
  }

  /** Open the creature editor on a blank draft; when gated it prompts sign-up instead. */
  const startCreate = () =>
    createGated ? onGated?.() : setEditor({ draft: emptyDraft(), editId: null })
  /** Open the import-creature modal; when gated it prompts sign-up instead. */
  const startImport = () => (createGated ? onGated?.() : setImporting(true))
  /** Open the creature editor pre-filled from an existing creature. */
  const startEdit = (c: Creature) => setEditor({ draft: creatureToDraft(c), editId: c.id })
  /** Save the editor's draft: update the edited creature, or add a new one to the library. */
  const submitEditor = (creature: Creature) => {
    if (editor?.editId) onUpdateCreature?.(creature)
    else {
      track(EVENTS.customCreatureCreated)
      onCreateCreature(creature)
    }
  }
  /** Delete a custom creature once the GM confirms; copies already in a fight stay put. */
  const deleteCreature = (c: Creature) => {
    if (
      window.confirm(
        `Delete “${c.name}” from your library? This can’t be undone. Copies already in a fight stay there.`,
      )
    ) {
      if (selectedId === c.id) setSelectedId(null)
      onDeleteCreature?.(c.id)
    }
  }
  /** Whether a creature is the user's own work — a "custom:" id. */
  const isCustom = (c: Creature) => c.id.startsWith('custom:')

  /** Open the spell editor on a blank draft; when gated it prompts sign-up instead. */
  const startCreateSpell = () =>
    createGated ? onGated?.() : setSpellEditor({ draft: emptySpellDraft(), editId: null })
  /** Open the spell editor pre-filled from an existing spell. */
  const startEditSpell = (s: Spell) => setSpellEditor({ draft: spellToDraft(s), editId: s.id })
  /** Save the editor's draft: update the edited spell or add a new one, then select it. */
  const submitSpellEditor = (spell: Spell) => {
    if (spellEditor?.editId) onUpdateSpell?.(spell)
    else {
      track(EVENTS.customSpellCreated)
      onCreateSpell?.(spell)
    }
    setSelectedId(spell.id)
  }
  /** Delete a custom spell once the GM confirms; deselects it first if it was open. */
  const deleteSpell = (s: Spell) => {
    if (window.confirm(`Delete “${s.name}” from your library? This can’t be undone.`)) {
      if (selectedId === s.id) setSelectedId(null)
      onDeleteSpell?.(s.id)
    }
  }
  /** Whether a spell is the user's own work — a "custom:" id. */
  const isCustomSpell = (s: Spell) => s.id.startsWith('custom:')

  return (
    <div className="grid h-full min-h-0 gap-4 md:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <div role="tablist" aria-label="Compendium" className="mb-2 flex gap-0.5">
          <TabButton active={tab === 'creatures'} onClick={() => switchTab('creatures')}>
            Creatures
          </TabButton>
          <TabButton active={tab === 'spells'} onClick={() => switchTab('spells')}>
            Spells
          </TabButton>
          <TabButton active={tab === 'characters'} onClick={() => switchTab('characters')}>
            Characters
          </TabButton>
          <TabButton active={tab === 'effects'} onClick={() => switchTab('effects')}>
            Effects
          </TabButton>
          <TabButton active={tab === 'campaigns'} onClick={() => switchTab('campaigns')}>
            Campaigns
          </TabButton>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tab}…`}
          aria-label={`Search ${tab}`}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {tab === 'effects' ? (
          <PresetList
            presets={filteredPresets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyLabel={
              searching
                ? 'No presets match that search.'
                : 'No presets yet. Build an effect you\u2019ll use again, then Save as preset.'
            }
          />
        ) : tab === 'campaigns' ? (
          <CampaignList
            campaigns={filteredCampaigns}
            gated={createGated}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyLabel={searching ? 'No campaigns match that search.' : 'No campaigns yet.'}
          />
        ) : tab === 'characters' ? (
          <PcList
            pcs={filteredPcs}
            campaigns={campaigns}
            gated={createGated}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyLabel={searching ? 'No characters match that search.' : 'No characters yet.'}
          />
        ) : loading ? (
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
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{e.name}</span>
                      <SpellTags concentration={e.concentration} ritual={e.ritual} />
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <EntryBadges
                        custom={e.custom}
                        source={e.src}
                        sourceTone={e.srcClass}
                        edition={e.lib && editionLabel(e.lib)}
                        editionTone={e.libClass}
                      />
                      {e.meta}
                    </span>
                  </button>
                </li>
              ))}
              {entries.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  {searching
                    ? `No ${tab} match that search.`
                    : `No ${tab} in the rule sets you have turned on.`}
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-auto rounded-lg border border-slate-200 px-4 pb-4 dark:border-slate-800">
        {(tab === 'campaigns' || tab === 'characters') && createGated ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="max-w-sm text-slate-500 dark:text-slate-400">
              {tab === 'characters'
                ? 'Sign in to save your players and drop them into any fight.'
                : "Sign in to create campaigns and set your table's house rules."}
            </p>
            <button
              type="button"
              onClick={() => onGated?.()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Sign in
            </button>
          </div>
        ) : selectedPreset ? (
          <PresetCard
            preset={selectedPreset}
            onRename={
              isOwnPreset(selectedPreset) && onRenamePreset
                ? (name) => onRenamePreset({ ...selectedPreset, name })
                : undefined
            }
            onDelete={
              isOwnPreset(selectedPreset) && onDeletePreset
                ? () => {
                    setSelectedId(null)
                    onDeletePreset(selectedPreset.id)
                  }
                : undefined
            }
          />
        ) : selectedCreature ? (
          // No pt-4 here: the stat block carries its own sticky header with top padding inside its solid background.
          <SpellLinkContext.Provider value={linkSpells}>
            <CreatureStatBlock
              creature={selectedCreature}
              resolveSpell={resolveSpell}
              onEdit={isCustom(selectedCreature) ? () => startEdit(selectedCreature) : undefined}
              onDelete={
                isCustom(selectedCreature) ? () => deleteCreature(selectedCreature) : undefined
              }
            />
          </SpellLinkContext.Provider>
        ) : selectedSpell ? (
          <div className="flex min-h-0 flex-1 flex-col pt-4">
            <SpellCard
              spell={selectedSpell}
              onEdit={
                isCustomSpell(selectedSpell) ? () => startEditSpell(selectedSpell) : undefined
              }
              onDelete={isCustomSpell(selectedSpell) ? () => deleteSpell(selectedSpell) : undefined}
            />
          </div>
        ) : selectedCampaign ? (
          <CampaignCard
            campaign={selectedCampaign}
            onEdit={() => setCampaignForm({ campaign: selectedCampaign })}
            onDelete={() => removeCampaign(selectedCampaign)}
          />
        ) : selectedPc ? (
          <PcStatBlock
            name={selectedPc.name}
            subtitle={[
              'Player character',
              selectedPc.race,
              selectedPc.alignment,
              campaigns.find((c) => c.id === selectedPc.campaignId)?.name,
            ]
              .filter(Boolean)
              .join(' · ')}
            ac={selectedPc.ac}
            hp={{ current: selectedPc.maxHp, max: selectedPc.maxHp, temp: 0 }}
            initiativeMod={selectedPc.abilities ? abilityMod(selectedPc.abilities.dex) : 0}
            speed={selectedPc.speed}
            abilities={selectedPc.abilities}
            resistances={selectedPc.resistances}
            immunities={selectedPc.immunities}
            vulnerabilities={selectedPc.vulnerabilities}
            languages={selectedPc.languages}
            senses={selectedPc.senses}
            faith={selectedPc.faith}
            personalityTraits={selectedPc.personalityTraits}
            ideals={selectedPc.ideals}
            bonds={selectedPc.bonds}
            flaws={selectedPc.flaws}
            backstory={selectedPc.backstory}
            dmNotes={selectedPc.dmNotes}
            onEditDmNotes={(text) => onUpdatePc?.({ ...selectedPc, dmNotes: text || undefined })}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => onAddPcToEncounter?.(selectedPc)}
                  className="mr-auto rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Add to encounter
                </button>
                <button
                  type="button"
                  onClick={() => setPcForm({ pc: selectedPc })}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removePc(selectedPc)}
                  className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  Delete
                </button>
              </>
            }
          />
        ) : (
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
                ? createGated
                  ? 'Pick a creature from the list to read its stat block, or sign in to build your own.'
                  : 'Pick a creature from the list to read its stat block, or build your own.'
                : tab === 'campaigns'
                  ? 'Pick a campaign from the list to see its house rules, or create one.'
                  : tab === 'characters'
                    ? 'Pick a character from the list to see their details, or create one.'
                    : tab === 'effects'
                      ? 'Pick a preset from the list to see what it applies. Build one in a fight with Apply effect, then Save as preset.'
                      : createGated
                        ? 'Pick a spell from the list to read its card, or sign in to build your own.'
                        : 'Pick a spell from the list to read its card, or build your own.'}
            </p>
            {tab === 'creatures' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startCreate}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {createGated ? 'Sign in' : 'Create custom creature'}
                </button>
                {!createGated && (
                  <button
                    type="button"
                    onClick={startImport}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Import a creature
                  </button>
                )}
              </div>
            )}
            {tab === 'campaigns' && (
              <button
                type="button"
                onClick={startNewCampaign}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Create campaign
              </button>
            )}
            {tab === 'characters' && (
              <button
                type="button"
                onClick={startNewPc}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Create character
              </button>
            )}
            {tab === 'spells' && (
              <button
                type="button"
                onClick={startCreateSpell}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                {createGated ? 'Sign in' : 'Create custom spell'}
              </button>
            )}
          </div>
        )}
      </div>

      <CustomMonsterForm
        open={editor != null}
        initialDraft={editor?.draft ?? emptyDraft()}
        editId={editor?.editId ?? null}
        customCreatures={customCreatures}
        enabledLibraries={enabledLibraries}
        showHomebrew={showHomebrew}
        librarySort={librarySort}
        onClose={() => setEditor(null)}
        onSubmit={submitEditor}
      />

      <ImportCreatureModal
        open={importing}
        onClose={() => setImporting(false)}
        onImport={onCreateCreature}
      />

      <CustomSpellForm
        open={spellEditor != null}
        initialDraft={spellEditor?.draft ?? emptySpellDraft()}
        editId={spellEditor?.editId ?? null}
        customSpells={customSpells}
        enabledLibraries={enabledLibraries}
        showHomebrew={showHomebrew}
        librarySort={librarySort}
        onClose={() => setSpellEditor(null)}
        onSubmit={submitSpellEditor}
      />

      <CampaignFormModal
        open={campaignForm != null}
        campaign={campaignForm?.campaign}
        onClose={() => setCampaignForm(null)}
        onSubmit={submitCampaign}
      />

      <PcFormModal
        open={pcForm != null}
        pc={pcForm?.pc}
        campaigns={campaigns}
        onClose={() => setPcForm(null)}
        onSubmit={submitPc}
      />
    </div>
  )
}
