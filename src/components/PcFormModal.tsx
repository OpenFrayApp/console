// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type FormEvent } from 'react'
import type { Ability, AbilityScores } from '../schema/primitives.ts'
import type { Campaign } from '../schema/campaign.ts'
import type { RosterPc } from '../schema/roster.ts'
import { parseSpeedInput, speedLines } from '../combat/speed.ts'
import { ALIGNMENTS } from './customMonster.ts'

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const LABEL = 'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

// None of these are credential fields, so keep password managers (1Password's
// `data-1p-ignore`) and browser autofill off them — their popups otherwise cover
// the inputs. Spread onto the form and every field.
const NO_AUTOFILL = { autoComplete: 'off', 'data-1p-ignore': true } as const

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
const score = (v: string): number => Math.max(1, Math.min(30, Math.floor(Number(v) || 10)))
const list = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
/** Trim a line-list to its non-empty entries, or undefined when there are none. */
const clean = (xs: string[]): string[] | undefined => {
  const out = xs.map((s) => s.trim()).filter(Boolean)
  return out.length ? out : undefined
}
/** Capitalize each word of a lowercase alignment for the dropdown label. */
const cap = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase())

/** The four roleplay categories share one repeatable-line editor. */
type ListKey = 'personalityTraits' | 'ideals' | 'bonds' | 'flaws'
type Lists = Record<ListKey, string[]>
const EMPTY_LISTS: Lists = { personalityTraits: [], ideals: [], bonds: [], flaws: [] }

/** A repeatable list of one-line text fields, with a "+ Add" button (like damage rows). */
function LineList({
  label,
  addLabel,
  items,
  onChange,
}: {
  label: string
  addLabel: string
  items: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-1">
      <span className={LABEL}>{label}</span>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={v}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            aria-label={`${label} ${i + 1}`}
            {...NO_AUTOFILL}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${label} ${i + 1}`}
            className="shrink-0 rounded border border-slate-300 px-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
      >
        {addLabel}
      </button>
    </div>
  )
}

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
    alignment: '',
    ac: '',
    hp: '',
    pp: '',
    speed: '',
    languages: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
    backstory: '',
    campaignId: '',
  })
  const [abilities, setAbilities] = useState<AbilityStrings>({ ...DEFAULT_ABILITIES })
  const [lists, setLists] = useState<Lists>({ ...EMPTY_LISTS })

  // Seed the form each time it opens (create → blank/defaults, edit → the PC's values).
  useEffect(() => {
    if (!open) return
    setF({
      name: pc?.name ?? '',
      alignment: pc?.alignment ?? '',
      ac: pc?.ac != null ? String(pc.ac) : '',
      hp: pc?.maxHp != null ? String(pc.maxHp) : '',
      pp: pc?.passivePerception != null ? String(pc.passivePerception) : '',
      speed: pc?.speed ? speedLines(pc.speed).join(', ') : '',
      languages: pc?.languages?.join(', ') ?? '',
      resistances: pc?.resistances?.join(', ') ?? '',
      immunities: pc?.immunities?.join(', ') ?? '',
      vulnerabilities: pc?.vulnerabilities?.join(', ') ?? '',
      backstory: pc?.backstory ?? '',
      campaignId: pc?.campaignId ?? '',
    })
    setAbilities(abilitiesToStrings(pc?.abilities))
    setLists({
      personalityTraits: pc?.personalityTraits ?? [],
      ideals: pc?.ideals ?? [],
      bonds: pc?.bonds ?? [],
      flaws: pc?.flaws ?? [],
    })
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
      alignment: f.alignment || undefined,
      ac: num(f.ac),
      maxHp: Math.max(1, num(f.hp)),
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
      personalityTraits: clean(lists.personalityTraits),
      ideals: clean(lists.ideals),
      bonds: clean(lists.bonds),
      flaws: clean(lists.flaws),
      backstory: f.backstory.trim() || undefined,
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
        {...NO_AUTOFILL}
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
              {...NO_AUTOFILL}
              className={FIELD}
            />
          </label>

          <label className="block space-y-1">
            <span className={LABEL}>Alignment</span>
            <select value={f.alignment} onChange={set('alignment')} aria-label="Alignment" {...NO_AUTOFILL} className={FIELD}>
              <option value="">No alignment</option>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {cap(a)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block space-y-1">
              <span className={LABEL}>AC</span>
              <input value={f.ac} onChange={set('ac')} aria-label="AC" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Max HP</span>
              <input value={f.hp} onChange={set('hp')} aria-label="Max HP" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Passive Perception</span>
              <input value={f.pp} onChange={set('pp')} aria-label="Passive Perception" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className={LABEL}>Speed</span>
            <input value={f.speed} onChange={set('speed')} placeholder="30, Climb 12" aria-label="Speed" {...NO_AUTOFILL} className={FIELD} />
          </label>

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
                    {...NO_AUTOFILL}
                    className={`${FIELD} px-1 text-center`}
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className={LABEL}>Languages (comma-separated)</span>
            <input value={f.languages} onChange={set('languages')} aria-label="Languages" {...NO_AUTOFILL} className={FIELD} />
          </label>

          <div className="space-y-1">
            <span className={LABEL}>Defenses (comma-separated)</span>
            <input value={f.resistances} onChange={set('resistances')} placeholder="Resistances" aria-label="Resistances" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.immunities} onChange={set('immunities')} placeholder="Immunities" aria-label="Immunities" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.vulnerabilities} onChange={set('vulnerabilities')} placeholder="Vulnerabilities" aria-label="Vulnerabilities" {...NO_AUTOFILL} className={FIELD} />
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <LineList
              label="Personality Traits"
              addLabel="+ Add trait"
              items={lists.personalityTraits}
              onChange={(next) => setLists((p) => ({ ...p, personalityTraits: next }))}
            />
            <LineList
              label="Ideals"
              addLabel="+ Add ideal"
              items={lists.ideals}
              onChange={(next) => setLists((p) => ({ ...p, ideals: next }))}
            />
            <LineList
              label="Bonds"
              addLabel="+ Add bond"
              items={lists.bonds}
              onChange={(next) => setLists((p) => ({ ...p, bonds: next }))}
            />
            <LineList
              label="Flaws"
              addLabel="+ Add flaw"
              items={lists.flaws}
              onChange={(next) => setLists((p) => ({ ...p, flaws: next }))}
            />
            <label className="block space-y-1">
              <span className={LABEL}>Backstory &amp; Goals (markdown)</span>
              <textarea
                value={f.backstory}
                onChange={set('backstory')}
                rows={4}
                placeholder="Goals, history, hooks…"
                aria-label="Backstory and goals"
                {...NO_AUTOFILL}
                className={FIELD}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className={LABEL}>Campaign</span>
            <select value={f.campaignId} onChange={set('campaignId')} aria-label="Campaign" {...NO_AUTOFILL} className={FIELD}>
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
