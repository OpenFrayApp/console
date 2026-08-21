// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ContentLicense } from './schema/license.ts'
import type { Creature } from './schema/creature.ts'
import type { Spell } from './schema/spell.ts'
import type { Combatant, MonsterCombatant, PlayerCharacter } from './schema/combatant.ts'
import type { Effect } from './schema/effect.ts'
import {
  autoLabel,
  instantiate,
  isFoe,
  nameOf,
  resolveSelected,
  trackerOrder,
} from './combat/combatant.ts'
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
import { CampaignEditionContext, CampaignRulesContext } from './state/campaignRules.ts'
import { emptyEncounter, encounterReducer, type NewLogEntry } from './state/encounter.ts'
import { loadSession, saveSession, type View } from './state/persistence.ts'
import { useTheme } from './hooks/useTheme.ts'
import { useHotkeys } from './hooks/useHotkeys.ts'
import { formatChord, resolveHotkeys, type HotkeyCommandId } from './state/hotkeys.ts'
import { KeyboardHelp } from './components/settings/KeyboardHelp.tsx'
import { onSharedBoard } from './combat/playerView.ts'
import {
  claimPlayerCode,
  deleteSavedFight,
  listSavedFights,
  loadCloudEncounter,
  loadSavedFight,
  renameSavedFight,
  saveCloudEncounter,
  saveFight,
  type ClaimResult,
  type SavedFights,
  type WriteResult,
} from './state/cloudEncounter.ts'
import {
  templateEntries,
  restrictedCreatures,
  templateFromBoard,
  withoutRestricted,
  templateToCombatants,
} from './combat/encounterTemplate.ts'
import { creatureTemplate } from './combat/creatureTemplate.ts'
import {
  listMyShares,
  mayUseReservedByline,
  publishShare,
  unpublish,
  type MyShares,
  type PublishResult,
} from './state/shares.ts'
import type { EncounterTemplate } from './schema/encounterTemplate.ts'
import { loadSrdCreatures } from './compendium/srd.ts'
import { SaveFightButton, ShareEncounterButton } from './components/shell/EncounterActions.tsx'
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
import { Compendium, type Tab as CompendiumTab } from './components/library/Compendium.tsx'
import { EncounterConsole } from './components/tracker/EncounterConsole.tsx'
import { RecapScreen, EndCombatPrompt } from './components/tracker/Recap.tsx'
import { allFoesDefeated, allPlayersDown, buildRecap, type Recap } from './combat/recap.ts'
import { AddCreaturePicker } from './components/add/AddCreaturePicker.tsx'
import { AddMenu } from './components/add/AddMenu.tsx'
import {
  loadSettings,
  saveSettings,
  type LibrarySort,
  type PlayerViewSettings,
} from './state/settings.ts'
import { useBoardBroadcast } from './state/playerChannel.ts'
import { randomPlayerCode } from './state/playerCode.ts'
import { AddPcForm } from './components/add/AddPcForm.tsx'
import { AddPcPicker } from './components/add/AddPcPicker.tsx'
import { PcFormModal } from './components/editors/PcFormModal.tsx'
import { CustomMonsterForm } from './components/editors/CustomMonsterForm.tsx'
import { ShareCreatureDialog } from './components/share/ShareCreatureDialog.tsx'
import {
  creatureToDraft,
  emptyDraft,
  type MonsterDraft,
} from './components/editors/customMonster.ts'
import { AddQuickForm } from './components/add/AddQuickForm.tsx'
import { CastSpellPanel } from './components/resolve/CastSpellPanel.tsx'
import { InitiativePrompt } from './components/tracker/InitiativePrompt.tsx'
import { MassSavePanel } from './components/resolve/MassSavePanel.tsx'
import { RestControls } from './components/tracker/RestControls.tsx'
import { QuickRoll } from './components/resolve/QuickRoll.tsx'
import { CampaignPicker } from './components/shell/CampaignPicker.tsx'
import { AccountControl } from './components/account/AccountControl.tsx'
import { SharedLinksPage } from './components/share/SharedLinksPage.tsx'
import { CombatTimers } from './components/tracker/CombatTimers.tsx'
import { CombatDifficulty } from './components/tracker/CombatDifficulty.tsx'
import { assessEncounter } from './combat/difficulty.ts'
import { SettingsPanel } from './components/settings/SettingsPanel.tsx'
import { SettingsMenu } from './components/settings/SettingsMenu.tsx'
import { MobileNav, type MobileTab } from './components/shell/MobileNav.tsx'
import { Wordmark } from './components/shell/Wordmark.tsx'
import { LegalLinks } from './components/shell/LegalLinks.tsx'
import { SharePanel } from './components/share/SharePanel.tsx'
import { SignUpPage } from './components/account/SignUpPage.tsx'
import { GameLogModal, type OnGmRoll, type OnNote, type OnRoll } from './components/log/GameLog.tsx'
import { track, EVENTS } from './lib/analytics.ts'

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
  /** Class list for one toggle segment, filled when active. The nav owns the height
   *  (its border counts toward it, border-box); the cells just fill it. */
  const cell = (active: boolean) =>
    `flex h-full items-center justify-center px-3 ${
      active
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`
  return (
    <nav
      // h-9 (and 44px on touch) so the pair stands exactly as tall as the icon
      // buttons beside it — they size their boxes the same way.
      className="flex h-9 overflow-hidden rounded-md border border-slate-300 coarse:h-11 dark:border-slate-700"
      aria-label="View"
    >
      <button
        type="button"
        onClick={() => onChange('encounter')}
        aria-current={view === 'encounter' ? 'page' : undefined}
        aria-label="Show the encounter"
        title="Show the encounter"
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
function App({ stagedCast }: { stagedCast?: EncounterTemplate } = {}) {
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
  // Keyboard chord overrides, device-local like the theme. The resolved keymap
  // drives the document listener, the cheat sheet, and every key hint.
  const [hotkeys, setHotkeysState] = useState<Partial<Record<HotkeyCommandId, string | null>>>(
    () => loadSettings().hotkeys,
  )
  /** Set the chord overrides and persist the choice to device-local settings. */
  const setHotkeys = (value: Partial<Record<HotkeyCommandId, string | null>>) => {
    setHotkeysState(value)
    saveSettings({ hotkeys: value })
  }
  const keymap = useMemo(() => resolveHotkeys(hotkeys), [hotkeys])
  const [helpOpen, setHelpOpen] = useState(false)
  // Bump counters that open an already-mounted control from the keyboard; each
  // consumer latches the value it mounted with, so only a later bump acts.
  const [groupSaveRequest, setGroupSaveRequest] = useState(0)
  const [castSpellRequest, setCastSpellRequest] = useState(0)
  const [effectRequest, setEffectRequest] = useState(0)
  const [hpEditRequest, setHpEditRequest] = useState(0)
  const [quickAddRequest, setQuickAddRequest] = useState(0)
  const [addPcRequest, setAddPcRequest] = useState(0)
  const [addCreatureRequest, setAddCreatureRequest] = useState(0)
  const [shortRestRequest, setShortRestRequest] = useState(0)
  const [longRestRequest, setLongRestRequest] = useState(0)
  const [concentrateRequest, setConcentrateRequest] = useState(0)
  const [diceFocusRequest, setDiceFocusRequest] = useState(0)
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
  // Which of the console's three screens is up on a phone (0 tracker, 1 stat block,
  // 2 controls). Meaningless from lg up, where all three are columns.
  const [mobilePane, setMobilePane] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(() => restored?.selectedId ?? null)
  const [initPrompt, setInitPrompt] = useState<Record<string, string> | null>(null)
  // The initiative the app pre-rolled into that box, held until the fight it starts has
  // somewhere to record it — and dropped if the Game Master backs out of Begin.
  const preRolled = useRef<Record<string, NewLogEntry>>({})

  const { user, displayName, shareLicense, setDisplayName, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const cloudId = useRef<string | null>(null)
  const cloudHydrated = useRef(false)
  const cloudInserting = useRef(false)
  const [authOpen, setAuthOpen] = useState(false)
  /**
   * Whether the board is the one this Game Master should be looking at: for a signed-in user
   * that means the cloud copy has landed, for an anonymous one it is true as soon as auth
   * settles. A cast arriving from a shared link waits on this — adding into a board that is
   * about to be replaced by the cloud load would lose it, and racing the debounced autosave
   * would persist half a board.
   */
  const [boardReady, setBoardReady] = useState(false)
  const [customCreatures, setCustomCreatures] = useState<Creature[]>([])
  const [customSpells, setCustomSpells] = useState<Spell[]>([])
  const [ownPresets, setOwnPresets] = useState<EffectPreset[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [rosterPcs, setRosterPcs] = useState<RosterPc[]>([])
  // The fights this Game Master has saved to come back to. Held here rather than in the menu
  // because the compendium's Encounters tab reads the same list, and two loaders would drift
  // apart the moment one of them saved something.
  const [savedFights, setSavedFights] = useState<SavedFights>({ status: 'ok', fights: [] })
  // The links this Game Master has published, and the byline they publish under — the
  // byline is device-local like the theme, never read from the account.
  const [myShares, setMyShares] = useState<MyShares>({ status: 'ok', shares: [] })
  const [shareByline, setShareByline] = useState(() => loadSettings().shareByline ?? '')
  // Whether this account may publish under one of the reserved names. The answer comes from
  // the database — a granted capability — so nothing here has to know whose name it is.
  const [bylineGranted, setBylineGranted] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(
    () => restored?.activeCampaignId ?? null,
  )
  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId)
    : undefined
  const activeRules = activeCampaign?.rules ?? DEFAULT_CAMPAIGN_RULES
  // No campaign means the 2024 rules, the console's default everywhere else too.
  const activeEdition = activeCampaign?.edition ?? '5.5'
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
      setSavedFights({ status: 'ok', fights: [] })
      setMyShares({ status: 'ok', shares: [] })
      setBylineGranted(false)
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
    listSavedFights().then((res) => {
      if (active) setSavedFights(res)
    })
    listMyShares().then((res) => {
      if (active) setMyShares(res)
    })
    mayUseReservedByline().then((granted) => {
      if (active) setBylineGranted(granted)
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
      // Nothing to wait for: an anonymous board is whatever sessionStorage restored, and
      // that happened before the first render.
      setBoardReady(true)
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
      setBoardReady(true)
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
    setMobilePane(0)
  }

  // Header "Add PC → create": send a signed-in user to the compendium's Characters tab.
  const openRosterCreate = () => {
    setCompendiumTab('characters')
    setView('compendium')
  }

  // Saved encounters. The list is re-read rather than patched in memory: the row's
  // `updated_at` is what orders it, and the database is the only thing that knows it.
  const refreshSavedFights = () => {
    if (!userId) return
    void listSavedFights().then(setSavedFights)
  }

  /** Save the board as it stands, under whichever campaign is active. */
  const handleSaveFight = async (name: string): Promise<WriteResult> => {
    const result = await saveFight(name, encounter, activeCampaignId)
    if (result === 'ok') {
      track(EVENTS.encounterSaved)
      refreshSavedFights()
    }
    return result
  }

  /**
   * Put a saved fight back on the board, whole. The autosave then carries it into the live
   * row, so the restored board *is* the session from here on — which is the point, and also
   * why the menu confirms before calling this.
   */
  const handleRestoreFight = async (id: string): Promise<boolean> => {
    const saved = await loadSavedFight(id)
    if (!saved) return false
    dispatch({ type: 'load', encounter: saved })
    setSelectedId(null)
    // The campaign travels with it, so a fight comes back under the house rules it was
    // fought under rather than whichever campaign happens to be active tonight.
    const summary =
      savedFights.status === 'ok' ? savedFights.fights.find((f) => f.id === id) : undefined
    if (summary?.campaignId && campaigns.some((c) => c.id === summary.campaignId)) {
      setActiveCampaignId(summary.campaignId)
    }
    setView('encounter')
    setMobilePane(0)
    track(EVENTS.encounterRestored)
    return true
  }

  /**
   * Add just the cast of a saved fight to the board in hand — the same ambush, fresh, against
   * tonight's party. Hit points roll again under the campaign's method and nothing of the old
   * fight comes with them, so this is the reusable half of a save.
   */
  const handleAddCast = async (
    id: string,
  ): Promise<{ added: number; missing: string[] } | null> => {
    const saved = await loadSavedFight(id)
    if (!saved) return null
    const library = await loadSrdCreatures()
    const { combatants, missing } = templateToCombatants(
      { v: 1, name: '', entries: templateEntries(saved.combatants) },
      {
        creatures: [...library, ...customCreatures],
        hpMethod: activeRules.hp,
        existing: encounter.combatants,
      },
    )
    for (const c of combatants) addCombatant(c)
    if (combatants.length) {
      track(EVENTS.encounterCastAdded)
      setView('encounter')
      setMobilePane(0)
    }
    return { added: combatants.length, missing }
  }

  /** Re-read the published links; opening the panel is the cheapest moment to ask. */
  const refreshShares = () => {
    if (!userId) return
    void listMyShares().then(setMyShares)
  }

  /**
   * Publish the board's cast under a link. The name, note and byline come from the form; the
   * cast comes from `templateFromBoard`, which is what leaves the party and the live state
   * behind. The byline is remembered device-locally so a series is typed once — never read
   * from the account, because publishing a name is a choice rather than a consequence of
   * having signed in.
   */
  /**
   * What the board holds that says it may not be passed on, worked out before the share
   * dialog opens rather than after a link exists. Only creatures carried whole can be
   * asked; a library creature travels as a reference and is never redistributed here.
   */
  const restricted = useMemo(() => {
    const built = templateFromBoard(encounter.combatants, '')
    const names = restrictedCreatures(built)
    return { names, someRemain: withoutRestricted(built).entries.length > 0 }
  }, [encounter.combatants])

  /**
   * Publish one creature. The template decides how it travels — a library creature as a
   * reference, homebrew whole — so nothing here reasons about licenses: the creature
   * carries its own, stated in the editor where the creature is.
   */
  /** Whether the shared-links screen has the body. Transient: an account screen, not a view. */
  const [showShares, setShowShares] = useState(false)

  /** The creature whose share dialog is open, asked for by the board or the compendium. */
  const [sharingCreature, setSharingCreature] = useState<Creature | null>(null)

  const handleShareCreature = async (
    creature: Creature,
    draft: { note: string; by: string },
  ): Promise<PublishResult> => {
    const result = await publishShare('creature', creatureTemplate(creature, draft))
    if (result.status === 'ok') {
      track(EVENTS.creatureShared)
      setShareByline(draft.by)
      saveSettings({ shareByline: draft.by || null })
      refreshShares()
    }
    return result
  }

  const handleShareEncounter = async (draft: {
    name: string
    note: string
    by: string
    license: ContentLicense
  }): Promise<PublishResult> => {
    // Always without them. A creature marked all rights reserved is not ours to put on a
    // public URL, and an encounter is no different from sharing the stat block alone.
    const template: EncounterTemplate = {
      ...withoutRestricted(templateFromBoard(encounter.combatants, draft.name)),
      ...(draft.note ? { note: draft.note } : {}),
      ...(draft.by ? { by: draft.by } : {}),
      // Unstated is the absent state, so it writes no field: a published template records
      // that somebody chose a license, never that they declined to.
      ...(draft.license !== 'unstated' ? { license: draft.license } : {}),
    }
    const result = await publishShare('encounter', template)
    if (result.status === 'ok') {
      track(EVENTS.encounterShared)
      // Remembered where it belongs: on the account for a signed-in Game Master, so it
      // follows them to the next device, and device-locally for an anonymous one, who has
      // nowhere else to keep it. Publishing under a different name changes the default —
      // the profile is where it gets corrected.
      setShareByline(draft.by)
      saveSettings({ shareByline: draft.by || null })
      if (user && draft.by !== (displayName ?? '')) void setDisplayName(draft.by)
      refreshShares()
    }
    return result
  }

  /** Take a published link down, dropping it from the list at once. */
  const handleUnpublish = (code: string) => {
    setMyShares((prev) =>
      prev.status === 'ok'
        ? { status: 'ok', shares: prev.shares.filter((s) => s.code !== code) }
        : prev,
    )
    void unpublish(code)
  }

  /** Rename a saved fight, showing the new name at once. */
  const handleRenameFight = (id: string, name: string) => {
    setSavedFights((prev) =>
      prev.status === 'ok'
        ? { status: 'ok', fights: prev.fights.map((f) => (f.id === id ? { ...f, name } : f)) }
        : prev,
    )
    void renameSavedFight(id, name)
  }

  /** Delete a saved fight, dropping it from the list at once. */
  const handleDeleteFight = (id: string) => {
    setSavedFights((prev) =>
      prev.status === 'ok'
        ? { status: 'ok', fights: prev.fights.filter((f) => f.id !== id) }
        : prev,
    )
    void deleteSavedFight(id)
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

  /**
   * Keep a creature that arrived from a shared link.
   *
   * Saved under the id the board already uses, so the combatant on screen and the library
   * entry are the same creature and the control becomes Edit from here on.
   *
   * `source` becomes Homebrew rather than the `custom` that renders as "Custom (you)":
   * somebody else wrote this, and a copy landing in a library does not make it the reader's
   * work. What it says about reuse is carried untouched — that was its author's to state,
   * not this reader's to restate.
   */
  const handleSaveEncounterCreature = (c: MonsterCombatant) => {
    if (customCreatures.some((cr) => cr.id === c.creatureId)) return
    handleCreateCreature({ ...c.creature, id: c.creatureId, source: 'Homebrew' })
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
    // `dis` keeps one die out of the several rolled, so it needs a count of two to have
    // anything to choose between — `1d20dis` is a die deciding against itself.
    const d20 = disadvantage ? '2d20dis' : '1d20'
    const dice = `${d20}${mod >= 0 ? `+${mod}` : `${mod}`}`
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

  /**
   * A cast handed over from a shared link, added once — and only once the board is the one
   * it should be added to.
   *
   * The wait is the whole point. A signed-in Game Master's live fight arrives from the cloud
   * a moment after this screen mounts; adding before it lands would either be overwritten by
   * that load or race the debounced autosave into saving a half-built board. The ref makes
   * it a one-way door: the cast goes in on the first ready render and never again, whatever
   * re-renders follow.
   */
  const pendingCast = useRef(stagedCast)
  useEffect(() => {
    if (!boardReady || !pendingCast.current) return
    const template = pendingCast.current
    pendingCast.current = undefined
    void loadSrdCreatures().then((library) => {
      const { combatants } = templateToCombatants(template, {
        creatures: [...library, ...customCreatures],
        hpMethod: activeRules.hp,
        existing: encounter.combatants,
      })
      for (const c of combatants) addCombatant(c)
      track(EVENTS.encounterLinkAdded)
    })
    // Deliberately keyed on readiness alone: the cast is consumed the first time through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardReady])

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

  // The bottom bar's active tab, and what tapping one does. The compendium is a view
  // of its own; the other three are the console's phone screens.
  const mobileTab: MobileTab =
    view === 'compendium'
      ? 'compendium'
      : ((['tracker', 'stat-block', 'controls'] as const)[mobilePane] ?? 'tracker')
  /** Show the tapped tab: switch view when needed, then slide to the screen. */
  const showMobileTab = (tab: MobileTab) => {
    if (tab === 'compendium') {
      handleViewChange('compendium')
      return
    }
    setView('encounter')
    setMobilePane({ tracker: 0, 'stat-block': 1, controls: 2 }[tab])
  }

  // The phone's popover sheets hang under the header (see popoverClass), which is two
  // or three rows there and changes height as its clusters wrap. Publishing what it
  // measures keeps a sheet from opening over the button that asked for it.
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const started = encounter.round > 0
  const paused = encounter.paused === true
  // What the compact footer would actually draw: the fight's clock, the difficulty
  // estimate, or the campaign picker. None of the three, and the bar is just a border.
  const compactFooterHasContent =
    view === 'encounter' &&
    ((started && encounter.combatStats != null) ||
      assessEncounter(encounter.combatants) != null ||
      campaigns.length > 0)
  // Cast spell opens on whoever the GM is looking at — the selected combatant, or the
  // one whose turn it is — so the common case needs no pick at all.
  const defaultCasterId =
    selectedId ?? (started ? encounter.combatants[encounter.activeIndex]?.combatantId : undefined)

  // The combatant the console shows, which is what every selected-creature
  // command acts on — the same resolution EncounterConsole renders.
  const selectedCombatant = resolveSelected(
    encounter.combatants,
    selectedId,
    started && !paused ? encounter.combatants[encounter.activeIndex]?.combatantId : undefined,
  )

  /** Move the tracker selection by one row, wrapping, in the order the GM sees. */
  const selectRelative = (delta: 1 | -1) => {
    const ordered = trackerOrder(encounter.combatants, started)
    if (ordered.length === 0 || !selectedCombatant) return
    const i = ordered.findIndex((c) => c.combatantId === selectedCombatant.combatantId)
    const next = ordered[(i + delta + ordered.length) % ordered.length]
    setSelectedId(next.combatantId)
  }

  // What each keyboard command does. Preconditions no-op silently; the turn and
  // fight commands go through the same closures the buttons use, so recharges and
  // save-ends automation ride along. The pane switches make the acted-on panel
  // visible on the swipe shell and are inert everywhere else.
  const hotkeyHandlers: Partial<Record<HotkeyCommandId, () => void>> = {
    nextTurn: () => {
      if (started) handleNextTurn()
    },
    prevTurn: () => {
      if (started) dispatch({ type: 'prevTurn' })
    },
    startCombat: () => {
      if (!started && view === 'encounter') handleBegin()
    },
    endFight: () => {
      if (started) endCombat()
    },
    pauseResume: () => {
      if (started) dispatch({ type: paused ? 'resume' : 'pause' })
    },
    selectNext: () => selectRelative(1),
    selectPrev: () => selectRelative(-1),
    damageSelected: () => {
      if (view !== 'encounter' || !selectedCombatant) return
      setMobilePane(1)
      setHpEditRequest((n) => n + 1)
    },
    applyEffect: () => {
      if (view !== 'encounter' || !selectedCombatant) return
      setMobilePane(2)
      setEffectRequest((n) => n + 1)
    },
    concentrate: () => {
      if (view !== 'encounter' || !selectedCombatant) return
      setMobilePane(2)
      setConcentrateRequest((n) => n + 1)
    },
    toggleReaction: () => {
      if (!selectedCombatant) return
      dispatch({
        type: 'update',
        id: selectedCombatant.combatantId,
        update: (c) => ({ ...c, reactionUsed: !c.reactionUsed }),
      })
    },
    toggleHidden: () => {
      if (!selectedCombatant) return
      dispatch({
        type: 'update',
        id: selectedCombatant.combatantId,
        update: (c) => ({ ...c, shared: onSharedBoard(c, started) ? 'hidden' : 'shown' }),
      })
    },
    toggleAlly: () => {
      if (!selectedCombatant) return
      dispatch({
        type: 'update',
        id: selectedCombatant.combatantId,
        update: (c) => ({ ...c, side: isFoe(c) ? 'friend' : 'foe' }),
      })
    },
    removeSelected: () => {
      if (selectedCombatant) dispatch({ type: 'remove', id: selectedCombatant.combatantId })
    },
    addCreature: () => {
      if (view === 'encounter') setAddCreatureRequest((n) => n + 1)
    },
    addPc: () => {
      if (view === 'encounter') setAddPcRequest((n) => n + 1)
    },
    quickAdd: () => {
      if (view === 'encounter') setQuickAddRequest((n) => n + 1)
    },
    castSpell: () => {
      if (view === 'encounter' && encounter.combatants.length > 0) setCastSpellRequest((n) => n + 1)
    },
    groupSave: () => {
      if (view === 'encounter' && encounter.combatants.length > 0) setGroupSaveRequest((n) => n + 1)
    },
    shortRest: () => {
      if (view === 'encounter' && !started) setShortRestRequest((n) => n + 1)
    },
    longRest: () => {
      if (view === 'encounter' && !started) setLongRestRequest((n) => n + 1)
    },
    openLog: () => {
      if (view === 'encounter') setLogOpen(true)
    },
    toggleCompendium: () => handleViewChange(view === 'compendium' ? 'encounter' : 'compendium'),
    focusDice: () => {
      if (view !== 'encounter') return
      setMobilePane(2)
      setDiceFocusRequest((n) => n + 1)
    },
    openSettings: () => {
      track(EVENTS.settingsOpened)
      setSettingsOpen(true)
    },
    showHotkeys: () => setHelpOpen(true),
  }
  useHotkeys(keymap, hotkeyHandlers)

  /** The chord a command answers to, for its control's tooltip; undefined when unbound. */
  const hint = (id: HotkeyCommandId): string | undefined => {
    const chord = keymap[id]
    return chord ? formatChord(chord) : undefined
  }

  // The header's two button clusters, built once and rendered twice: in the desktop
  // header's own spots, and again in the phone header's single swipeable rail (only
  // one of the two is ever displayed, so the copies never fight over a popover).
  const fightControls = view === 'encounter' && encounter.combatants.length > 0 && (
    <>
      <RestControls
        combatants={encounter.combatants}
        dispatch={dispatch}
        disabled={started}
        shortRestRequest={shortRestRequest}
        longRestRequest={longRestRequest}
        shortHint={hint('shortRest')}
        longHint={hint('longRest')}
        shortRests={encounter.shortRests ?? 0}
        showCounter={!!user}
      />
      <MassSavePanel
        combatants={encounter.combatants}
        dispatch={dispatch}
        onRoll={pushRoll}
        openRequest={groupSaveRequest}
        keyHint={hint('groupSave')}
      />
      <CastSpellPanel
        combatants={encounter.combatants}
        dispatch={dispatch}
        onRoll={pushRoll}
        onNote={pushNote}
        round={encounter.round}
        defaultCasterId={defaultCasterId}
        openRequest={castSpellRequest}
        keyHint={hint('castSpell')}
        customSpells={customSpells}
        enabledLibraries={enabledLibraries}
        showHomebrew={showHomebrew}
        librarySort={librarySort}
      />
    </>
  )
  // Each add control, buildable already open. A roomy header shows all three; a phone
  // shows one Add button that opens whichever the GM picks, because side by side the
  // three wrap onto a line of their own and eat a third of a narrow screen.
  /** Options for building an add control: the Add menu opens one already open, with
   *  its own trigger hidden, because the menu keeps the header button. */
  type AddOpts = { autoOpen?: boolean; hideTrigger?: boolean; onClosed?: () => void }
  const addQuick = (o: AddOpts = {}) => (
    <AddQuickForm
      {...o}
      openRequest={quickAddRequest}
      keyHint={hint('quickAdd')}
      onAdd={(c) => {
        track(EVENTS.quickAdded)
        addCombatant(c)
      }}
    />
  )
  const addPc = (o: AddOpts = {}) =>
    user ? (
      <AddPcPicker
        {...o}
        openRequest={addPcRequest}
        keyHint={hint('addPc')}
        rosterPcs={rosterPcs}
        campaigns={campaigns}
        onPick={handleAddPcToEncounter}
        onCreate={openRosterCreate}
      />
    ) : (
      <AddPcForm
        {...o}
        openRequest={addPcRequest}
        keyHint={hint('addPc')}
        onAdd={(c) => {
          track(EVENTS.pcAdded)
          addCombatant(c)
        }}
      />
    )
  const addCreature = (o: AddOpts = {}) => (
    <AddCreaturePicker
      {...o}
      openRequest={addCreatureRequest}
      keyHint={hint('addCreature')}
      onPick={handlePick}
      customCreatures={customCreatures}
      enabledLibraries={enabledLibraries}
      showHomebrew={showHomebrew}
      librarySort={librarySort}
    />
  )
  const addControls = view === 'encounter' && (
    <>
      <div className="w-full roomy:hidden">
        <AddMenu
          items={[
            {
              key: 'quick',
              label: 'Quick add',
              render: (done) => addQuick({ autoOpen: true, hideTrigger: true, onClosed: done }),
            },
            {
              key: 'pc',
              label: 'Add PC',
              render: (done) => addPc({ autoOpen: true, hideTrigger: true, onClosed: done }),
            },
            {
              key: 'creature',
              label: 'Add creature',
              render: (done) => addCreature({ autoOpen: true, hideTrigger: true, onClosed: done }),
            },
          ]}
        />
      </div>
      <div className="hidden roomy:contents">
        {addQuick()}
        {addPc()}
        {addCreature()}
      </div>
    </>
  )

  return (
    <CampaignRulesContext.Provider value={activeRules}>
      <CampaignEditionContext.Provider value={activeEdition}>
        <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {/* The header wraps at every width and its buttons never break their labels:
          a cluster that no longer fits drops to its own line whole, so every button
          keeps one size instead of squeezing onto two lines of text. */}
          {/* gap-y and py open up on a compact screen: the clusters wrap onto two or three
          rows there, and at desktop spacing those rows read as one crowded block. */}
          <header
            ref={headerRef}
            className="flex flex-wrap items-center gap-y-2 border-b border-slate-200 px-4 py-2.5 narrow:gap-y-3 narrow:py-3.5 dark:border-slate-800 lg:px-6 lg:py-4"
          >
            {/* Logo links back to the marketing site; spans the initiative column so
            Group/Cast line up with the stat block. */}
            <Wordmark
              h1
              // pr-4 so the wordmark never runs into a button sharing its line; on the
              // stacked layouts nothing follows it, so the padding costs nothing.
              className="tap-y flex items-center gap-2.5 whitespace-nowrap pr-4 transition-opacity hover:opacity-80 wide:w-[var(--wide-col-l)] wide:shrink-0"
              // The wordmark goes to screen readers only under 360px, where those 130px
              // are what wrap the account cluster onto a fourth header row. Every phone
              // wider than that has the room, and the icon alone carries the narrowest.
              wordClassName="text-xl font-semibold tracking-tight max-[359px]:sr-only"
            />
            {/* The rail follows the sizing axis, not a width gate. On a narrow screen —
            phones and portrait tablets alike — it stacks: full-width lines under the
            brand-and-account row, the phone header whole. On a short one (landscape
            phone) and in split it shares the line at its natural size. At wide it
            dissolves (contents) into the aligned header. */}
            {(fightControls || addControls) && (
              <div className="flex flex-wrap items-center gap-2 narrow:order-last narrow:w-full wide:contents">
                {/* Each cluster owns a full row on a compact screen, and the controls that
                carry a word share out what the icons leave. Nothing here changes at lg,
                where the two clusters dissolve into the desktop header's own spots. */}
                {fightControls && (
                  <div className="flex flex-wrap items-center gap-2 narrow:w-full wide:flex-nowrap 2xl:pl-4">
                    {fightControls}
                  </div>
                )}
                {addControls && (
                  <div className="flex flex-wrap items-center gap-2 narrow:w-full wide:flex-nowrap 2xl:pl-2">
                    {addControls}
                  </div>
                )}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 wide:gap-3 wide:pl-3">
              {/* The view toggle sits out the phone layout — the bottom bar owns the
              switch to the compendium there. */}
              <div className="hidden split:block wide:block">
                <ViewToggle view={view} onChange={handleViewChange} />
              </div>
              <AccountControl
                onSignIn={() => setAuthOpen(true)}
                allowReserved={bylineGranted}
                onOpenShares={() => {
                  refreshShares()
                  setShowShares(true)
                }}
              />
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
                onShowHotkeys={() => setHelpOpen(true)}
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
              hotkeys={hotkeys}
              onSetHotkeys={(value) => {
                track(EVENTS.keybindingChanged)
                setHotkeys(value)
              }}
            />
          )}

          <main className="min-h-0 flex-1 overflow-hidden">
            {view === 'compendium' ? (
              <div className="h-full w-full overflow-hidden px-4 py-3 md:px-6 md:py-6">
                <Compendium
                  onShareCreature={setSharingCreature}
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
                  savedFights={savedFights}
                  onLoadFight={loadSavedFight}
                  onRestoreFight={handleRestoreFight}
                  onAddCast={handleAddCast}
                  onRenameFight={handleRenameFight}
                  onDeleteFight={handleDeleteFight}
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
                boardActions={
                  <>
                    <SaveFightButton
                      canSave={encounter.combatants.length > 0}
                      signedIn={!!user}
                      onSave={handleSaveFight}
                      onSignIn={() => setAuthOpen(true)}
                    />
                    <ShareEncounterButton
                      canShare={encounter.combatants.some((c) => !c.isPC || c.kind === 'quick')}
                      signedIn={!!user}
                      defaultByline={displayName ?? shareByline}
                      defaultLicense={shareLicense ?? 'unstated'}
                      restricted={restricted.names}
                      canDropRestricted={restricted.someRemain}
                      allowReserved={bylineGranted}
                      onShare={handleShareEncounter}
                      onSignIn={() => setAuthOpen(true)}
                    />
                  </>
                }
                encounter={encounter}
                dispatch={dispatch}
                onRoll={pushRoll}
                onGmRoll={pushGmRoll}
                onNote={pushNote}
                onRename={renameInLog}
                onEditPc={handleEditEncounterPc}
                onEditPcDmNotes={handleEditEncounterPcDmNotes}
                onEditCreature={handleEditEncounterCreature}
                onSaveCreature={handleSaveEncounterCreature}
                savedCreatureIds={customCreatures.map((c) => c.id)}
                onShareCreature={setSharingCreature}
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
                pane={mobilePane}
                onPaneChange={setMobilePane}
                effectRequest={effectRequest}
                hpEditRequest={hpEditRequest}
                concentrateRequest={concentrateRequest}
                keyHints={{
                  next: hint('nextTurn'),
                  prev: hint('prevTurn'),
                  begin: hint('startCombat'),
                  pause: hint('pauseResume'),
                  stop: hint('endFight'),
                }}
              />
            )}
          </main>

          {helpOpen && <KeyboardHelp bindings={keymap} onClose={() => setHelpOpen(false)} />}

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

          {/* One dialog for both surfaces: the compendium's stat block and the board's
          selected creature open the same one, so what a Game Master sees does not depend on
          which screen they were looking at. */}
          {sharingCreature && (
            <ShareCreatureDialog
              creature={sharingCreature}
              signedIn={!!user}
              defaultByline={displayName ?? shareByline}
              allowReserved={bylineGranted}
              onShare={(draft) => handleShareCreature(sharingCreature, draft)}
              onSignIn={() => setAuthOpen(true)}
              onClose={() => setSharingCreature(null)}
            />
          )}

          {/* Over the app, like Account and Settings: an account screen rather than a third
          view, and deliberately not persisted — a reload returns to the board. */}
          {showShares && (
            <SharedLinksPage
              shares={myShares}
              onUnpublish={handleUnpublish}
              onClose={() => setShowShares(false)}
            />
          )}

          {initPrompt && (
            <InitiativePrompt
              combatants={encounter.combatants}
              initial={initPrompt}
              onStart={startCombat}
              onCancel={() => setInitPrompt(null)}
            />
          )}
          {/* On a phone the footer carries only the fight's numbers (the dice and the legal
          links live elsewhere there), so it disappears when there is nothing to show.
          Asking each part what it would render, rather than guessing from the combatant
          count: a board of players with no foes has no difficulty to estimate, and the
          bar was left empty above the tab bar, reading as a second border. */}
          <footer
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 px-4 py-2 text-sm text-slate-500 narrow:grid narrow:grid-cols-2 narrow:items-center narrow:gap-x-3 dark:border-slate-800 dark:text-slate-400 wide:grid wide:grid-cols-[var(--wide-col-l)_1fr_var(--wide-col-r)] wide:gap-0 wide:px-6 wide:py-3 ${
              compactFooterHasContent ? '' : 'swipe:hidden'
            }`}
          >
            {view === 'encounter' && started && encounter.combatStats ? (
              <CombatTimers
                stats={encounter.combatStats}
                round={encounter.round}
                running={started && !paused}
              />
            ) : view === 'encounter' ? (
              <CombatDifficulty combatants={encounter.combatants} />
            ) : (
              <div className="hidden wide:block" aria-hidden="true" />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 narrow:justify-end wide:pl-4">
              {/* On a phone the dice sit in the Controls screen instead of down here. */}
              {view === 'encounter' && (
                <div className="hidden split:block wide:block">
                  <QuickRoll
                    onRoll={pushRoll}
                    focusRequest={diceFocusRequest}
                    keyHint={hint('focusDice')}
                  />
                </div>
              )}
              {view === 'encounter' && user && (
                <CampaignPicker
                  campaigns={campaigns}
                  activeId={activeCampaignId}
                  onChange={setActiveCampaignId}
                />
              )}
            </div>
            <LegalLinks
              sourceAsIcon
              className="hidden items-center gap-2 roomy:flex wide:justify-end wide:pl-4"
            />
          </footer>

          <MobileNav active={mobileTab} onSelect={showMobileTab} />
        </div>
      </CampaignEditionContext.Provider>
    </CampaignRulesContext.Provider>
  )
}

export default App
