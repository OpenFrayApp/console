// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useReducer, useRef, useState } from 'react'
import type { Creature } from './schema/creature.ts'
import type { Spell } from './schema/spell.ts'
import type { Combatant, MonsterCombatant, PlayerCharacter } from './schema/combatant.ts'
import type { Effect } from './schema/effect.ts'
import { instantiate } from './combat/combatant.ts'
import { resolveMaxHp } from './combat/hp.ts'
import { beginEncounter, nextTurn } from './combat/initiative.ts'
import { rechargeActions, rollRecharge } from './combat/recharge.ts'
import { saveBonus } from './combat/masssave.ts'
import { groupSaveEnds } from './combat/saveEnds.ts'
import { rechargeLimited } from './combat/resources.ts'
import { roll } from './dice/roll.ts'
import type { Encounter } from './schema/encounter.ts'
import { DEFAULT_CAMPAIGN_RULES, type Campaign } from './schema/campaign.ts'
import { rosterPcToCombatant, syncCombatantFromRoster, type RosterPc } from './schema/roster.ts'
import { CampaignRulesContext } from './state/campaignRules.ts'
import { emptyEncounter, encounterReducer } from './state/encounter.ts'
import { loadSession, saveSession, type Theme, type View } from './state/persistence.ts'
import { loadCloudEncounter, saveCloudEncounter } from './state/cloudEncounter.ts'
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
import { AddCreaturePicker } from './components/AddCreaturePicker.tsx'
import { loadSettings, saveSettings } from './state/settings.ts'
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
import { SettingsPanel } from './components/SettingsPanel.tsx'
import { CrossedSwordsIcon } from './components/CrossedSwordsIcon.tsx'
import { SignUpPage } from './components/SignUpPage.tsx'
import { type OnNote, type OnRoll, type RollEntry } from './components/RollLog.tsx'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

/** A player rolls their own initiative; monsters and quick adds are auto-rolled. */
const isPlayer = (c: Combatant): boolean => c.isPC && c.kind !== 'quick'

function SwordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14.5 17.5 4 7V4h3l10.5 10.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

/** Encounter / Compendium as an icon segmented control. */
function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
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
        aria-label="Encounter"
        title="Encounter"
        className={cell(view === 'encounter')}
      >
        <SwordIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange('compendium')}
        aria-current={view === 'compendium' ? 'page' : undefined}
        aria-label="Compendium"
        title="Compendium"
        className={`border-l border-slate-300 dark:border-slate-700 ${cell(view === 'compendium')}`}
      >
        <BookIcon />
      </button>
    </nav>
  )
}

const dexMod = (creature: Creature): number => Math.floor((creature.abilities.dex - 10) / 2)

function App() {
  const [restored] = useState(loadSession)
  // Theme is shared with the marketing site via the `openfray-theme` localStorage
  // key. Fall back to the restored session, then dark (the default both surfaces use).
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('openfray-theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      /* localStorage may be unavailable; fall through to the defaults */
    }
    return restored?.theme ?? 'dark'
  })
  const [view, setView] = useState<View>(() => restored?.view ?? 'encounter')
  const [compendiumTab, setCompendiumTab] = useState<CompendiumTab>('creatures')
  // Which content libraries the compendium/picker show. A device-local preference
  // for every user (anon included), persisted in localStorage like the theme.
  const [enabledLibraries, setEnabledLibrariesState] = useState<string[]>(
    () => loadSettings().enabledLibraries,
  )
  const setEnabledLibraries = (ids: string[]) => {
    setEnabledLibrariesState(ids)
    saveSettings({ enabledLibraries: ids })
  }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [encounterPcEdit, setEncounterPcEdit] = useState<{ pc: RosterPc; combatantId: string } | null>(null)
  const [encounterCreatureEdit, setEncounterCreatureEdit] = useState<{ draft: MonsterDraft; editId: string } | null>(null)
  const [encounter, dispatch] = useReducer(
    encounterReducer,
    undefined,
    () => restored?.encounter ?? emptyEncounter(),
  )
  const [rollLog, setRollLog] = useState<RollEntry[]>(() => restored?.rollLog ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(() => restored?.selectedId ?? null)
  const [initPrompt, setInitPrompt] = useState<Record<string, string> | null>(null)

  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const cloudId = useRef<string | null>(null)
  const cloudHydrated = useRef(false)
  const cloudInserting = useRef(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [customCreatures, setCustomCreatures] = useState<Creature[]>([])
  const [customSpells, setCustomSpells] = useState<Spell[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [rosterPcs, setRosterPcs] = useState<RosterPc[]>([])
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(
    () => restored?.activeCampaignId ?? null,
  )
  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId)
    : undefined
  const activeRules = activeCampaign?.rules ?? DEFAULT_CAMPAIGN_RULES

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    // Persist to the shared key so the marketing site reflects the same choice.
    try {
      localStorage.setItem('openfray-theme', theme)
    } catch {
      /* ignore when localStorage is unavailable */
    }
  }, [theme])

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
      if (res) {
        cloudId.current = res.id
        dispatch({ type: 'load', encounter: res.encounter })
        setSelectedId(null)
      }
      cloudHydrated.current = true
    })
    return () => {
      active = false
    }
  }, [userId, authLoading])

  // Local-first autosave (debounced): mirror the session to sessionStorage, and when
  // signed in also persist the encounter to the cloud. Background — the UI never waits.
  useEffect(() => {
    const handle = setTimeout(() => {
      saveSession({ encounter, rollLog, theme, view, selectedId, activeCampaignId })
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
  }, [encounter, rollLog, theme, view, selectedId, activeCampaignId, userId])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const pushRoll: OnRoll = (label, result, applied) => {
    setRollLog((prev) =>
      [{ id: crypto.randomUUID(), label, result, applied }, ...prev].slice(0, 25),
    )
  }

  const pushNote: OnNote = (label) => {
    setRollLog((prev) => [{ id: crypto.randomUUID(), label }, ...prev].slice(0, 25))
  }

  const renameInLog = (oldName: string, newName: string) => {
    if (!oldName || oldName === newName) return
    setRollLog((prev) =>
      prev.map((e) =>
        e.label.includes(oldName) ? { ...e, label: e.label.split(oldName).join(newName) } : e,
      ),
    )
  }

  const handlePick = (creature: Creature) => {
    const sameKind = encounter.combatants.filter(
      (c) => !c.isPC && c.creatureId === creature.id,
    ).length
    const label = sameKind > 0 ? `${creature.name} ${sameKind + 1}` : creature.name
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

  const handleUpdateCreature = (creature: Creature) => {
    setCustomCreatures((prev) => prev.map((c) => (c.id === creature.id ? creature : c)))
    updateCustomCreature(creature)
  }

  const handleDeleteCreature = (id: string) => {
    setCustomCreatures((prev) => prev.filter((c) => c.id !== id))
    deleteCustomCreature(id)
  }

  const handleCreateSpell = (spell: Spell) => {
    setCustomSpells((prev) => [spell, ...prev])
    saveCustomSpell(spell)
  }

  const handleUpdateSpell = (spell: Spell) => {
    setCustomSpells((prev) => prev.map((s) => (s.id === spell.id ? spell : s)))
    updateCustomSpell(spell)
  }

  const handleDeleteSpell = (id: string) => {
    setCustomSpells((prev) => prev.filter((s) => s.id !== id))
    deleteCustomSpell(id)
  }

  // Campaigns persist to the user's account (signed-up only). Optimistic in-memory
  // update first; the cloud write is background and best-effort.
  const handleCreateCampaign = (campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev])
    saveCampaign(campaign)
  }

  const handleUpdateCampaign = (campaign: Campaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? campaign : c)))
    updateCampaign(campaign)
  }

  const handleDeleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    deleteCampaign(id)
  }

  // Roster PCs persist to the user's account (signed-up only), same optimistic pattern.
  const handleCreatePc = (pc: RosterPc) => {
    setRosterPcs((prev) => [pc, ...prev])
    saveRosterPc(pc)
  }

  const handleUpdatePc = (pc: RosterPc) => {
    setRosterPcs((prev) => prev.map((p) => (p.id === pc.id ? pc : p)))
    updateRosterPc(pc)
  }

  const handleDeletePc = (id: string) => {
    setRosterPcs((prev) => prev.filter((p) => p.id !== id))
    deleteRosterPc(id)
  }

  // Add a roster PC to the current fight: instantiate a fresh combatant (the roster
  // entry is a reusable template), then jump to the encounter and select it.
  const handleAddPcToEncounter = (pc: RosterPc) => {
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
    if (creature) setEncounterCreatureEdit({ draft: creatureToDraft(creature), editId: creature.id })
  }

  // The view toggle opens the compendium on its default (creatures) tab; only the
  // create-a-character flow targets the Players tab.
  const handleViewChange = (next: View) => {
    if (next === 'compendium') setCompendiumTab('creatures')
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
        pushRoll(`${active.label}: ${action.name} recharge`, result)
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
  // roll their own — never rolled for them). Effects sharing one save (ability + DC
  // + timing) roll a single die together and end as a group.
  const autoRollSaveEnds = (c: Combatant | undefined, when: 'startOfTurn' | 'endOfTurn') => {
    if (!c || c.isPC) return
    for (const group of groupSaveEnds(c.effects)) {
      if (group.when !== when) continue
      const bonus = saveBonus(c, group.ability) ?? 0
      const result = roll(`1d20${bonus >= 0 ? `+${bonus}` : `${bonus}`}`, { kind: 'save' })
      const names = group.effects.map((e) => e.name).join(', ')
      pushRoll(`${c.label}: ${names} (${group.ability.toUpperCase()} save)`, result)
      if (result.total >= group.dc) {
        const ids = new Set(group.effects.map((e) => e.id))
        dispatch({
          type: 'update',
          id: c.combatantId,
          update: (cc) => ({ ...cc, effects: cc.effects.filter((x) => !ids.has(x.id)) }),
        })
      }
    }
  }
  const rollInit = (label: string, mod: number, disadvantage = false): number => {
    const dice = `1d20${disadvantage ? 'dis' : ''}${mod >= 0 ? `+${mod}` : `${mod}`}`
    const result = roll(dice)
    pushRoll(`${label}: initiative${disadvantage ? ' (surprised)' : ''}`, result)
    return result.total
  }

  const initLabel = (c: Combatant): string => (c.isPC ? c.name : c.label)
  // The initiative modifier: a PC's own, 0 for a quick add, and for a monster its
  // listed Initiative bonus (2024 stat blocks carry one that can exceed the Dex
  // mod — e.g. an Adult Brass Dragon is +10 with Dex 10), falling back to Dex.
  const initMod = (c: Combatant): number =>
    isPlayer(c)
      ? c.isPC
        ? c.initiativeMod ?? 0
        : 0
      : c.isPC
        ? 0
        : c.creature.initiative ?? dexMod(c.creature)

  // Add a combatant to the encounter and select it. Mid-combat it rolls initiative
  // straight away (like Begin) so a reinforcement slots into the order instead of
  // sitting at 0; before combat, initiative waits for Begin to roll everyone together.
  const addCombatant = (c: Combatant) => {
    const combatant =
      encounter.round > 0 ? { ...c, initiative: rollInit(initLabel(c), initMod(c)) } : c
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
    for (const c of encounter.combatants) {
      const id = c.combatantId
      const raw = (result.values[id] ?? '').trim()
      const isSurprised = surprised.has(id)
      const disadvantage = isSurprised && rule === 'disadvantage'
      // Roll when the field is blank, or to apply 5.5 disadvantage to an unedited
      // app-rolled value; a value the GM typed (or edited) is always respected.
      const unedited = raw !== '' && raw === (initPrompt?.[id] ?? '')
      if (raw === '' || (disadvantage && unedited && !isPlayer(c))) {
        initiatives[id] = rollInit(initLabel(c), initMod(c), disadvantage)
      } else {
        initiatives[id] = Math.floor(Number(raw) || 0)
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
        update: (x) => ({ ...x, initiative: initiatives[x.combatantId] ?? x.initiative, effects: withSurprise(x) }),
      })
    }
    const combatants = encounter.combatants.map((c) => ({
      ...c,
      initiative: initiatives[c.combatantId] ?? c.initiative,
      effects: withSurprise(c),
    }))
    const next = beginEncounter({ ...encounter, combatants }, activeRules.initiativeTiebreak)
    dispatch({ type: 'begin', tiebreak: activeRules.initiativeTiebreak })
    selectActive(next)
    autoRecharge(next)
    setInitPrompt(null)
  }

  // Begin: pre-roll monsters/quick-adds, then open the Roll Initiative modal so the
  // GM enters players' rolls and (optionally) marks surprised combatants.
  const handleBegin = () => {
    if (encounter.combatants.length === 0) return
    const initial: Record<string, string> = {}
    for (const c of encounter.combatants) {
      initial[c.combatantId] = isPlayer(c) ? '' : String(rollInit(initLabel(c), initMod(c)))
    }
    setInitPrompt(initial)
  }
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

  const started = encounter.round > 0
  const paused = encounter.paused === true

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
              <MassSavePanel combatants={encounter.combatants} dispatch={dispatch} onRoll={pushRoll} />
              <CastSpellPanel combatants={encounter.combatants} dispatch={dispatch} onRoll={pushRoll} customSpells={customSpells} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {view === 'encounter' && (
            <div className="flex items-center gap-2">
              <AddQuickForm onAdd={addCombatant} />
              {user ? (
                <AddPcPicker
                  rosterPcs={rosterPcs}
                  campaigns={campaigns}
                  onPick={handleAddPcToEncounter}
                  onCreate={openRosterCreate}
                />
              ) : (
                <AddPcForm onAdd={addCombatant} />
              )}
              <AddCreaturePicker
                onPick={handlePick}
                customCreatures={customCreatures}
                enabledLibraries={enabledLibraries}
              />
            </div>
          )}
          <ViewToggle view={view} onChange={handleViewChange} />
          <AccountControl onSignIn={() => setAuthOpen(true)} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <GearIcon />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          enabledLibraries={enabledLibraries}
          onSetEnabledLibraries={setEnabledLibraries}
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
              initialTab={compendiumTab}
              enabledLibraries={enabledLibraries}
              createGated={!user}
              onGated={() => setAuthOpen(true)}
            />
          </div>
        ) : (
          <EncounterConsole
            encounter={encounter}
            dispatch={dispatch}
            rollLog={rollLog}
            onRoll={pushRoll}
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
            onClearLog={() => setRollLog([])}
          />
        )}
      </main>

      {authOpen && <SignUpPage onClose={() => setAuthOpen(false)} />}

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

      {}
      <footer className="grid grid-cols-1 items-center gap-2 border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 lg:grid-cols-[28rem_1fr_24rem] lg:gap-0">
        <div className="hidden lg:block" aria-hidden="true" />
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
          <a href="/privacy">Privacy</a><span>·</span>
          <a href="/terms">Terms</a><span>·</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="OpenFray on GitHub"
            title="GitHub"
            className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
          </a>&nbsp;
          <span><a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">AGPL-3.0</a></span>
        </div>
      </footer>
    </div>
    </CampaignRulesContext.Provider>
  )
}

export default App
