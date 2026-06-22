// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type FormEvent } from 'react'
import type { Ability, AbilityScores } from '../schema/primitives.ts'
import type { Campaign } from '../schema/campaign.ts'
import type { RosterPc } from '../schema/roster.ts'
import { parseSpeedInput, speedLines } from '../combat/speed.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const LABEL = 'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

const ABILITY_ORDER: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABEL: Record<Ability, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))
const signed = (v: string): number => Math.floor(Number(v) || 0)
const score = (v: string): number => Math.max(1, Math.min(30, Math.floor(Number(v) || 10)))
const list = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

type AbilityStrings = Record<Ability, string>
const DEFAULT_ABILITIES: AbilityStrings = { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' }

function abilitiesToStrings(a?: AbilityScores): AbilityStrings {
  if (!a) return { ...DEFAULT_ABILITIES }
  return { str: String(a.str), dex: String(a.dex), con: String(a.con), int: String(a.int), wis: String(a.wis), cha: String(a.cha) }
}

/**
 * Modal to create or edit a durable roster PC — the board facts a DM wants on a
 * player character, plus the six ability scores and an optional campaign tag.
 * Mirrors the campaign form: controlled via `open`, seeded from `pc` (null =
 * create), handing the built RosterPc to `onSubmit`. Editing keeps the id.
 *
 * This is the signed-in, expanded form. It is not a character sheet — no class,
 * level, or spell list; the DM transcribes what they want on the board.
 */
export function PcFormModal({
  open,
  pc,
  campaigns = [],
  onClose,
  onSubmit,
}: {
  open: boolean
  /** The roster PC being edited, or null to create a new one. */
  pc?: RosterPc | null
  /** The user's campaigns, for the assignment dropdown. */
  campaigns?: Campaign[]
  onClose: () => void
  onSubmit: (pc: RosterPc) => void
}) {
  const editing = pc != null
  const [f, setF] = useState({
    name: '',
    ac: '',
    hp: '',
    init: '',
    pp: '',
    speed: '',
    languages: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
    campaignId: '',
  })
  const [abilities, setAbilities] = useState<AbilityStrings>({ ...DEFAULT_ABILITIES })

  // Seed the form each time it opens (create → blank/defaults, edit → the PC's values).
  useEffect(() => {
    if (!open) return
    setF({
      name: pc?.name ?? '',
      ac: pc?.ac != null ? String(pc.ac) : '',
      hp: pc?.maxHp != null ? String(pc.maxHp) : '',
      init: pc?.initiativeMod != null ? String(pc.initiativeMod) : '',
      pp: pc?.passivePerception != null ? String(pc.passivePerception) : '',
      speed: pc?.speed ? speedLines(pc.speed).join(', ') : '',
      languages: pc?.languages?.join(', ') ?? '',
      resistances: pc?.resistances?.join(', ') ?? '',
      immunities: pc?.immunities?.join(', ') ?? '',
      vulnerabilities: pc?.vulnerabilities?.join(', ') ?? '',
      campaignId: pc?.campaignId ?? '',
    })
    setAbilities(abilitiesToStrings(pc?.abilities))
  }, [open, pc])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const set = (key: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }))
  const setAbility = (a: Ability) => (e: { target: { value: string } }) =>
    setAbilities((prev) => ({ ...prev, [a]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = f.name.trim()
    if (!name) return
    const speed = parseSpeedInput(f.speed)
    onSubmit({
      id: pc?.id ?? crypto.randomUUID(),
      name,
      ac: num(f.ac),
      maxHp: Math.max(1, num(f.hp)),
      initiativeMod: f.init ? signed(f.init) : undefined,
      passivePerception: f.pp ? num(f.pp) : undefined,
      speed: Object.keys(speed).length ? speed : undefined,
      languages: list(f.languages).length ? list(f.languages) : undefined,
      resistances: list(f.resistances).length ? list(f.resistances) : undefined,
      immunities: list(f.immunities).length ? list(f.immunities) : undefined,
      vulnerabilities: list(f.vulnerabilities).length ? list(f.vulnerabilities) : undefined,
      abilities: {
        str: score(abilities.str),
        dex: score(abilities.dex),
        con: score(abilities.con),
        int: score(abilities.int),
        wis: score(abilities.wis),
        cha: score(abilities.cha),
      },
      campaignId: f.campaignId || null,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-label={editing ? 'Edit player character' : 'New player character'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="my-auto w-full max-w-md rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">
            {editing ? 'Edit player character' : 'New player character'}
          </h2>
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
            <span className={LABEL}>Name</span>
            <input
              value={f.name}
              onChange={set('name')}
              placeholder="e.g. Thalia"
              aria-label="PC name"
              autoFocus
              autoComplete="off"
              className={FIELD}
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block space-y-1">
              <span className={LABEL}>AC</span>
              <input value={f.ac} onChange={set('ac')} aria-label="AC" inputMode="numeric" className={FIELD} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Max HP</span>
              <input value={f.hp} onChange={set('hp')} aria-label="Max HP" inputMode="numeric" className={FIELD} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Init +</span>
              <input value={f.init} onChange={set('init')} aria-label="Initiative modifier" inputMode="numeric" className={FIELD} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className={LABEL}>Passive Perception</span>
              <input value={f.pp} onChange={set('pp')} aria-label="Passive Perception" inputMode="numeric" className={FIELD} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Speed</span>
              <input value={f.speed} onChange={set('speed')} placeholder="30, Climb 12" aria-label="Speed" className={FIELD} />
            </label>
          </div>

          <div className="space-y-1">
            <span className={LABEL}>Ability scores</span>
            <div className="grid grid-cols-6 gap-2">
              {ABILITY_ORDER.map((a) => (
                <label key={a} className="block space-y-1 text-center">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {ABILITY_LABEL[a]}
                  </span>
                  <input
                    value={abilities[a]}
                    onChange={setAbility(a)}
                    aria-label={ABILITY_LABEL[a]}
                    inputMode="numeric"
                    className={`${FIELD} px-1 text-center`}
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className={LABEL}>Languages (comma-separated)</span>
            <input value={f.languages} onChange={set('languages')} aria-label="Languages" className={FIELD} />
          </label>

          <div className="space-y-1">
            <span className={LABEL}>Defenses (comma-separated)</span>
            <input value={f.resistances} onChange={set('resistances')} placeholder="Resistances" aria-label="Resistances" className={FIELD} />
            <input value={f.immunities} onChange={set('immunities')} placeholder="Immunities" aria-label="Immunities" className={FIELD} />
            <input value={f.vulnerabilities} onChange={set('vulnerabilities')} placeholder="Vulnerabilities" aria-label="Vulnerabilities" className={FIELD} />
          </div>

          <label className="block space-y-1">
            <span className={LABEL}>Campaign</span>
            <select value={f.campaignId} onChange={set('campaignId')} aria-label="Campaign" className={FIELD}>
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="submit"
            disabled={!f.name.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {editing ? 'Save changes' : 'Create PC'}
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
