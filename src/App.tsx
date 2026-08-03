// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Creature } from './schema/creature.ts'
import type { Spell } from './schema/spell.ts'
import type { Combatant, MonsterCombatant, PlayerCharacter } from './schema/combatant.ts'
import type { Effect } from './schema/effect.ts'
import { autoLabel, instantiate, isFoe, nameOf } from './combat/combatant.ts'
import { abilityMod } from './schema/primitives.ts'
import { resolveMaxHp } from './combat/hp.ts'
import { beginEncounter, nextTurn } from './combat/initiative.ts'
import { rechargeActions, rollRecharge } from './combat/recharge.ts'
import { saveBonus } from './combat/masssave.ts'
import { saveEndsClears, saveEndsEffects } from './combat/saveEnds.ts'
import { rechargeLimited } from './combat/resources.ts'
import { roll } from './dice/roll.ts'
import type { Encounter } from './schema/encounter.ts'
import { DEFAULT_CAMPAIGN_RULES, type Campaign } from './schema/campaign.ts'
import { rosterPcToCombatant, syncCombatantFromRoster, type RosterPc } from './schema/roster.ts'
import { CampaignRulesContext } from './state/campaignRules.ts'
import { emptyEncounter, encounterReducer, type NewLogEntry } from './state/encounter.ts'
import { loadSession, saveSession, type View } from './state/persistence.ts'
import { useTheme } from './hooks/useTheme.ts'
import {
  claimPlayerCode,
  loadCloudEncounter,
  saveCloudEncounter,
  type ClaimResult,
} from './state/cloudEncounter.ts'
import {
  deleteCustomCreature,
  loadCustomCreatures,
  saveCustomCreature,
  updateCustomCreature,
} from './state/cloudCreatures.ts'
import {
  deleteCustomSpell,
  loadCustomSpells,
  saveCustomSpell,
  updateCustomSpell,
} from './state/cloudSpells.ts'
import {
  deleteEffectPreset,
  loadEffectPresets,
  saveEffectPreset,
  updateEffectPreset,
} from './state/cloudEffects.ts'
import { libraryPresets } from './combat/presets/index.ts'
import type { EffectPreset } from './schema/preset.ts'
import {
  deleteCampaign,
  loadCampaigns,
  saveCampaign,
  updateCampaign,
} from './state/cloudCampaigns.ts'
import {
  deleteRosterPc,
  loadRosterPcs,
  saveRosterPc,
  updateRosterPc,
} from './state/cloudPlayers.ts'
import { useAuth } from './auth/useAuth.ts'
import { Compendium, type Tab as CompendiumTab } from './components/Compendium.tsx'
import { EncounterConsole } from './components/EncounterConsole.tsx'
import { RecapScreen, EndCombatPrompt } from './components/Recap.tsx'
import { allFoesDefeated, allPlayersDown, buildRecap, type Recap } from './combat/recap.ts'
import { AddCreaturePicker } from './components/AddCreaturePicker.tsx'
import {
  loadSettings,
  saveSettings,
  type LibrarySort,
  type PlayerViewSettings,
} from './state/settings.ts'
import { useBoardBroadcast } from './state/playerChannel.ts'
import { randomPlayerCode } from './state/playerCode.ts'
import { AddPcForm } from './components/AddPcForm.tsx'
import { AddPcPicker } from './components/AddPcPicker.tsx'
import { PcFormModal } from './components/PcFormModal.tsx'
import { CustomMonsterForm } from './components/CustomMonsterForm.tsx'
import { creatureToDraft, emptyDraft, type MonsterDraft } from './components/customMonster.ts'
import { AddQuickForm } from './components/AddQuickForm.tsx'
import { CastSpellPanel } from './components/CastSpellPanel.tsx'
import { InitiativePrompt } from './components/InitiativePrompt.tsx'
import { MassSavePanel } from './components/MassSavePanel.tsx'
import { RestControls } from './components/RestControls.tsx'
import { QuickRoll } from './components/QuickRoll.tsx'
import { CampaignPicker } from './components/CampaignPicker.tsx'
import { AccountControl } from './components/AccountControl.tsx'
import { CombatTimers } from './components/CombatTimers.tsx'
import { CombatDifficulty } from './components/CombatDifficulty.tsx'
import { SettingsPanel } from './components/SettingsPanel.tsx'
import { CrossedSwordsIcon } from './components/CrossedSwordsIcon.tsx'
import { SettingsMenu } from './components/SettingsMenu.tsx'
import { SharePanel } from './components/SharePanel.tsx'
import { SignUpPage } from './components/SignUpPage.tsx'
import { GameLogModal, type OnGmRoll, type OnNote, type OnRoll } from './components/GameLog.tsx'
import { track, EVENTS } from './lib/analytics.ts'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

/** A player rolls their own initiative; monsters and quick adds are auto-rolled. */
const isPlayer = (c: Combatant): boolean => c.isPC && c.kind !== 'quick'

/** Sword icon (encounter side of the view toggle). */
function SwordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M14.5 17.5 4 7V4h3l10.5 10.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
    </svg>
  )
}

/** Open-book icon (compendium side of the view toggle). */
function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

/** Encounter / Compendium as an icon segmented control. */
function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  /** Class list for one toggle segment, filled when active. */
  const cell = (active: boolean) =>
    `flex items-center justify-center px-3 py-1.5 ${
      active
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`
  return (
    <nav
      className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700"
      aria-label="View"
    >
      <button
        type="button"
        onClick={() => onChange('encounter')}
        aria-current={view === 'encounter' ? 'page' : undefined}
        aria-label="Show the fight"
        title="Show the fight"
        className={cell(view === 'encounter')}
      >
        <SwordIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange('compendium')}
        aria-current={view === 'compendium' ? 'page' : undefined}
        aria-label="Show the compendium"
        title="Show the compendium"
        className={`border-l border-slate-300 dark:border-slate-700 ${cell(view === 'compendium')}`}
      >
        <BookIcon />
      </button>
    </nav>
  )
}

/** A creature's Dexterity modifier — the initiative fallback when no bonus is listed. */
const dexMod = (creature: Creature): number => abilityMod(creature.abilities.dex)

/** The app shell: owns encounter, library, and UI state; wires persistence; renders every view. */
function App() {
  const [restored] = useState(loadSession)
  // Theme is shared with the marketing site (and the player view) via the
  // `openfray-theme` key; the restored session is the fallback, then dark.
  const [theme, toggleTheme] = useTheme(restored?.theme ?? 'dark')
  const [view, setView] = useState<View>(() => restored?.view ?? 'encounter')
  const [compendiumTab, setCompendiumTab] = useState<CompendiumTab>('creatures')
  // Which content libraries the compendium/picker show. A device-local preference
  // for every user (anon included), persisted in localStorage like the theme.
  const [enabledLibraries, setEnabledLibrariesState] = useState<string[]>(
    () => loadSettings().enabledLibraries,
  )
  /** Set which libraries show and persist the choice to device-local settings. */
  const setEnabledLibraries = (ids: string[]) => {
    setEnabledLibrariesState(ids)
    saveSettings({ enabledLibraries: ids })
  }
  // Whether homebrew (custom) creations show in the compendium and pickers. On by default;
  // device-local like the library toggles.
  const [showHomebrew, setShowHomebrewState] = useState<boolean>(() => loadSettings().showHomebrew)
  /** Set whether homebrew shows and persist the choice to device-local settings. */
  const setShowHomebrew = (value: boolean) => {
    setShowHomebrewState(value)
    saveSettings({ showHomebrew: value })
  }
  // How the compendium orders its list (by name, or by CR / spell level).
  const [librarySort, setLibrarySortState] = useState<LibrarySort>(() => loadSettings().librarySort)
  /** Set the compendium sort order and persist the choice to device-local settings. */
  const setLibrarySort = (value: LibrarySort) => {
    setLibrarySortState(value)
    saveSettings({ librarySort: value })
  }
  // What the shared player view gives away, and the code its link uses. The setting is
  // device-local like the theme; the code is device-local while anonymous and lives on
  // the encounter row once signed in, which is what makes it the same on every device.
  const [playerView, setPlayerViewState] = useState<PlayerViewSettings>(
    () => loadSettings().playerView,
  )
  /** Set what players see and persist the choice to device-local settings. */
  const setPlayerView = (value: PlayerViewSettings) => {
    setPlayerViewState(value)
    saveSettings({ playerView: value })
  }
  const [playerCode, setPlayerCode] = useState<string | null>(() => loadSettings().playerViewCode)
  // Sharing resumes after a reload and ends with the tab, which is what the session
  // snapshot already means — a refresh mid-fight shouldn't drop the table's screens.
  const [sharing, setSharing] = useState(() => restored?.sharing ?? false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // End-of-combat recap + the "all enemies defeated" prompt (fired once per defeat).
  const [recap, setRecap] = useState<Recap | null>(null)
  const [endPrompt, setEndPrompt] = useState(false)
  const foesPromptedRef = useRef(false)
  const [encounterPcEdit, setEncounterPcEdit] = useState<{
    pc: RosterPc
    combatantId: string
  } | null>(null)
  const [encounterCreatureEdit, setEncounterCreatureEdit] = useState<{
    draft: MonsterDraft
    editId: string
  } | null>(null)
  const [encounter, dispatch] = useReducer(
    encounterReducer,
    undefined,
    () => restored?.encounter ?? emptyEncounter(),
  )
  const [logOpen, setLogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(() => restored?.selectedId ?? null)
  const [initPrompt, setInitPrompt] = useState<Record<string, string> | null>(null)
  // The initiative the app pre-rolled into that box, held until the fight it starts has
  // somewhere to record it — and dropped if the Game Master backs out of Begin.
  const preRolled = useRef<Record<string, NewLogEntry>>({})

  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const cloudId = useRef<string | null>(null)
  const cloudHydrated = useRef(false)
  const cloudInserting = useRef(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [customCreatures, setCustomCreatures] = useState<Creature[]>([])
  const [customSpells, setCustomSpells] = useState<Spell[]>([])
  const [ownPresets, setOwnPresets] = useState<EffectPreset[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [rosterPcs, setRosterPcs] = useState<RosterPc[]>([])
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(
    () => restored?.activeCampaignId ?? null,
  )
  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId)
    : undefined
  const activeRules = activeCampaign?.rules ?? DEFAULT_CAMPAIGN_RULES
  // What the Apply effect modal offers: the Game Master's own presets first, then the
  // ones each enabled library ships. Library presets follow the library, not the account,
  // so an anonymous table gets them too.
  const presets = useMemo(
    () => [...ownPresets, ...libraryPresets(enabledLibraries)],
    [ownPresets, enabledLibraries],
  )

  useEffect(() => {
    if (user) setAuthOpen(false)
  }, [user])

  // Wait for the initial session lookup before loading/clearing user data — otherwise
  // the first render (user still null) runs the sign-out branch and wipes the active
  // campaign restored from the session.
  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setCustomCreatures([])
      setCustomSpells([])
      setOwnPresets([])
      setCampaigns([])
      setRosterPcs([])
      setActiveCampaignId(null)
      return
    }
    let active = true
    loadCustomCreatures().then((list) => {
      if (active) setCustomCreatures(list)
    })
    loadCustomSpells().then((list) => {
      if (active) setCustomSpells(list)
    })
    loadEffectPresets().then((list) => {
      if (active) setOwnPresets(list)
    })
    loadCampaigns().then((list) => {
      if (active) setCampaigns(list)
    })
    loadRosterPcs().then((list) => {
      if (active) setRosterPcs(list)
    })
    return () => {
      active = false
    }
  }, [userId, authLoading])

  // On sign-in, hydrate the live encounter from the cloud (the authoritative copy).
  useEffect(() => {
    if (authLoading) return
    cloudHydrated.current = false
    cloudInserting.current = false
    if (!userId) {
      cloudId.current = null
      return
    }
    let active = true
    loadCloudEncounter().then((res) => {
      if (!active) return
      if (res.status === 'loaded') {
        cloudId.current = res.id
        dispatch({ type: 'load', encounter: res.encounter })
        setSelectedId(null)
        // A signed-in GM's chosen name follows the account, so it wins over whatever
        // this device happened to mint while anonymous.
        if (res.playerCode) setPlayerCode(res.playerCode)
      }
      // Only write once the answer is known. A read that failed is not "this user has
      // no row" — treating it as one is what orphaned encounters into duplicates, and
      // the fight is safe in sessionStorage meanwhile.
      cloudHydrated.current = res.status !== 'failed'
    })
    return () => {
      active = false
    }
  }, [userId, authLoading])

  // Local-first autosave (debounced): mirror the session to sessionStorage, and when
  // signed in also persist the encounter to the cloud. Background — the UI never waits.
  useEffect(() => {
    const handle = setTimeout(() => {
      saveSession({ encounter, theme, view, selectedId, activeCampaignId, sharing })
      // Guard against duplicate rows: only write once hydrated, and never start a
      // second insert while the first is in flight.
      if (userId && cloudHydrated.current && !cloudInserting.current) {
        const inserting = cloudId.current == null
        if (inserting) cloudInserting.current = true
        saveCloudEncounter(cloudId.current, encounter).then((id) => {
          if (id) cloudId.current = id
          if (inserting) cloudInserting.current = false
        })
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [encounter, theme, view, selectedId, activeCampaignId, sharing, userId])

  // The summary travels with the board while the GM has it up, so the table reads the
  // fight's outcome on their own screens. Experience is left out of a milestone
  // campaign, the same call the GM's own recap makes.
  const sharedRecap = useMemo(
    () => (recap ? { ...recap, showXp: activeRules.leveling !== 'milestone' } : null),
    [recap, activeRules.leveling],
  )

  // Share the board while sharing is on. Broadcast only — nothing about the fight is
  // written anywhere, so an anonymous GM can share without a row reaching the database.
  useBoardBroadcast(sharing ? playerCode : null, encounter, playerView, sharedRecap)

  /**
   * Start or stop sharing. An anonymous GM has no name to claim, so the first share
   * mints a random code and keeps it, and the link stays the same from then on.
   */
  const toggleSharing = () => {
    if (sharing) {
      track(EVENTS.playerViewStopped)
      setSharing(false)
      return
    }
    if (!playerCode) {
      const code = randomPlayerCode()
      setPlayerCode(code)
      saveSettings({ playerViewCode: code })
    }
    track(EVENTS.playerViewShared)
    setSharing(true)
  }

  /**
   * Claim a chosen name for a signed-in GM. The database's unique index is the judge —
   * RLS means we can never see another GM's row to check first — so a rejected name
   * leaves the current link working rather than clearing it.
   */
  const claimShareCode = async (code: string): Promise<ClaimResult> => {
    // The code rides on the encounter row, and a GM who has just signed in may not have
    // one yet — the autosave is debounced. Mint it here rather than refusing the claim,
    // guarding the insert the same way the autosave does so the two can't race a
    // duplicate row into existence.
    if (!cloudId.current && !cloudInserting.current) {
      cloudInserting.current = true
      const id = await saveCloudEncounter(null, encounter)
      if (id) cloudId.current = id
      cloudInserting.current = false
    }
    if (!cloudId.current) return 'failed'
    const result = await claimPlayerCode(cloudId.current, code)
    if (result === 'ok') {
      track(EVENTS.playerViewNamed)
      setPlayerCode(code)
    }
    return result
  }

  const pushRoll: OnRoll = (label, result, details) => {
    dispatch({
      type: 'log',
      entry: { category: 'roll', message: label, result, ...details },
    })
  }

  const pushNote: OnNote = (label, category = 'note') => {
    dispatch({ type: 'log', entry: { category, message: label } })
  }

  const pushGmRoll: OnGmRoll = (label, result) => {
    dispatch({ type: 'log', entry: { category: 'roll', message: label, result, gmOnly: true } })
  }

  /** Rewrite a renamed combatant's old name to the new one across past log entries. */
  const renameInLog = (oldName: string, newName: string) => {
    dispatch({ type: 'renameLog', from: oldName, to: newName })
  }

  /** Add the picked creature to the fight as a fresh combatant; duplicates get numbered labels. */
  const handlePick = (creature: Creature) => {
    track(EVENTS.creatureAdded)
    const sameKind = encounter.combatants.filter(
      (c) => !c.isPC && c.creatureId === creature.id,
    ).length
    const label = autoLabel(creature.name, sameKind)
    addCombatant(
      instantiate(creature, {
        combatantId: crypto.randomUUID(),
        initiative: 0,
        label,
        // The campaign's HP method decides how this instance's max HP is rolled.
        maxHp: resolveMaxHp(creature, activeRules.hp),
      }),
    )
  }

  // Creating a custom creature saves it to the library (it shows in the compendium
  // and is pickable into encounters) — it does not drop into the current fight.
  const handleCreateCreature = (creature: Creature) => {
    setCustomCreatures((prev) => [creature, ...prev])
    saveCustomCreature(creature)
  }

  /** Swap the edited creature into the library list and persist the change to the account. */
  const handleUpdateCreature = (creature: Creature) => {
    setCustomCreatures((prev) => prev.map((c) => (c.id === creature.id ? creature : c)))
    updateCustomCreature(creature)
  }

  /** Drop the creature from the library list and delete it from the account. */
  const handleDeleteCreature = (id: string) => {
    setCustomCreatures((prev) => prev.filter((c) => c.id !== id))
    deleteCustomCreature(id)
  }

  /** Add the new spell to the library list and persist it to the account. */
  const handleCreateSpell = (spell: Spell) => {
    setCustomSpells((prev) => [spell, ...prev])
    saveCustomSpell(spell)
  }

  /** Swap the edited spell into the library list and persist the change to the account. */
  const handleUpdateSpell = (spell: Spell) => {
    setCustomSpells((prev) => prev.map((s) => (s.id === spell.id ? spell : s)))
    updateCustomSpell(spell)
  }

  /** Drop the spell from the library list and delete it from the account. */
  const handleDeleteSpell = (id: string) => {
    setCustomSpells((prev) => prev.filter((s) => s.id !== id))
    deleteCustomSpell(id)
  }

  /** Keep a newly-named preset in the library list and persist it to the account. */
  const handleCreatePreset = (preset: EffectPreset) => {
    setOwnPresets((prev) => [preset, ...prev])
    saveEffectPreset(preset)
  }

  /** Swap the edited preset into the library list and persist the change. */
  const handleUpdatePreset = (preset: EffectPreset) => {
    setOwnPresets((prev) => prev.map((p) => (p.id === preset.id ? preset : p)))
    updateEffectPreset(preset)
  }

  /** Drop the preset from the library list and delete it from the account. */
  const handleDeletePreset = (id: string) => {
    setOwnPresets((prev) => prev.filter((p) => p.id !== id))
    deleteEffectPreset(id)
  }

  // Campaigns persist to the user's account (signed-up only). Optimistic in-memory
  // update first; the cloud write is background and best-effort.
  const handleCreateCampaign = (campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev])
    saveCampaign(campaign)
  }

  /** Swap the edited campaign into the list and persist the change to the account. */
  const handleUpdateCampaign = (campaign: Campaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? campaign : c)))
    updateCampaign(campaign)
  }

  /** Drop the campaign from the list and delete it from the account. */
  const handleDeleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    deleteCampaign(id)
  }

  // Roster PCs persist to the user's account (signed-up only), same optimistic pattern.
  const handleCreatePc = (pc: RosterPc) => {
    setRosterPcs((prev) => [pc, ...prev])
    saveRosterPc(pc)
  }

  /** Swap the edited character into the roster and persist the change to the account. */
  const handleUpdatePc = (pc: RosterPc) => {
    setRosterPcs((prev) => prev.map((p) => (p.id === pc.id ? pc : p)))
    updateRosterPc(pc)
  }

  /** Drop the character from the roster and delete it from the account. */
  const handleDeletePc = (id: string) => {
    setRosterPcs((prev) => prev.filter((p) => p.id !== id))
    deleteRosterPc(id)
  }

  // Add a roster PC to the current fight: instantiate a fresh combatant (the roster
  // entry is a reusable template), then jump to the encounter and select it.
  const handleAddPcToEncounter = (pc: RosterPc) => {
    track(EVENTS.pcAdded)
    addCombatant(rosterPcToCombatant(pc))
    setView('encounter')
  }

  // Header "Add PC → create": send a signed-in user to the compendium's Characters tab.
  const openRosterCreate = () => {
    setCompendiumTab('characters')
    setView('compendium')
  }

  // Edit a roster-backed PC from the encounter: open the editor seeded from its saved
  // character (a no-op if the saved character is gone, e.g. deleted from the roster).
  const handleEditEncounterPc = (c: PlayerCharacter) => {
    const pc = c.rosterId ? rosterPcs.find((p) => p.id === c.rosterId) : undefined
    if (pc) setEncounterPcEdit({ pc, combatantId: c.combatantId })
  }

  // Edit a roster-backed PC's GM notes from the encounter: update the on-board copy
  // (shows now, autosaves with the encounter) and the saved character (persists).
  const handleEditEncounterPcDmNotes = (c: PlayerCharacter, text: string) => {
    const notes = text || undefined
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (x) => (x.isPC ? { ...x, dmNotes: notes } : x),
    })
    const pc = c.rosterId ? rosterPcs.find((p) => p.id === c.rosterId) : undefined
    if (pc) handleUpdatePc({ ...pc, dmNotes: notes })
  }

  // Edit a custom creature from the encounter: open the editor seeded from the library
  // creature. Saving updates the library/DB only — the on-board snapshot stays put
  // (AGENTS.md rule #4). A no-op if the creature was deleted from the library.
  const handleEditEncounterCreature = (c: MonsterCombatant) => {
    const creature = customCreatures.find((cr) => cr.id === c.creatureId)
    if (creature)
      setEncounterCreatureEdit({ draft: creatureToDraft(creature), editId: creature.id })
  }

  // The view toggle opens the compendium on its default (creatures) tab; only the
  // create-a-character flow targets the Characters tab.
  const handleViewChange = (next: View) => {
    if (next === 'compendium') {
      track(EVENTS.compendiumOpened)
      setCompendiumTab('creatures')
    }
    setView(next)
  }

  // Advancing the turn moves the center panel to whoever's turn it now is.
  const selectActive = (next: Encounter) => {
    const active = next.combatants[next.activeIndex]
    if (active) setSelectedId(active.combatantId)
  }
  // At the start of a creature's turn, roll the recharge die for each of its spent
  // recharge abilities (each separately, each logged); a success makes it usable.
  const autoRecharge = (next: Encounter) => {
    const active = next.combatants[next.activeIndex]
    if (!active || active.isPC) return
    for (const action of rechargeActions(active.creature)) {
      if (active.limitedUseState[action.id]?.available === false) {
        const { recharged, roll: result } = rollRecharge(action)
        pushGmRoll(`${active.label}: ${action.name} recharge`, result)
        if (recharged) {
          dispatch({
            type: 'update',
            id: active.combatantId,
            update: (c) => (c.isPC ? c : rechargeLimited(c, action.id)),
          })
        }
      }
    }
  }
  // Auto-roll a monster's save-ends effects at the chosen moment of its turn (PCs
  // roll their own — never rolled for them). One die per effect: two effects that
  // share an ability and DC came from different sources, so one roll can't end both.
  // A success also clears the effect's bundle-mates — the save ends the whole spell.
  const autoRollSaveEnds = (c: Combatant | undefined, when: 'startOfTurn' | 'endOfTurn') => {
    if (!c || c.isPC) return
    for (const save of saveEndsEffects(c.effects)) {
      if (save.when !== when) continue
      const bonus = saveBonus(c, save.ability) ?? 0
      const result = roll(`1d20${bonus >= 0 ? `+${bonus}` : `${bonus}`}`, { kind: 'save' })
      // The die gives away the creature's save bonus; whether the effect ended is
      // logged separately by the update diff, and that part the table does see.
      pushGmRoll(`${c.label}: ${save.effect.name} (${save.ability.toUpperCase()} save)`, result)
      if (result.total >= save.dc) {
        dispatch({
          type: 'update',
          id: c.combatantId,
          update: (cc) => {
            const gone = new Set(saveEndsClears(save.effect, cc.effects))
            return { ...cc, effects: cc.effects.filter((x) => !gone.has(x.id)) }
          },
        })
      }
    }
  }
  /**
   * Roll initiative (1d20+mod, disadvantage when surprised): the total, and the line it
   * belongs in the log. The caller records it, because a roll made while the Roll
   * initiative box is still open belongs under the fight it starts — not above it, and
   * not at all if the Game Master backs out.
   */
  const rollInit = (
    label: string,
    mod: number,
    disadvantage = false,
    sourceId?: string,
  ): { total: number; entry: NewLogEntry } => {
    const dice = `1d20${disadvantage ? 'dis' : ''}${mod >= 0 ? `+${mod}` : `${mod}`}`
    const result = roll(dice)
    return {
      total: result.total,
      entry: {
        category: 'roll',
        message: `${label}: initiative${disadvantage ? ' (surprised)' : ''}`,
        result,
        sourceId,
      },
    }
  }

  // The initiative modifier: a PC's own, 0 for a quick add, and for a monster its
  // listed Initiative bonus (2024 stat blocks carry one that can exceed the Dex
  // mod — e.g. an Adult Brass Dragon is +10 with Dex 10), falling back to Dex.
  const initMod = (c: Combatant): number =>
    isPlayer(c)
      ? c.isPC
        ? (c.initiativeMod ?? 0)
        : 0
      : c.isPC
        ? 0
        : (c.creature.initiative ?? dexMod(c.creature))

  // Add a combatant to the encounter and select it. Mid-combat it rolls initiative
  // straight away (like Begin) so a reinforcement slots into the order instead of
  // sitting at 0; before combat, initiative waits for Begin to roll everyone together.
  const addCombatant = (c: Combatant) => {
    let combatant = c
    if (encounter.round > 0) {
      const { total, entry } = rollInit(nameOf(c), initMod(c), false, c.combatantId)
      combatant = { ...c, initiative: total }
      // A foe arriving mid-fight follows the GM's standing choice: on the table's
      // screen with everyone else, or held back until they reveal it.
      if (playerView.arrivals === 'hidden' && isFoe(combatant)) {
        combatant = { ...combatant, shared: 'hidden' }
      }
      dispatch({ type: 'log', entry })
    }
    dispatch({ type: 'add', combatant, tiebreak: activeRules.initiativeTiebreak })
    setSelectedId(combatant.combatantId)
  }

  // One-round skip effect for the 2014 surprise rule (cleared on the round wrap).
  const surprisedEffect = (): Effect => ({
    id: crypto.randomUUID(),
    name: 'Surprised',
    icon: 'condition',
    modifier: null,
    duration: { type: 'rounds', rounds: 1 },
    skipsTurn: true,
    note: 'Surprised — skips this round',
  })

  // Confirm the Roll Initiative modal: resolve every initiative and apply the
  // campaign's surprise rule to the marked combatants, then start combat.
  const startCombat = (result: { values: Record<string, string>; surprised: string[] }) => {
    const surprised = new Set(result.surprised)
    const rule = activeRules.surprise

    const initiatives: Record<string, number> = {}
    // The line each roll leaves, kept until the fight has a log to put them in.
    const rolled: Record<string, NewLogEntry> = {}
    for (const c of encounter.combatants) {
      const id = c.combatantId
      // Dead creatures never roll — they stay dead at the bottom of the order.
      if (c.status === 'dead') {
        initiatives[id] = 0
        continue
      }
      const raw = (result.values[id] ?? '').trim()
      const isSurprised = surprised.has(id)
      const disadvantage = isSurprised && rule === 'disadvantage'
      // Roll when the field is blank, or to apply 5.5 disadvantage to an unedited
      // app-rolled value; a value the GM typed (or edited) is always respected.
      const unedited = raw !== '' && raw === (initPrompt?.[id] ?? '')
      if (raw === '' || (disadvantage && unedited && !isPlayer(c))) {
        const { total, entry } = rollInit(nameOf(c), initMod(c), disadvantage, id)
        initiatives[id] = total
        rolled[id] = entry
      } else {
        initiatives[id] = Math.floor(Number(raw) || 0)
        // A pre-rolled number the GM left alone keeps its roll; one they typed over has
        // no dice behind it, so the log states the number instead — the only record a
        // player's hand-rolled initiative gets in either view.
        if (unedited && preRolled.current[id]) rolled[id] = preRolled.current[id]
        else
          rolled[id] = {
            category: 'note',
            message: `${nameOf(c)}: initiative ${initiatives[id]}`,
            sourceId: id,
          }
      }
    }

    // 2014 rule: surprised creatures skip round 1 via a one-round skip effect.
    const withSurprise = (c: Combatant): Effect[] =>
      rule === 'skip' && surprised.has(c.combatantId)
        ? [...c.effects, surprisedEffect()]
        : c.effects

    for (const c of encounter.combatants) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (x) => ({
          ...x,
          initiative: initiatives[x.combatantId] ?? x.initiative,
          effects: withSurprise(x),
        }),
      })
    }
    const combatants = encounter.combatants.map((c) => ({
      ...c,
      initiative: initiatives[c.combatantId] ?? c.initiative,
      effects: withSurprise(c),
    }))
    const next = beginEncounter({ ...encounter, combatants }, activeRules.initiativeTiebreak)
    track(EVENTS.combatStarted)
    // In initiative order, so the log reads the way the tracker does.
    const rolls = next.combatants
      .map((c) => rolled[c.combatantId])
      .filter((entry): entry is NewLogEntry => entry != null)
    dispatch({ type: 'begin', tiebreak: activeRules.initiativeTiebreak, rolls })
    preRolled.current = {}
    selectActive(next)
    autoRecharge(next)
    setInitPrompt(null)
  }

  // Begin: pre-roll monsters/quick-adds, then open the Roll Initiative modal so the
  // GM enters players' rolls and (optionally) marks surprised combatants.
  const handleBegin = () => {
    if (encounter.combatants.length === 0) return
    const initial: Record<string, string> = {}
    preRolled.current = {}
    for (const c of encounter.combatants) {
      // Dead creatures stay dead at initiative 0 — never re-rolled into the order.
      if (c.status === 'dead' || isPlayer(c)) {
        initial[c.combatantId] = c.status === 'dead' ? '0' : ''
        continue
      }
      const { total, entry } = rollInit(nameOf(c), initMod(c), false, c.combatantId)
      initial[c.combatantId] = String(total)
      preRolled.current[c.combatantId] = entry
    }
    setInitPrompt(initial)
  }
  /** Advance the turn, select whoever is now active, and auto-roll recharges and save-ends. */
  const handleNextTurn = () => {
    const ending = encounter.combatants[encounter.activeIndex]
    const next = nextTurn(encounter)
    selectActive(next)
    dispatch({ type: 'nextTurn' })
    autoRecharge(next)
    // The ending creature's end-of-turn saves resolve now; the new creature's
    // start-of-turn saves resolve as its turn begins.
    autoRollSaveEnds(ending, 'endOfTurn')
    autoRollSaveEnds(next.combatants[next.activeIndex], 'startOfTurn')
  }

  // End combat: snapshot the recap from the live state (before stop zeroes the round),
  // then reset to setup. Used by the Stop button, the all-enemies prompt, and a TPK.
  const endCombat = () => {
    track(EVENTS.combatStopped)
    setRecap(buildRecap(encounter, Date.now()))
    setEndPrompt(false)
    dispatch({ type: 'stop' })
  }

  // Detect combat's end. All PCs down → end automatically (defeat). All foes down →
  // prompt once to end (the GM may keep the fight running). Re-arm when foes recover.
  useEffect(() => {
    if (encounter.round === 0) {
      foesPromptedRef.current = false
      setEndPrompt(false)
      return
    }
    if (allPlayersDown(encounter.combatants)) {
      endCombat()
      return
    }
    if (allFoesDefeated(encounter.combatants)) {
      if (!foesPromptedRef.current) {
        foesPromptedRef.current = true
        setEndPrompt(true)
      }
    } else if (foesPromptedRef.current) {
      foesPromptedRef.current = false
      setEndPrompt(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter])

  const started = encounter.round > 0
  const paused = encounter.paused === true
  // Cast spell opens on whoever the GM is looking at — the selected combatant, or the
  // one whose turn it is — so the common case needs no pick at all.
  const defaultCasterId =
    selectedId ?? (started ? encounter.combatants[encounter.activeIndex]?.combatantId : undefined)

  return (
    <CampaignRulesContext.Provider value={activeRules}>
      <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center gap-4 lg:gap-0">
            {/* Logo links back to the marketing site; spans the initiative column so
              Group/Cast line up with the stat block. */}
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
            {view === 'encounter' && encounter.combatants.length > 0 && (
              <div className="flex items-center gap-2 lg:pl-4">
                <RestControls
                  combatants={encounter.combatants}
                  dispatch={dispatch}
                  disabled={started}
                  shortRests={encounter.shortRests ?? 0}
                  showCounter={!!user}
                />
                <MassSavePanel
                  combatants={encounter.combatants}
                  dispatch={dispatch}
                  onRoll={pushRoll}
                />
                <CastSpellPanel
                  combatants={encounter.combatants}
                  dispatch={dispatch}
                  onRoll={pushRoll}
                  onNote={pushNote}
                  round={encounter.round}
                  defaultCasterId={defaultCasterId}
                  customSpells={customSpells}
                  enabledLibraries={enabledLibraries}
                  showHomebrew={showHomebrew}
                  librarySort={librarySort}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {view === 'encounter' && (
              <div className="flex items-center gap-2">
                <AddQuickForm
                  onAdd={(c) => {
                    track(EVENTS.quickAdded)
                    addCombatant(c)
                  }}
                />
                {user ? (
                  <AddPcPicker
                    rosterPcs={rosterPcs}
                    campaigns={campaigns}
                    onPick={handleAddPcToEncounter}
                    onCreate={openRosterCreate}
                  />
                ) : (
                  <AddPcForm
                    onAdd={(c) => {
                      track(EVENTS.pcAdded)
                      addCombatant(c)
                    }}
                  />
                )}
                <AddCreaturePicker
                  onPick={handlePick}
                  customCreatures={customCreatures}
                  enabledLibraries={enabledLibraries}
                  showHomebrew={showHomebrew}
                  librarySort={librarySort}
                />
              </div>
            )}
            <ViewToggle view={view} onChange={handleViewChange} />
            <AccountControl onSignIn={() => setAuthOpen(true)} />
            <SharePanel
              code={playerCode}
              sharing={sharing}
              onToggleShare={toggleSharing}
              onClaim={user ? claimShareCode : undefined}
              onSignIn={() => setAuthOpen(true)}
            />
            <SettingsMenu
              theme={theme}
              onToggleTheme={() => {
                track(EVENTS.themeToggled)
                toggleTheme()
              }}
              onOpenSettings={() => {
                track(EVENTS.settingsOpened)
                setSettingsOpen(true)
              }}
            />
          </div>
        </header>

        {settingsOpen && (
          <SettingsPanel
            onClose={() => setSettingsOpen(false)}
            enabledLibraries={enabledLibraries}
            onSetEnabledLibraries={setEnabledLibraries}
            showHomebrew={showHomebrew}
            onSetShowHomebrew={setShowHomebrew}
            librarySort={librarySort}
            onSetLibrarySort={setLibrarySort}
            playerView={playerView}
            onSetPlayerView={setPlayerView}
          />
        )}

        <main className="min-h-0 flex-1 overflow-hidden">
          {view === 'compendium' ? (
            <div className="h-full w-full overflow-hidden px-6 py-6">
              <Compendium
                customCreatures={customCreatures}
                onCreateCreature={handleCreateCreature}
                onUpdateCreature={handleUpdateCreature}
                onDeleteCreature={handleDeleteCreature}
                customSpells={customSpells}
                onCreateSpell={handleCreateSpell}
                onUpdateSpell={handleUpdateSpell}
                onDeleteSpell={handleDeleteSpell}
                campaigns={campaigns}
                onCreateCampaign={handleCreateCampaign}
                onUpdateCampaign={handleUpdateCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                rosterPcs={rosterPcs}
                onCreatePc={handleCreatePc}
                onUpdatePc={handleUpdatePc}
                onDeletePc={handleDeletePc}
                onAddPcToEncounter={handleAddPcToEncounter}
                presets={presets}
                onRenamePreset={handleUpdatePreset}
                onDeletePreset={handleDeletePreset}
                initialTab={compendiumTab}
                enabledLibraries={enabledLibraries}
                showHomebrew={showHomebrew}
                librarySort={librarySort}
                createGated={!user}
                onGated={() => setAuthOpen(true)}
              />
            </div>
          ) : (
            <EncounterConsole
              encounter={encounter}
              dispatch={dispatch}
              onRoll={pushRoll}
              onGmRoll={pushGmRoll}
              onNote={pushNote}
              onRename={renameInLog}
              onEditPc={handleEditEncounterPc}
              onEditPcDmNotes={handleEditEncounterPcDmNotes}
              onEditCreature={handleEditEncounterCreature}
              selectedId={selectedId}
              onSelect={setSelectedId}
              started={started}
              paused={paused}
              onBegin={handleBegin}
              onNextTurn={handleNextTurn}
              onStop={endCombat}
              onOpenLog={() => setLogOpen(true)}
              presets={presets}
              enabledLibraries={enabledLibraries}
              onSavePreset={userId ? handleCreatePreset : undefined}
            />
          )}
        </main>

        {logOpen && (
          <GameLogModal
            entries={encounter.log}
            onClose={() => setLogOpen(false)}
            onClear={() => dispatch({ type: 'clearLog' })}
          />
        )}

        {authOpen && <SignUpPage onClose={() => setAuthOpen(false)} />}

        {endPrompt && (
          <EndCombatPrompt onConfirm={endCombat} onCancel={() => setEndPrompt(false)} />
        )}
        {recap && <RecapScreen recap={recap} onClose={() => setRecap(null)} />}

        {/* Editing a roster-backed PC from the encounter: save to the DB and re-sync the
          on-board copy's character fields (HP and combat state stay put). */}
        <PcFormModal
          open={encounterPcEdit != null}
          pc={encounterPcEdit?.pc}
          campaigns={campaigns}
          onClose={() => setEncounterPcEdit(null)}
          onSubmit={(updated) => {
            handleUpdatePc(updated)
            if (encounterPcEdit) {
              dispatch({
                type: 'update',
                id: encounterPcEdit.combatantId,
                update: (x) => (x.isPC ? syncCombatantFromRoster(x, updated) : x),
              })
            }
          }}
        />

        {/* Editing a custom creature from the encounter: saves to the library/DB only;
          the in-progress fight keeps its snapshot (AGENTS.md rule #4). */}
        <CustomMonsterForm
          open={encounterCreatureEdit != null}
          initialDraft={encounterCreatureEdit?.draft ?? emptyDraft()}
          editId={encounterCreatureEdit?.editId ?? null}
          onClose={() => setEncounterCreatureEdit(null)}
          onSubmit={handleUpdateCreature}
        />

        {initPrompt && (
          <InitiativePrompt
            combatants={encounter.combatants}
            initial={initPrompt}
            onStart={startCombat}
            onCancel={() => setInitPrompt(null)}
          />
        )}
        <footer className="grid grid-cols-1 items-center gap-2 border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 lg:grid-cols-[28rem_1fr_24rem] lg:gap-0">
          {view === 'encounter' && started && encounter.combatStats ? (
            <CombatTimers
              stats={encounter.combatStats}
              round={encounter.round}
              running={started && !paused}
            />
          ) : view === 'encounter' ? (
            <CombatDifficulty combatants={encounter.combatants} />
          ) : (
            <div className="hidden lg:block" aria-hidden="true" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:pl-4">
            {view === 'encounter' && <QuickRoll onRoll={pushRoll} />}
            {view === 'encounter' && user && (
              <CampaignPicker
                campaigns={campaigns}
                activeId={activeCampaignId}
                onChange={setActiveCampaignId}
              />
            )}
          </div>
          <div className="flex items-center gap-2 lg:justify-end lg:pl-4">
            <a href="/privacy">Privacy</a>
            <span>·</span>
            <a href="/terms">Terms</a>
            <span>·</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="OpenFray on GitHub"
              title="GitHub"
              className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-200"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
            &nbsp;
            <span>
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">
                AGPL-3.0
              </a>
            </span>
          </div>
        </footer>
      </div>
    </CampaignRulesContext.Provider>
  )
}

export default App
