// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useReducer, useRef, useState } from 'react'
import type { Creature } from './schema/creature.ts'
import type { Combatant } from './schema/combatant.ts'
import type { Effect } from './schema/effect.ts'
import { instantiate } from './combat/combatant.ts'
import { resolveMaxHp } from './combat/hp.ts'
import { beginEncounter, nextTurn } from './combat/initiative.ts'
import { rechargeActions, rollRecharge } from './combat/recharge.ts'
import { rechargeLimited } from './combat/resources.ts'
import { roll } from './dice/roll.ts'
import type { Encounter } from './schema/encounter.ts'
import { DEFAULT_CAMPAIGN_RULES, type Campaign } from './schema/campaign.ts'
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
  deleteCampaign,
  loadCampaigns,
  saveCampaign,
  updateCampaign,
} from './state/cloudCampaigns.ts'
import { useAuth } from './auth/useAuth.ts'
import { Compendium } from './components/Compendium.tsx'
import { EncounterConsole } from './components/EncounterConsole.tsx'
import { AddCreaturePicker } from './components/AddCreaturePicker.tsx'
import { AddPcForm } from './components/AddPcForm.tsx'
import { AddQuickForm } from './components/AddQuickForm.tsx'
import { CastSpellPanel } from './components/CastSpellPanel.tsx'
import { InitiativePrompt } from './components/InitiativePrompt.tsx'
import { MassSavePanel } from './components/MassSavePanel.tsx'
import { QuickRoll } from './components/QuickRoll.tsx'
import { CampaignPicker } from './components/CampaignPicker.tsx'
import { AccountControl } from './components/AccountControl.tsx'
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

/** The OpenFray brand mark — crossed swords, matching the site favicon/logo. */
function CrossedSwordsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
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
  // Restore the previous session (reload/crash insurance) once, on mount. Null
  // when there's nothing valid to restore, so every field falls back to its default.
  const [restored] = useState(loadSession)
  const [theme, setTheme] = useState<Theme>(() => restored?.theme ?? 'dark')
  const [view, setView] = useState<View>(() => restored?.view ?? 'encounter')
  const [encounter, dispatch] = useReducer(
    encounterReducer,
    undefined,
    () => restored?.encounter ?? emptyEncounter(),
  )
  const [rollLog, setRollLog] = useState<RollEntry[]>(() => restored?.rollLog ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(() => restored?.selectedId ?? null)
  // Pre-rolled initiative values (blank for players) held while the Roll Initiative
  // modal is open; null when it's closed.
  const [initPrompt, setInitPrompt] = useState<Record<string, string> | null>(null)

  const { user } = useAuth()
  // The DB row id of the signed-in user's encounter; a ref so the autosave effect
  // doesn't re-subscribe when it changes after the first cloud write.
  const cloudId = useRef<string | null>(null)
  // Whether the full-screen sign-up page is showing (opened from the header or a
  // gated feature); it closes itself once the user is signed in.
  const [authOpen, setAuthOpen] = useState(false)
  // The signed-in user's custom creature library (empty when anonymous), shown in
  // the compendium and pickable into encounters.
  const [customCreatures, setCustomCreatures] = useState<Creature[]>([])
  // The signed-in user's campaigns (empty when anonymous), managed in the compendium.
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  // Which campaign the DM is running; its house rules drive the console. Null for
  // anonymous users and signed-in users with no campaign selected (→ standard rules).
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(
    () => restored?.activeCampaignId ?? null,
  )
  // The active campaign's house rules, or the standard defaults when none is set —
  // so the console behaves exactly as before unless a campaign is actively running.
  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId)
    : undefined
  const activeRules = activeCampaign?.rules ?? DEFAULT_CAMPAIGN_RULES

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (user) setAuthOpen(false)
  }, [user])

  // Load the custom creature library + campaigns on sign-in; clear them on sign-out.
  useEffect(() => {
    if (!user) {
      setCustomCreatures([])
      setCampaigns([])
      setActiveCampaignId(null)
      return
    }
    let active = true
    loadCustomCreatures().then((list) => {
      if (active) setCustomCreatures(list)
    })
    loadCampaigns().then((list) => {
      if (active) setCampaigns(list)
    })
    return () => {
      active = false
    }
  }, [user])

  // On sign-in, hydrate the live encounter from the cloud (the authoritative copy);
  // on sign-out, forget the row id so we stop writing to it.
  useEffect(() => {
    if (!user) {
      cloudId.current = null
      return
    }
    let active = true
    loadCloudEncounter().then((res) => {
      if (!active || !res) return
      cloudId.current = res.id
      dispatch({ type: 'load', encounter: res.encounter })
      setSelectedId(null)
    })
    return () => {
      active = false
    }
  }, [user])

  // Local-first autosave (debounced): always mirror the session to sessionStorage
  // for per-device restore; when signed in, also persist the encounter to the cloud
  // (one JSONB blob, RLS-isolated). The UI never waits on this — it's background.
  useEffect(() => {
    const handle = setTimeout(() => {
      saveSession({ encounter, rollLog, theme, view, selectedId, activeCampaignId })
      if (user) {
        saveCloudEncounter(cloudId.current, encounter).then((id) => {
          if (id) cloudId.current = id
        })
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [encounter, rollLog, theme, view, selectedId, activeCampaignId, user])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const pushRoll: OnRoll = (label, result, applied) => {
    setRollLog((prev) =>
      [{ id: crypto.randomUUID(), label, result, applied }, ...prev].slice(0, 25),
    )
  }

  const pushNote: OnNote = (label) => {
    setRollLog((prev) => [{ id: crypto.randomUUID(), label }, ...prev].slice(0, 25))
  }

  // Renaming a combatant rewrites its name in the existing roll-log lines, so the
  // log stays consistent with the tracker (entries bake the name in at roll time).
  const renameInLog = (oldName: string, newName: string) => {
    if (!oldName || oldName === newName) return
    setRollLog((prev) =>
      prev.map((e) =>
        e.label.includes(oldName) ? { ...e, label: e.label.split(oldName).join(newName) } : e,
      ),
    )
  }

  const handlePick = (creature: Creature) => {
    // Auto-label duplicates ("Goblin", "Goblin 2", …). Initiative stays 0 until
    // combat begins, when it's rolled for everyone at once.
    const sameKind = encounter.combatants.filter(
      (c) => !c.isPC && c.creatureId === creature.id,
    ).length
    const label = sameKind > 0 ? `${creature.name} ${sameKind + 1}` : creature.name
    const combatant = instantiate(creature, {
      combatantId: crypto.randomUUID(),
      initiative: 0,
      label,
      // The campaign's HP method decides how this instance's max HP is rolled.
      maxHp: resolveMaxHp(creature, activeRules.hp),
    })
    dispatch({ type: 'add', combatant })
    setSelectedId(combatant.combatantId)
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
      // app-rolled value; a value the DM typed (or edited) is always respected.
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
    const next = beginEncounter({ ...encounter, combatants })
    dispatch({ type: 'begin' })
    selectActive(next)
    autoRecharge(next)
    setInitPrompt(null)
  }

  // Begin: pre-roll monsters/quick-adds, then open the Roll Initiative modal so the
  // DM enters players' rolls and (optionally) marks surprised combatants.
  const handleBegin = () => {
    if (encounter.combatants.length === 0) return
    const initial: Record<string, string> = {}
    for (const c of encounter.combatants) {
      initial[c.combatantId] = isPlayer(c) ? '' : String(rollInit(initLabel(c), initMod(c)))
    }
    setInitPrompt(initial)
  }
  const handleNextTurn = () => {
    const next = nextTurn(encounter)
    selectActive(next)
    dispatch({ type: 'nextTurn' })
    autoRecharge(next)
  }

  const started = encounter.round > 0
  const paused = encounter.paused === true

  return (
    <CampaignRulesContext.Provider value={activeRules}>
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-center gap-4 lg:gap-0">
          {/* Title spans the initiative column so Group/Cast line up with the stat block. */}
          <div className="flex items-center gap-2.5 lg:w-[28rem] lg:shrink-0 lg:pr-4">
            <span className="text-indigo-500 dark:text-indigo-400">
              <CrossedSwordsIcon />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">OpenFray</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                DnD 5e combat console
              </p>
            </div>
          </div>
          {view === 'encounter' && encounter.combatants.length > 0 && (
            <div className="flex items-center gap-2 lg:pl-4">
              <MassSavePanel combatants={encounter.combatants} dispatch={dispatch} onRoll={pushRoll} />
              <CastSpellPanel combatants={encounter.combatants} dispatch={dispatch} onRoll={pushRoll} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {view === 'encounter' && (
            <div className="flex items-center gap-2">
              <AddQuickForm onAdd={(c) => dispatch({ type: 'add', combatant: c })} />
              <AddPcForm onAdd={(pc) => dispatch({ type: 'add', combatant: pc })} />
              <AddCreaturePicker onPick={handlePick} customCreatures={customCreatures} />
            </div>
          )}
          <ViewToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
          <AccountControl onSignUp={() => setAuthOpen(true)} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {view === 'compendium' ? (
          <div className="h-full w-full overflow-hidden px-6 py-6">
            <Compendium
              customCreatures={customCreatures}
              onCreateCreature={handleCreateCreature}
              onUpdateCreature={handleUpdateCreature}
              onDeleteCreature={handleDeleteCreature}
              campaigns={campaigns}
              onCreateCampaign={handleCreateCampaign}
              onUpdateCampaign={handleUpdateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
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

      {initPrompt && (
        <InitiativePrompt
          combatants={encounter.combatants}
          initial={initPrompt}
          onStart={startCombat}
          onCancel={() => setInitPrompt(null)}
        />
      )}

      {/* Footer: dice roller aligned under the stat block (center column); AGPL §13
          source link at the right. Columns mirror the console grid. */}
      <footer className="grid grid-cols-1 items-center gap-2 border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 lg:grid-cols-[28rem_1fr_24rem] lg:gap-0">
        <div className="hidden lg:block" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:pl-4">
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
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200"
          >
            Source
          </a>
          <span>·</span>
          <span>AGPL-3.0</span>
        </div>
      </footer>
    </div>
    </CampaignRulesContext.Provider>
  )
}

export default App
