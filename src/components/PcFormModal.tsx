// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Ability, AbilityScores, Edition, Senses, Speeds } from '../schema/primitives.ts'
import type { Campaign } from '../schema/campaign.ts'
import { abilityMod, type RosterPc } from '../schema/roster.ts'
import { FIELD, FIELD_W, LABEL } from './ActionEditor.tsx'
import { FormSection as Section } from './FormSection.tsx'

// Keep password managers / browser autofill off the free-text fields.
const OFF = { autoComplete: 'off', 'data-1p-ignore': true } as const

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABEL: Record<Ability, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}
const SPEED_KEYS = ['walk', 'fly', 'swim', 'climb', 'burrow'] as const
const SENSE_KEYS = [
  { key: 'passivePerception', label: 'Passive Perception', placeholder: 'Passive Perc.' },
  { key: 'darkvision', label: 'Darkvision', placeholder: 'Darkvision' },
  { key: 'blindsight', label: 'Blindsight', placeholder: 'Blindsight' },
  { key: 'tremorsense', label: 'Tremorsense', placeholder: 'Tremorsense' },
  { key: 'truesight', label: 'Truesight', placeholder: 'Truesight' },
] as const

// PCs don't use the "typically…" / "any…" hedges that monster blocks do.
const PC_ALIGNMENTS = [
  'lawful good',
  'neutral good',
  'chaotic good',
  'lawful neutral',
  'neutral',
  'chaotic neutral',
  'lawful evil',
  'neutral evil',
  'chaotic evil',
]

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))
const score = (v: string): number => Math.max(1, Math.min(30, Math.floor(Number(v) || 10)))
const has = (v: string): boolean => v.trim().length > 0
const list = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
const orUndef = (xs: string[]): string[] | undefined => (xs.length ? xs : undefined)
/** Trim a line-list to its non-empty entries, or undefined when there are none. */
const clean = (xs: string[]): string[] | undefined => {
  const out = xs.map((s) => s.trim()).filter(Boolean)
  return out.length ? out : undefined
}
/** Capitalize each word of a lowercase alignment for the dropdown label. */
const cap = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase())
/** Seed a roleplay list with at least one (empty) field so a row always shows. */
const seedList = (xs?: string[]): string[] => (xs && xs.length ? [...xs] : [''])

type SpeedKey = (typeof SPEED_KEYS)[number]
type SenseKey = (typeof SENSE_KEYS)[number]['key']
type ListKey = 'personalityTraits' | 'ideals' | 'bonds' | 'flaws'

interface PcDraft {
  campaignId: string
  name: string
  race: string
  alignment: string
  faith: string
  edition: Edition
  ac: string
  hp: string
  speed: Record<SpeedKey, string> & { hover: boolean }
  abilities: Record<Ability, string>
  senses: Record<SenseKey, string>
  languages: string
  resistances: string
  immunities: string
  vulnerabilities: string
  personalityTraits: string[]
  ideals: string[]
  bonds: string[]
  flaws: string[]
  backstory: string
  dmNotes: string
}

function emptyDraft(): PcDraft {
  return {
    campaignId: '',
    name: '',
    race: '',
    alignment: '',
    faith: '',
    edition: '5.5',
    ac: '',
    hp: '',
    speed: { walk: '', fly: '', swim: '', climb: '', burrow: '', hover: false },
    abilities: { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' },
    senses: { passivePerception: '', darkvision: '', blindsight: '', tremorsense: '', truesight: '' },
    languages: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
    personalityTraits: [''],
    ideals: [''],
    bonds: [''],
    flaws: [''],
    backstory: '',
    dmNotes: '',
  }
}

function draftFromPc(pc: RosterPc): PcDraft {
  const str = (n?: number): string => (n != null ? String(n) : '')
  return {
    campaignId: pc.campaignId ?? '',
    name: pc.name,
    race: pc.race ?? '',
    alignment: pc.alignment ?? '',
    faith: pc.faith ?? '',
    edition: pc.edition ?? '5.5',
    ac: str(pc.ac),
    hp: str(pc.maxHp),
    speed: {
      walk: str(pc.speed?.walk),
      fly: str(pc.speed?.fly),
      swim: str(pc.speed?.swim),
      climb: str(pc.speed?.climb),
      burrow: str(pc.speed?.burrow),
      hover: Boolean(pc.speed?.hover),
    },
    abilities: {
      str: str(pc.abilities?.str) || '10',
      dex: str(pc.abilities?.dex) || '10',
      con: str(pc.abilities?.con) || '10',
      int: str(pc.abilities?.int) || '10',
      wis: str(pc.abilities?.wis) || '10',
      cha: str(pc.abilities?.cha) || '10',
    },
    senses: {
      passivePerception: str(pc.senses?.passivePerception),
      darkvision: str(pc.senses?.darkvision),
      blindsight: str(pc.senses?.blindsight),
      tremorsense: str(pc.senses?.tremorsense),
      truesight: str(pc.senses?.truesight),
    },
    languages: pc.languages?.join(', ') ?? '',
    resistances: pc.resistances?.join(', ') ?? '',
    immunities: pc.immunities?.join(', ') ?? '',
    vulnerabilities: pc.vulnerabilities?.join(', ') ?? '',
    personalityTraits: seedList(pc.personalityTraits),
    ideals: seedList(pc.ideals),
    bonds: seedList(pc.bonds),
    flaws: seedList(pc.flaws),
    backstory: pc.backstory ?? '',
    dmNotes: pc.dmNotes ?? '',
  }
}

function buildPc(d: PcDraft, id: string): RosterPc {
  const abilities: AbilityScores = {
    str: score(d.abilities.str),
    dex: score(d.abilities.dex),
    con: score(d.abilities.con),
    int: score(d.abilities.int),
    wis: score(d.abilities.wis),
    cha: score(d.abilities.cha),
  }
  const speed: Speeds = {}
  for (const k of SPEED_KEYS) if (has(d.speed[k])) speed[k] = num(d.speed[k])
  if (d.speed.hover) speed.hover = true
  // Passive Perception defaults to 10 + Wis mod when the DM leaves it blank.
  const senses: Senses = {
    passivePerception: has(d.senses.passivePerception)
      ? num(d.senses.passivePerception)
      : 10 + abilityMod(abilities.wis),
  }
  if (has(d.senses.darkvision)) senses.darkvision = num(d.senses.darkvision)
  if (has(d.senses.blindsight)) senses.blindsight = num(d.senses.blindsight)
  if (has(d.senses.tremorsense)) senses.tremorsense = num(d.senses.tremorsense)
  if (has(d.senses.truesight)) senses.truesight = num(d.senses.truesight)

  return {
    id,
    name: d.name.trim(),
    race: d.race.trim() || undefined,
    alignment: d.alignment || undefined,
    faith: d.faith.trim() || undefined,
    edition: d.edition,
    ac: num(d.ac),
    maxHp: Math.max(1, num(d.hp)),
    speed: Object.keys(speed).length ? speed : undefined,
    abilities,
    senses,
    languages: orUndef(list(d.languages)),
    resistances: orUndef(list(d.resistances)),
    immunities: orUndef(list(d.immunities)),
    vulnerabilities: orUndef(list(d.vulnerabilities)),
    personalityTraits: clean(d.personalityTraits),
    ideals: clean(d.ideals),
    bonds: clean(d.bonds),
    flaws: clean(d.flaws),
    backstory: d.backstory.trim() || undefined,
    dmNotes: d.dmNotes.trim() || undefined,
    campaignId: d.campaignId || null,
  }
}

/** A repeatable list of one-line text fields with a "+ Add" button. */
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
            {...OFF}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => onChange(items.length > 1 ? items.filter((_, j) => j !== i) : [''])}
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
        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {addLabel}
      </button>
    </div>
  )
}

/**
 * Create / edit a durable roster PC. Not a character sheet — no class, level, or
 * spells; the DM transcribes the board facts plus the roleplay notes to keep.
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
  const [d, setD] = useState<PcDraft>(emptyDraft)

  useEffect(() => {
    if (open) setD(pc ? draftFromPc(pc) : emptyDraft())
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

  const patch = (p: Partial<PcDraft>) => setD((prev) => ({ ...prev, ...p }))
  const setList = (key: ListKey) => (next: string[]) => patch({ [key]: next } as Partial<PcDraft>)

  const submit = () => {
    if (!d.name.trim()) return
    onSubmit(buildPc(d, pc?.id ?? crypto.randomUUID()))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={editing ? 'Edit player character' : 'New player character'}
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
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

        <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
          <Section title="Identity" open>
            <label className="block space-y-1">
              <span className={LABEL}>Campaign</span>
              <select value={d.campaignId} onChange={(e) => patch({ campaignId: e.target.value })} aria-label="Campaign" className={FIELD}>
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              autoFocus
              value={d.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Name"
              aria-label="PC name"
              {...OFF}
              className={FIELD}
            />
            <input
              value={d.race}
              onChange={(e) => patch({ race: e.target.value })}
              placeholder="Race / ancestry (Elf, Dwarf…)"
              aria-label="Race"
              {...OFF}
              className={FIELD}
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={d.alignment} onChange={(e) => patch({ alignment: e.target.value })} aria-label="Alignment" className={FIELD}>
                <option value="">No alignment</option>
                {PC_ALIGNMENTS.map((a) => (
                  <option key={a} value={a}>
                    {cap(a)}
                  </option>
                ))}
              </select>
              <select value={d.edition} onChange={(e) => patch({ edition: e.target.value as Edition })} aria-label="Edition" className={FIELD}>
                <option value="5.5">DnD 5.5 (2024)</option>
                <option value="5.0">DnD 5.0 (2014)</option>
              </select>
            </div>
          </Section>

          <Section title="Defense & HP" open>
            <div className="flex flex-wrap items-center gap-2">
              <span className={LABEL}>AC</span>
              <input value={d.ac} onChange={(e) => patch({ ac: e.target.value })} placeholder="AC" aria-label="AC" inputMode="numeric" className={`${FIELD_W} w-16`} />
              <span className={LABEL}>Max HP</span>
              <input value={d.hp} onChange={(e) => patch({ hp: e.target.value })} placeholder="HP" aria-label="Max HP" inputMode="numeric" className={`${FIELD_W} w-20`} />
            </div>
          </Section>

          <Section title="Speed" open>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {SPEED_KEYS.map((k) => (
                <input
                  key={k}
                  value={d.speed[k]}
                  onChange={(e) => patch({ speed: { ...d.speed, [k]: e.target.value } })}
                  placeholder={k}
                  aria-label={`${k} speed`}
                  inputMode="numeric"
                  className={FIELD}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.speed.hover} onChange={(e) => patch({ speed: { ...d.speed, hover: e.target.checked } })} />
              Can hover
            </label>
          </Section>

          <Section title="Abilities" open>
            <div className="grid grid-cols-6 gap-2">
              {ABILITIES.map((a) => (
                <div key={a} className="space-y-1">
                  <p className={`${LABEL} text-center`}>{ABILITY_LABEL[a]}</p>
                  <input
                    value={d.abilities[a]}
                    onChange={(e) => patch({ abilities: { ...d.abilities, [a]: e.target.value } })}
                    aria-label={ABILITY_LABEL[a]}
                    inputMode="numeric"
                    className={`${FIELD} text-center`}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Senses & languages">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SENSE_KEYS.map((s) => (
                <input
                  key={s.key}
                  value={d.senses[s.key]}
                  onChange={(e) => patch({ senses: { ...d.senses, [s.key]: e.target.value } })}
                  placeholder={s.placeholder}
                  aria-label={s.label}
                  inputMode="numeric"
                  className={FIELD}
                />
              ))}
            </div>
            <input value={d.languages} onChange={(e) => patch({ languages: e.target.value })} placeholder="Languages" aria-label="Languages" {...OFF} className={FIELD} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Languages are comma-separated. Passive Perception defaults to 10 + your Wisdom modifier.
            </p>
          </Section>

          <Section title="Defenses">
            <p className={LABEL}>Comma-separated</p>
            <input value={d.resistances} onChange={(e) => patch({ resistances: e.target.value })} placeholder="Resistances" aria-label="Resistances" {...OFF} className={FIELD} />
            <input value={d.immunities} onChange={(e) => patch({ immunities: e.target.value })} placeholder="Immunities" aria-label="Immunities" {...OFF} className={FIELD} />
            <input value={d.vulnerabilities} onChange={(e) => patch({ vulnerabilities: e.target.value })} placeholder="Vulnerabilities" aria-label="Vulnerabilities" {...OFF} className={FIELD} />
          </Section>

          <Section title="Personality & backstory">
            <label className="block space-y-1">
              <span className={LABEL}>Faith</span>
              <input
                value={d.faith}
                onChange={(e) => patch({ faith: e.target.value })}
                placeholder="Deity or faith"
                aria-label="Faith"
                {...OFF}
                className={FIELD}
              />
            </label>
            <LineList label="Personality Traits" addLabel="+ Add trait" items={d.personalityTraits} onChange={setList('personalityTraits')} />
            <LineList label="Ideals" addLabel="+ Add ideal" items={d.ideals} onChange={setList('ideals')} />
            <LineList label="Bonds" addLabel="+ Add bond" items={d.bonds} onChange={setList('bonds')} />
            <LineList label="Flaws" addLabel="+ Add flaw" items={d.flaws} onChange={setList('flaws')} />
            <label className="block space-y-1">
              <span className={LABEL}>Backstory &amp; Goals</span>
              <textarea
                value={d.backstory}
                onChange={(e) => patch({ backstory: e.target.value })}
                rows={4}
                placeholder="Goals, history, hooks…"
                aria-label="Backstory and goals"
                {...OFF}
                className={FIELD}
              />
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>DM Notes</span>
              <textarea
                value={d.dmNotes}
                onChange={(e) => patch({ dmNotes: e.target.value })}
                rows={3}
                placeholder="Private notes for tracking this character…"
                aria-label="DM notes"
                {...OFF}
                className={FIELD}
              />
            </label>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!d.name.trim()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {editing ? 'Save' : 'Create PC'}
          </button>
        </div>
      </div>
    </div>
  )
}
